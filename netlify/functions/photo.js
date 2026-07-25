const { getStore } = require('@netlify/blobs');

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

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Nepodporovaná metoda.' }) };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí id fotky.' }) };
  }

  try {
    const s = getStore(storeOptions('photos'));
    const dataUrl = await s.get(id, { type: 'text' });

    if (!dataUrl) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Fotka už v úložišti není.' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ dataUrl }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: describeStoreError(err) })
    };
  }
};
