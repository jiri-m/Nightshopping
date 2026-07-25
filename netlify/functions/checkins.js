const { getStore } = require('@netlify/blobs');
const crypto = require('node:crypto');

const KEY = 'data.json';

// Netlify vkládá přístup k Blobs automaticky jen u deploye s buildem.
// U ručně nahraného zipu chybí, proto se dá doplnit přes proměnné prostředí
// BLOBS_SITE_ID a BLOBS_TOKEN (návod v README).
function storeOptions(name) {
  const opts = { name, consistency: 'strong' };
  if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
    opts.siteID = process.env.BLOBS_SITE_ID;
    opts.token = process.env.BLOBS_TOKEN;
  }
  return opts;
}

function describeStoreError(err) {
  const msg = (err && err.message) || 'neznámá chyba';
  if (/not been configured to use Netlify Blobs/i.test(msg)) {
    return 'Úložiště zatím není propojené. V Netlify přidej proměnné BLOBS_SITE_ID a BLOBS_TOKEN a nasaď znovu (návod je v README).';
  }
  return 'Úložiště neodpovědělo: ' + msg;
}


// Strong consistency matters here: several people write to the same shared
// counter, and an eventually-consistent read can return stale data for up to
// 60 seconds, which looks like "my check-in disappeared".
function dataStore() {
  return getStore(storeOptions('checkins'));
}

function photoStore() {
  return getStore(storeOptions('photos'));
}

function findMostRecentMatch(data, person, shop, date) {
  let idx = -1;
  let lastTime = -Infinity;
  data.forEach((c, i) => {
    if (c.person === person && c.shop === shop && c.date === date) {
      const t = new Date(c.timestamp).getTime();
      if (t >= lastTime) {
        lastTime = t;
        idx = i;
      }
    }
  });
  return idx;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const s = dataStore();

    if (event.httpMethod === 'GET') {
      const data = (await s.get(KEY, { type: 'json' })) || [];
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Neplatný formát požadavku.' }) };
      }

      const { person, shop, date, action: requestedAction, dataUrl, lat, lng, place, branch } = body;
      if (!person || !shop || !date) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí jméno, obchod nebo datum.' }) };
      }

      const data = (await s.get(KEY, { type: 'json' })) || [];
      const action = requestedAction || 'add';

      if (action === 'add') {
        const entry = {
          id: crypto.randomUUID(),
          person,
          shop,
          date,
          timestamp: new Date().toISOString(),
          hasPhoto: false
        };
        if (typeof lat === 'number' && typeof lng === 'number') {
          entry.lat = lat;
          entry.lng = lng;
          if (place) entry.place = place;
        }
        if (branch) entry.branch = branch;
        data.push(entry);
      } else if (action === 'remove-last') {
        const idx = findMostRecentMatch(data, person, shop, date);
        if (idx >= 0) {
          const entry = data[idx];
          if (entry.hasPhoto && entry.id) {
            try {
              await photoStore().delete(entry.id);
            } catch (e) {
              // photo cleanup is best-effort
            }
          }
          data.splice(idx, 1);
        }
      } else if (action === 'attach-photo') {
        if (!dataUrl) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Fotka nedorazila. Zkus to znovu.' }) };
        }
        const idx = findMostRecentMatch(data, person, shop, date);
        if (idx < 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Nejdřív přidej check-in, pak fotku.' }) };
        }
        const entry = data[idx];
        if (!entry.id) entry.id = crypto.randomUUID();
        await photoStore().set(entry.id, dataUrl);
        entry.hasPhoto = true;
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Neznámá akce.' }) };
      }

      await s.setJSON(KEY, data);
      return { statusCode: 200, headers, body: JSON.stringify({ action, data }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Nepodporovaná metoda.' }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: describeStoreError(err) })
    };
  }
};
