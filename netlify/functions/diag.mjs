// Diagnostika propojení úložiště. Otevři /.netlify/functions/diag
// a podle výpisu se pozná, jestli Netlify funkci podstrčilo přístup
// k Blobs, nebo jestli je potřeba doplnit BLOBS_TOKEN.
//
// Záměrně nevypisuje hodnoty tokenů, jen jestli existují a jak jsou dlouhé.
import { getStore } from '@netlify/blobs';
import { createRequire } from 'node:module';
import { storeOptions } from './lib/blobs.mjs';

const require = createRequire(import.meta.url);

function present(name) {
  const v = process.env[name];
  if (!v) return false;
  return { delka: v.length };
}

export default async () => {
  let blobsVerze;
  try {
    blobsVerze = require('@netlify/blobs/package.json').version;
  } catch (e) {
    blobsVerze = 'nepodařilo se zjistit: ' + e.message;
  }

  const report = {
    node: process.version,
    blobsVerze,
    formatFunkci: 'v2 (export default)',
    // Tohle vkládá Netlify samo. Když chybí, úložiště se nepropojí.
    automatickyKontextBlobs: Boolean(process.env.NETLIFY_BLOBS_CONTEXT),
    // Site ID není tajné — když ho tu vidíš, můžeš ho rovnou použít
    // jako BLOBS_SITE_ID.
    siteId: process.env.SITE_ID || null,
    deployContext: process.env.CONTEXT || null,
    deployId: process.env.DEPLOY_ID || null,
    url: process.env.URL || null,
    rucneNastavene: {
      BLOBS_SITE_ID: present('BLOBS_SITE_ID'),
      BLOBS_TOKEN: present('BLOBS_TOKEN')
    },
    // Bez tohohle server odmítne mazání dat. Po přidání proměnné je
    // potřeba nasadit znovu, jinak ji funkce neuvidí.
    adminPinNastaveny: Boolean(process.env.ADMIN_PIN),
    // Jen názvy, žádné hodnoty — ať je vidět, co Netlify funkci reálně
    // dává, bez rizika, že se sem vysype token.
    videnePromenne: Object.keys(process.env)
      .filter((k) => /NETLIFY|BLOB|DEPLOY|SITE|CONTEXT|BRANCH|COMMIT|URL/i.test(k))
      .sort()
  };

  // Vlastní zkouška čtení, přes stejné nastavení jako appka.
  const opts = storeOptions('checkins');
  const cesta = process.env.NETLIFY_BLOBS_CONTEXT
    ? 'automaticky z Netlify'
    : opts.token
      ? 'rucne pres BLOBS_TOKEN'
      : 'zadne pripojeni k dispozici';

  try {
    const s = getStore(opts);
    const data = await s.get('data.json', { type: 'json' });
    report.uloziste = {
      funguje: true,
      pripojeno: cesta,
      zaznamu: Array.isArray(data) ? data.length : 0
    };
  } catch (err) {
    const chyba = (err && err.message) || String(err);
    report.uloziste = { funguje: false, pripojeno: cesta, chyba };
    if (/401|403|unauthorized|forbidden/i.test(chyba) && cesta.startsWith('rucne')) {
      report.uloziste.rada =
        'Token je neplatny, zneplatneny nebo patri k jinemu uctu. ' +
        'Kdyz je web napojeny na Git, promennou BLOBS_TOKEN uplne smaz — ' +
        'propojeni pak probehne samo.';
    }
  }

  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
};
