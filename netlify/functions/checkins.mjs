import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { storeOptions, describeStoreError } from './lib/blobs.mjs';

const KEY = 'data.json';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    // 204 musí mít prázdné tělo, jinak Response konstruktor spadne.
    return new Response(null, { status: 204, headers: HEADERS });
  }

  try {
    const s = dataStore();

    if (req.method === 'GET') {
      const data = (await s.get(KEY, { type: 'json' })) || [];
      return json(data);
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return json({ error: 'Neplatný formát požadavku.' }, 400);
      }

      const { person, shop, date, action: requestedAction, dataUrl, lat, lng, place, branch } = body || {};
      if (!person || !shop || !date) {
        return json({ error: 'Chybí jméno, obchod nebo datum.' }, 400);
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
          return json({ error: 'Fotka nedorazila. Zkus to znovu.' }, 400);
        }
        const idx = findMostRecentMatch(data, person, shop, date);
        if (idx < 0) {
          return json({ error: 'Nejdřív přidej check-in, pak fotku.' }, 404);
        }
        const entry = data[idx];
        if (!entry.id) entry.id = crypto.randomUUID();
        await photoStore().set(entry.id, dataUrl);
        entry.hasPhoto = true;
      } else {
        return json({ error: 'Neznámá akce.' }, 400);
      }

      await s.setJSON(KEY, data);
      return json({ action, data });
    }

    return json({ error: 'Nepodporovaná metoda.' }, 405);
  } catch (err) {
    return json({ error: describeStoreError(err) }, 500);
  }
};
