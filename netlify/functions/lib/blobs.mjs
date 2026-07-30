// Sdílené pro všechny funkce. Leží v podsložce schválně — soubory přímo
// v netlify/functions bere Netlify jako samostatné funkce.

// Netlify vkládá přístup k Blobs samo. Ruční přihlašovací údaje slouží jen
// jako záloha, když kontext chybí — a schválně až jako druhá volba, aby
// propadlý token neshodil web, kde automatika funguje.
export function storeOptions(name) {
  const opts = { name, consistency: 'strong' };
  if (process.env.NETLIFY_BLOBS_CONTEXT) return opts;
  const siteID = process.env.BLOBS_SITE_ID || process.env.SITE_ID;
  if (siteID && process.env.BLOBS_TOKEN) {
    opts.siteID = siteID;
    opts.token = process.env.BLOBS_TOKEN;
  }
  return opts;
}

export function describeStoreError(err) {
  const msg = (err && err.message) || 'neznámá chyba';
  if (/not been configured to use Netlify Blobs/i.test(msg)) {
    return 'Úložiště zatím není propojené. Otevři /.netlify/functions/diag, tam je vidět proč.';
  }
  if (/401|403|unauthorized|forbidden/i.test(msg)) {
    return 'Úložiště odmítlo přístup — BLOBS_TOKEN je nejspíš neplatný. Zkus ho v Netlify smazat, propojení pak proběhne samo.';
  }
  return 'Úložiště neodpovědělo: ' + msg;
}
