// Diagnostika propojení úložiště. Otevři /.netlify/functions/diag
// a podle výpisu se pozná, jestli Netlify funkci podstrčilo přístup
// k Blobs, nebo jestli je potřeba doplnit BLOBS_TOKEN.
//
// Záměrně nevypisuje hodnoty tokenů, jen jestli existují a jak jsou dlouhé.
const { getStore } = require('@netlify/blobs');

function present(name) {
  const v = process.env[name];
  if (!v) return false;
  return { delka: v.length };
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };

  let blobsVerze = null;
  try {
    blobsVerze = require('@netlify/blobs/package.json').version;
  } catch (e) {
    blobsVerze = 'nepodařilo se zjistit: ' + e.message;
  }

  const report = {
    node: process.version,
    blobsVerze,
    // Tohle vkládá Netlify samo u deploye z Gitu. Když chybí, jde
    // nejspíš o ručně nahraný zip.
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
    }
  };

  // Vlastní zkouška čtení — přesně to, co appce padá. Pořadí musí sedět
  // s tím v checkins.js, jinak by diagnostika ukazovala něco jiného,
  // než co dělá appka.
  const opts = { name: 'checkins', consistency: 'strong' };
  let cesta;
  if (process.env.NETLIFY_BLOBS_CONTEXT) {
    cesta = 'automaticky z Netlify';
  } else {
    const siteID = process.env.BLOBS_SITE_ID || process.env.SITE_ID;
    if (siteID && process.env.BLOBS_TOKEN) {
      opts.siteID = siteID;
      opts.token = process.env.BLOBS_TOKEN;
      cesta = 'rucne pres BLOBS_TOKEN';
    } else {
      cesta = 'zadne pripojeni k dispozici';
    }
  }

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

  return { statusCode: 200, headers, body: JSON.stringify(report, null, 2) };
};
