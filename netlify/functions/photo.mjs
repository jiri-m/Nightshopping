import { getStore } from '@netlify/blobs';
import { storeOptions, describeStoreError } from './lib/blobs.mjs';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    // 204 musí mít prázdné tělo, jinak Response konstruktor spadne.
    return new Response(null, { status: 204, headers: HEADERS });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Nepodporovaná metoda.' }, 405);
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return json({ error: 'Chybí id fotky.' }, 400);
  }

  try {
    const s = getStore(storeOptions('photos'));
    const dataUrl = await s.get(id, { type: 'text' });

    if (!dataUrl) {
      return json({ error: 'Fotka už v úložišti není.' }, 404);
    }

    return json({ dataUrl });
  } catch (err) {
    return json({ error: describeStoreError(err) }, 500);
  }
};
