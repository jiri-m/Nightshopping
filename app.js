// ====== KONFIGURACE — uprav podle potřeby ======
const NAMES = [
  "Luciana",
  "Jiří M.",
  "Lucka",
  "Jiří Ch.",
  "Vlastik",
  "Pavlinka",
  "Monika",
  "Amálka",
  "Vojta M.",
  "Vojta A."
];

const AVATARS = {
  "Luciana": "🦊",
  "Jiří M.": "🐻",
  "Lucka": "🐱",
  "Jiří Ch.": "🦁",
  "Vlastik": "🐢",
  "Pavlinka": "🐰",
  "Monika": "🦉",
  "Amálka": "🦔",
  "Vojta M.": "🦝",
  "Vojta A.": "🦌"
};

// Staré check-iny v úložišti nesou původní zápis jména. Tímhle se při
// načtení převedou, aby se lidem neztratily body a nefigurovali v
// žebříčku dvakrát.
const RENAMED = {
  "Jiri": "Jiří Ch.",
  "Jiri M.": "Jiří M."
};

const SHOPS = [
  "Albert",
  "Billa",
  "Tesco",
  "Kaufland",
  "Lidl",
  "Penny Market",
  "Globus",
  "COOP"
];

// Nabídka měst do našeptávače. Napsat jde i cokoliv jiného, to se pak
// dohledá v OpenStreetMap.
const PLACES = [
  ["Praha", 50.075, 14.437],
  ["Brno", 49.195, 16.607],
  ["Ostrava", 49.836, 18.292],
  ["Plzeň", 49.748, 13.378],
  ["Liberec", 50.767, 15.056],
  ["Olomouc", 49.594, 17.251],
  ["České Budějovice", 48.975, 14.474],
  ["Hradec Králové", 50.209, 15.832],
  ["Ústí nad Labem", 50.661, 14.032],
  ["Pardubice", 50.038, 15.779],
  ["Zlín", 49.226, 17.666],
  ["Jihlava", 49.396, 15.591],
  ["Karlovy Vary", 50.232, 12.871],
  ["Kladno", 50.147, 14.103],
  ["Most", 50.503, 13.636],
  ["Opava", 49.938, 17.902],
  ["Frýdek-Místek", 49.683, 18.350],
  ["Děčín", 50.774, 14.194],
  ["Mladá Boleslav", 50.412, 14.903],
  ["Tábor", 49.414, 14.657],
  ["Znojmo", 48.856, 16.049],
  ["Trutnov", 50.561, 15.912],
  ["Česká Lípa", 50.686, 14.537],
  ["Přerov", 49.455, 17.451],
  ["Třebíč", 49.215, 15.881],
  // Kanada. Souřadnice míří do centra, ne na těžiště celé aglomerace —
  // kolem těžiště bývá les a nenašel by se ani rohlík.
  ["Montréal", 45.5019, -73.5674],
  ["Québec", 46.8131, -71.2075],
  ["Toronto", 43.6532, -79.3832],
  ["Ottawa", 45.4215, -75.6972],
  ["Vancouver", 49.2827, -123.1207],
  ["Calgary", 51.0447, -114.0719],
  ["Edmonton", 53.5461, -113.4938],
  ["Winnipeg", 49.8951, -97.1384],
  ["Halifax", 44.6488, -63.5752]
];
// =================================================

const API_URL = "/.netlify/functions/checkins";
const PHOTO_URL = "/.netlify/functions/photo";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

// Projekce odpovídá SVG cestě v index.html (viewBox 1000 x 566).
const PROJ = { lon0: 12.089746, lat1: 51.037793, k: 0.645364, s: 229.8134 };

// Kanada má vlastní malou siluetu v pravém horním rohu. Konstanty sedí
// s cestou v index.html — obojí vzniklo z týchž dat, takže se nesmí
// měnit jedno bez druhého. Lambertovo konformní kuželové zobrazení.
const CA_PROJ = {
  n: 0.9007450595160101,
  f: 1.766832833629432,
  rho0: 0.7283515152922648,
  lon0: -1.6755160819145565,
  k: 213.0706592854843,
  ox: 806.78534126225,
  oy: 22.0,
  minx: -0.3472460481845546,
  maxy: 0.6021574459518233
};

const CA_BOUNDS = { latMin: 41, latMax: 84, lngMin: -142, lngMax: -52 };

const NO_FUNCTIONS =
  "Serverová část není nasazená. Na Netlify zkontroluj, že se nahrála i složka netlify/functions.";

const $ = (id) => document.getElementById(id);

const bannerEl = $("banner");
const todayDateEl = $("today-date");
const stepPerson = $("step-person");
const stepPlace = $("step-place");
const stepShop = $("step-shop");
const personChips = $("person-chips");
const personPick = $("person-pick");
const placePick = $("place-pick");
const gpsBtn = $("gps-btn");
const cityInput = $("city-input");
const cityList = $("city-list");
const cityBtn = $("city-btn");
const placeStatus = $("place-status");
const radiusSelect = $("radius-select");
const reloadBtn = $("reload-btn");
const nearbyStatus = $("nearby-status");
const nearbyList = $("nearby-list");
const fallbackToggle = $("fallback-toggle");
const chainGrid = $("chain-grid");
const todayListEl = $("today-list");
const starsEl = $("stars");
const linesEl = $("lines");
const dustEl = $("dust");
const statsEl = $("stats");
const nogeoEl = $("nogeo");
const leaderboardEl = $("leaderboard");
const historyEl = $("history");
const resetBtn = $("reset-btn");
const resetPanel = $("reset-panel");
const resetPin = $("reset-pin");
const resetConfirm = $("reset-confirm");
const resetStatus = $("reset-status");

const state = {
  // Kdo byl nakupovat. Vybírá se v jednom seznamu, první zakliknutý jsi ty
  // — jeho jméno si appka pamatuje a k jeho záznamu se připíná fotka.
  // Každý z party dostane vlastní check-in kvůli žebříčku, ale všechny
  // nesou stejné groupId.
  party: [],
  person: null,
  // { lat, lng, label, precise } — precise = z GPS, tedy i hvězda sedí přesně
  location: null,
  data: [],
  loadingShops: false
};

// ---------- drobnosti ----------

function showError(msg) {
  bannerEl.textContent = msg;
  bannerEl.hidden = false;
}

function clearError() {
  bannerEl.hidden = true;
}

function flash(msg) {
  // Vždycky jen jedna bublina — jinak se při rychlém klikání překrývají.
  const prev = document.querySelector(".flash");
  if (prev) prev.remove();

  const el = document.createElement("div");
  el.className = "flash";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("out"), 1600);
  setTimeout(() => el.remove(), 2200);
}

function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

// Čas nákupu, ne čas prohlížení. Nové záznamy si nesou posun pásma místa,
// takže kanadská noční výprava zůstane noční i při čtení z Česka.
// U starších záznamů posun chybí a použije se pásmo čtenáře.
function formatTime(c) {
  const d = new Date(c.timestamp);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  if (typeof c.tzOffset === "number") {
    const local = new Date(d.getTime() + c.tzOffset * 60000);
    return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function project(lat, lng) {
  return {
    x: (lng - PROJ.lon0) * PROJ.k * PROJ.s,
    y: (PROJ.lat1 - lat) * PROJ.s
  };
}

function inCanada(lat, lng) {
  return lat >= CA_BOUNDS.latMin && lat <= CA_BOUNDS.latMax &&
    lng >= CA_BOUNDS.lngMin && lng <= CA_BOUNDS.lngMax;
}

function projectCanada(lat, lng) {
  const p = Math.max(Math.min((lat * Math.PI) / 180, 1.5620697), -1.5620697);
  const l = (lng * Math.PI) / 180;
  const rho = CA_PROJ.f / Math.pow(Math.tan(Math.PI / 4 + p / 2), CA_PROJ.n);
  const x = rho * Math.sin(CA_PROJ.n * (l - CA_PROJ.lon0));
  const y = CA_PROJ.rho0 - rho * Math.cos(CA_PROJ.n * (l - CA_PROJ.lon0));
  return {
    x: CA_PROJ.ox + (x - CA_PROJ.minx) * CA_PROJ.k,
    y: CA_PROJ.oy + (CA_PROJ.maxy - y) * CA_PROJ.k
  };
}

// Vrátí souřadnice v SVG a k tomu mapu, do které bod patří — spojnice
// souhvězdí se pak počítají pro každou mapu zvlášť, aby nevedla čára
// přes půl světa.
function placeOnMap(lat, lng) {
  return inCanada(lat, lng)
    ? { ...projectCanada(lat, lng), map: "ca" }
    : { ...project(lat, lng), map: "cz" };
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function formatDist(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`.replace(".", ",");
}

// „Montreal" musí najít „Montréal", „Plzen" musí najít „Plzeň".
function foldAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function setStep(el, stateName) {
  el.dataset.state = stateName;
}

// ---------- komunikace se serverem ----------

function normalize(data) {
  return data.map((c) =>
    RENAMED[c.person] ? { ...c, person: RENAMED[c.person] } : c);
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 404) throw new Error(NO_FUNCTIONS);
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(result.data)) {
    throw new Error(result.error || `Server vrátil chybu ${res.status}.`);
  }
  return normalize(result.data);
}

async function fetchData() {
  const res = await fetch(API_URL);
  if (res.status === 404) throw new Error(NO_FUNCTIONS);
  const json = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(json)) {
    throw new Error((json && json.error) || `Server vrátil chybu ${res.status}.`);
  }
  return normalize(json);
}

// ---------- krok 1: kdo jsi ----------

function renderPersonChips() {
  personChips.innerHTML = "";
  NAMES.forEach((name) => {
    const idx = state.party.indexOf(name);
    const on = idx >= 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (on ? " on" : "");
    btn.setAttribute("aria-pressed", String(on));
    btn.innerHTML =
      `<span class="chip-avatar">${AVATARS[name] || "🐾"}</span>${name}` +
      (idx === 0 ? '<span class="chip-me">ty</span>' : "");
    btn.addEventListener("click", () => togglePerson(name));
    personChips.appendChild(btn);
  });
}

function updatePersonPick() {
  if (!state.person) {
    personPick.textContent = "";
    return;
  }
  const me = `${AVATARS[state.person] || "🐾"} ${state.person}`;
  personPick.textContent =
    state.party.length > 1 ? `${me} + ${state.party.length - 1}` : me;
}

function syncPersonSteps(collapse) {
  state.person = state.party[0] || null;
  if (state.person) {
    localStorage.setItem("noc-nakupy-person", state.person);
  } else {
    localStorage.removeItem("noc-nakupy-person");
  }

  updatePersonPick();
  setStep(stepPerson, collapse && state.person ? "done" : "active");
  if (!state.person) {
    // Bez jména nemá smysl pokračovat, další kroky se zase zamknou.
    setStep(stepPlace, "locked");
    setStep(stepShop, "locked");
  } else if (!state.location) {
    setStep(stepPlace, "active");
  }

  renderPersonChips();
  renderTodayList();
}

// Druhé klepnutí jméno odznačí. První zaklikaný je ten, kdo zapisuje.
function togglePerson(name) {
  const idx = state.party.indexOf(name);
  if (idx >= 0) state.party.splice(idx, 1);
  else state.party.push(name);
  syncPersonSteps(false);
}

function fillCityList() {
  PLACES.forEach(([name]) => {
    const opt = document.createElement("option");
    opt.value = name;
    cityList.appendChild(opt);
  });
}

function getGpsPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

// Nominatim řadí podle „důležitosti", takže na dotaz Quebec vrátí jako
// první provincii, ne město. Její těžiště leží v pustině a v okolí není
// jediný obchod. Proto se bere víc výsledků a vybírá se z nich sídlo.
const SETTLEMENT = new Set([
  "city", "town", "village", "municipality", "hamlet",
  "suburb", "borough", "quarter", "neighbourhood", "city_district"
]);

async function geocodeCity(query) {
  const wanted = foldAccents(query);
  const local = PLACES.find(([n]) => foldAccents(n) === wanted);
  if (local) return { lat: local[1], lng: local[2], label: local[0], precise: false };

  // Bez omezení na zemi — někdo může logovat i z Kanady.
  const url = `${GEOCODE_URL}?format=jsonv2&limit=8&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "cs" } });
  if (!res.ok) throw new Error(`vyhledávání měst vrátilo ${res.status}`);
  const hits = await res.json();
  if (!hits.length) throw new Error("takové město jsem nenašel");

  const town = hits.find((h) => SETTLEMENT.has(h.addresstype) || SETTLEMENT.has(h.type));
  const hit = town || hits[0];
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.name || hit.display_name.split(",")[0],
    precise: false,
    // Když se sídlo nenašlo, jde nejspíš o kraj nebo stát a je fér to říct.
    vague: !town
  };
}

function setLocation(loc) {
  state.location = loc;
  // Jakmile se pokročí dál, výběr osoby i parťáků se sbalí.
  setStep(stepPerson, "done");
  placePick.textContent = loc.precise ? `📍 ${loc.label}` : loc.label;
  placeStatus.textContent = "";
  setStep(stepPlace, "done");
  setStep(stepShop, "active");
  loadNearby();
}

async function useGps() {
  gpsBtn.disabled = true;
  placeStatus.textContent = "Zjišťuji polohu…";
  const pos = await getGpsPosition();
  gpsBtn.disabled = false;

  if (!pos) {
    placeStatus.textContent =
      "Polohu se nepodařilo zjistit. Povol ji v prohlížeči, nebo napiš město.";
    return;
  }
  setLocation({ lat: pos.lat, lng: pos.lng, label: "moje poloha", precise: true });
}

async function useCity() {
  const q = cityInput.value.trim();
  if (!q) {
    placeStatus.textContent = "Napiš název města.";
    return;
  }
  cityBtn.disabled = true;
  placeStatus.textContent = "Hledám město…";
  try {
    const loc = await geocodeCity(q);
    localStorage.setItem("noc-nakupy-place", loc.label);
    setLocation(loc);
  } catch (err) {
    placeStatus.textContent = `Nepovedlo se — ${err.message}.`;
  } finally {
    cityBtn.disabled = false;
  }
}

// ---------- krok 3: kde jsi nakupoval ----------

function chainOf(tags) {
  const raw = tags.brand || tags.name || "";
  const hit = SHOPS.find((c) => raw.toLowerCase().includes(c.split(" ")[0].toLowerCase()));
  return hit || tags.brand || tags.name || "Jiný obchod";
}

// Kanadské řetězce mají v OSM stejné značky jako české, ale přibývá
// shop=grocery, který se v Severní Americe používá běžně.
const SHOP_TAGS = "^(supermarket|convenience|grocery|department_store|greengrocer|variety_store)$";

async function overpassAround(lat, lng, radius) {
  const query =
    `[out:json][timeout:25];` +
    `nwr(around:${radius},${lat},${lng})[shop~"${SHOP_TAGS}"];` +
    `out center tags;`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query)
  });
  if (!res.ok) throw new Error(`databáze obchodů vrátila ${res.status}`);
  return (await res.json()).elements || [];
}

function toShops(elements, lat, lng) {
  return elements
    .map((el) => {
      const sLat = el.lat != null ? el.lat : el.center && el.center.lat;
      const sLng = el.lon != null ? el.lon : el.center && el.center.lon;
      const tags = el.tags || {};
      if (sLat == null || sLng == null || (!tags.name && !tags.brand)) return null;
      return {
        name: tags.name || tags.brand,
        chain: chainOf(tags),
        street: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
        hours: tags.opening_hours || "",
        lat: sLat,
        lng: sLng,
        dist: distanceMeters(lat, lng, sLat, sLng)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 25);
}

async function loadNearby() {
  if (!state.location || state.loadingShops) return;
  state.loadingShops = true;
  reloadBtn.disabled = true;
  nearbyList.innerHTML = "";
  nearbyStatus.textContent = "Hledám obchody v okolí…";

  const { lat, lng } = state.location;
  const chosen = Number(radiusSelect.value);
  // Když ve zvoleném okruhu nic není, hledá se dál samo. Poslat člověka
  // ručně přepínat okruh je zbytečný krok — hlavně u velkých měst, kde
  // střed vyjde na náměstí nebo do parku.
  const ladder = [...new Set([chosen, 3000, 8000, 20000])].filter((r) => r >= chosen);

  let shops = [];
  let usedRadius = chosen;
  try {
    for (const radius of ladder) {
      if (radius !== chosen) {
        nearbyStatus.textContent = `V okruhu ${formatDist(usedRadius)} nic, zkouším ${formatDist(radius)}…`;
      }
      shops = toShops(await overpassAround(lat, lng, radius), lat, lng);
      usedRadius = radius;
      if (shops.length) break;
    }
  } catch (err) {
    nearbyStatus.textContent = `Obchody se nenačetly — ${err.message}.`;
    showFallback(true);
    state.loadingShops = false;
    reloadBtn.disabled = false;
    return;
  }

  state.loadingShops = false;
  reloadBtn.disabled = false;

  if (!shops.length) {
    nearbyStatus.textContent = state.location.vague
      ? `„${state.location.label}" jsem našel jako oblast, ne jako město, ` +
        `takže hledám uprostřed ničeho. Napiš konkrétní město, nebo vyber řetězec níž.`
      : `Ani do ${formatDist(ladder[ladder.length - 1])} od místa „${state.location.label}" ` +
        `nic není. Zkus napsat přesnější místo, nebo vyber řetězec níž.`;
    showFallback(true);
    return;
  }

  const where = state.location.precise
    ? "Klepni na obchod, ve kterém jsi byl."
    : `Obchody kolem místa ${state.location.label}. Pro přesnější výsledky povol polohu.`;
  nearbyStatus.textContent = usedRadius === chosen
    ? where
    : `${where} Ve zvoleném okruhu nic nebylo, tohle je do ${formatDist(usedRadius)}.`;
  showFallback(false);

  shops.forEach((shop) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "nearby-item";

    const detail = [shop.street, formatDist(shop.dist)].filter(Boolean).join(" · ");
    row.innerHTML =
      `<span class="nearby-info">` +
      `<span class="nearby-name">${shop.name}</span>` +
      `<span class="nearby-detail">${detail}</span>` +
      (shop.hours ? `<span class="nearby-hours">${shop.hours}</span>` : "") +
      `</span><span class="nearby-go">+</span>`;

    row.addEventListener("click", () => {
      row.disabled = true;
      checkIn({
        shop: shop.chain,
        branch: shop.street ? `${shop.name}, ${shop.street}` : shop.name,
        lat: shop.lat,
        lng: shop.lng,
        place: shop.name
      }).finally(() => {
        row.disabled = false;
      });
    });

    nearbyList.appendChild(row);
  });
}

function showFallback(open) {
  chainGrid.hidden = !open;
  fallbackToggle.textContent = open ? "Skrýt seznam řetězců" : "Můj obchod tu není →";
}

function renderChainGrid() {
  chainGrid.innerHTML = "";
  SHOPS.forEach((shop) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = shop;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      const loc = state.location;
      checkIn({
        shop,
        lat: loc ? loc.lat : undefined,
        lng: loc ? loc.lng : undefined,
        place: loc ? loc.label : undefined
      }).finally(() => {
        btn.disabled = false;
      });
    });
    chainGrid.appendChild(btn);
  });
}

// ---------- zápis návštěvy ----------

async function checkIn({ shop, branch, lat, lng, place }) {
  if (!state.person) {
    showError("Nejdřív vyber, kdo jsi.");
    return;
  }
  const payload = {
    person: state.person,
    persons: state.party,
    shop,
    date: todayStr(),
    action: "add",
    // Minuty východně od UTC, tedy pásmo toho, kdo zapisuje.
    tzOffset: -new Date().getTimezoneOffset()
  };
  if (branch) payload.branch = branch;
  if (typeof lat === "number" && typeof lng === "number") {
    payload.lat = lat;
    payload.lng = lng;
    if (place) payload.place = place;
  }

  try {
    state.data = await apiPost(payload);
    clearError();
    flash(state.party.length > 1
      ? `Zapsáno pro ${state.party.length} lidi — ${branch || shop} ✓`
      : `Zapsáno — ${branch || shop} ✓`);
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

async function removeCheckin(id) {
  try {
    state.data = await apiPost({ action: "remove", id });
    clearError();
    flash("Check-in vzat zpět");
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

function compressImage(file, maxDim = 700, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Fotku se nepodařilo načíst."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Tenhle formát fotky neumím zpracovat."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function attachPhoto(id, file) {
  try {
    const dataUrl = await compressImage(file);
    state.data = await apiPost({ action: "attach-photo", id, dataUrl });
    clearError();
    flash("Fotka připojena");
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

// ---------- dnešek ----------

function renderTodayList() {
  const date = todayStr();
  const today = state.data
    .filter((c) => c.date === date)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Společný nákup je několik záznamů se stejným groupId. V seznamu je
  // to jedna položka, aby se dvojice neukazovala dvakrát.
  const rows = [];
  const seen = new Set();
  today.forEach((c) => {
    if (c.groupId) {
      if (seen.has(c.groupId)) return;
      seen.add(c.groupId);
      rows.push({ lead: c, party: today.filter((o) => o.groupId === c.groupId) });
    } else {
      rows.push({ lead: c, party: [c] });
    }
  });

  todayListEl.innerHTML = "";

  if (!rows.length) {
    todayListEl.innerHTML =
      '<div class="empty">Dnes zatím nikdo nikde. Zapiš první návštěvu nahoře.</div>';
    return;
  }

  rows.forEach(({ lead, party }) => {
    const c = lead;
    const row = document.createElement("div");
    row.className = "today-item";

    const who = party
      .map((p) => `${AVATARS[p.person] || "🐾"} ${p.person}`)
      .join(" + ");

    const info = document.createElement("div");
    info.className = "today-info";
    const time = formatTime(c);
    info.innerHTML =
      `<span class="today-who">${who}</span>` +
      `<span class="today-where">` +
      (time ? `<span class="stamp">${time}</span> · ` : "") +
      `${c.branch || c.shop}</span>`;
    row.appendChild(info);

    // Zpětvzetí a fotka jen u vlastních záznamů — cizí check-in nemá
    // smysl mazat omylem. U společného nákupu stačí, že jsi v partě.
    const own = party.find((p) => p.person === state.person);
    if (own) {
      const actions = document.createElement("div");
      actions.className = "today-actions";

      const cameraLabel = document.createElement("label");
      cameraLabel.className = "icon-btn";
      cameraLabel.title = "Přidat fotku";
      cameraLabel.textContent = own.hasPhoto ? "🖼️" : "📷";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.setAttribute("capture", "environment");
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) attachPhoto(own.id, file);
        fileInput.value = "";
      });
      cameraLabel.appendChild(fileInput);

      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "icon-btn";
      undoBtn.title = party.length > 1 ? "Vzít zpět celé partě" : "Vzít zpět";
      undoBtn.textContent = "↺";
      undoBtn.addEventListener("click", () => removeCheckin(own.id));

      actions.append(cameraLabel, undoBtn);
      row.appendChild(actions);
    }

    todayListEl.appendChild(row);
  });
}

// ---------- hvězdná mapa ----------

const ns = "http://www.w3.org/2000/svg";

// Deterministický generátor, aby prach na pozadí neposkakoval při
// každém překreslení.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starPath(cx, cy, outer, inner, spikes = 4) {
  const step = Math.PI / spikes;
  let d = "";
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + i * step;
    d += (i === 0 ? "M" : "L") + (cx + Math.cos(a) * r).toFixed(2) +
      " " + (cy + Math.sin(a) * r).toFixed(2);
  }
  return d + "Z";
}

// Minimální kostra — spojnice pak vypadají jako čáry v souhvězdí,
// každá hvězda je připojená a nevzniká změť.
function constellationEdges(points) {
  if (points.length < 2) return [];
  const inTree = [0];
  const rest = points.map((_, i) => i).slice(1);
  const edges = [];

  while (rest.length) {
    let best = null;
    for (const a of inTree) {
      for (const b of rest) {
        const d = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    edges.push(best);
    inTree.push(best.b);
    rest.splice(rest.indexOf(best.b), 1);
  }
  return edges;
}

function renderDust() {
  if (dustEl.childNodes.length) return;
  const rand = mulberry32(20260730);
  for (let i = 0; i < 140; i++) {
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", (rand() * 1000).toFixed(1));
    dot.setAttribute("cy", (rand() * 566).toFixed(1));
    dot.setAttribute("r", (0.4 + rand() * 1).toFixed(2));
    dot.setAttribute("class", "dust");
    dot.style.opacity = (0.08 + rand() * 0.32).toFixed(2);
    dustEl.appendChild(dot);
  }
}

function renderMap() {
  starsEl.innerHTML = "";
  linesEl.innerHTML = "";
  renderDust();

  const groups = new Map();
  let noGeo = 0;

  state.data.forEach((c) => {
    if (typeof c.lat !== "number" || typeof c.lng !== "number") {
      noGeo += 1;
      return;
    }
    const key = `${c.lat.toFixed(3)},${c.lng.toFixed(3)}`;
    if (!groups.has(key)) {
      groups.set(key, { lat: c.lat, lng: c.lng, count: 0, place: c.place, shops: new Set() });
    }
    const g = groups.get(key);
    g.count += 1;
    g.shops.add(c.shop);
  });

  const points = [...groups.values()].map((g) => {
    const { x, y, map } = placeOnMap(g.lat, g.lng);
    return { x, y, map, g };
  });

  ["cz", "ca"].forEach((map) => {
    const own = points.filter((p) => p.map === map);
    constellationEdges(own).forEach(({ a, b }) => {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", own[a].x.toFixed(1));
      line.setAttribute("y1", own[a].y.toFixed(1));
      line.setAttribute("x2", own[b].x.toFixed(1));
      line.setAttribute("y2", own[b].y.toFixed(1));
      line.setAttribute("class", "constellation");
      linesEl.appendChild(line);
    });
  });


  points.forEach(({ x, y, map, g }, i) => {
    // Malé hvězdičky. Roste to logaritmicky, aby jedno oblíbené místo
    // nepřerostlo celou mapu. Na malé kanadské siluetě se zmenší, jinak
    // by ji hvězda přerostla.
    const scale = map === "ca" ? 0.62 : 1;
    const outer = (4.5 + Math.min(6, Math.log2(g.count + 1) * 1.9)) * scale;

    const halo = document.createElementNS(ns, "circle");
    halo.setAttribute("cx", x.toFixed(1));
    halo.setAttribute("cy", y.toFixed(1));
    halo.setAttribute("r", (outer * 2.8).toFixed(1));
    halo.setAttribute("fill", "url(#glow)");
    starsEl.appendChild(halo);

    const star = document.createElementNS(ns, "path");
    star.setAttribute("d", starPath(x, y, outer, outer * 0.3));
    star.setAttribute("class", "star");
    star.style.animationDelay = `${(i % 7) * 0.4}s`;

    const title = document.createElementNS(ns, "title");
    title.textContent =
      `${g.place || "Bez názvu"} — ${g.count}× (${[...g.shops].join(", ")})`;
    star.appendChild(title);

    starsEl.appendChild(star);
  });

  nogeoEl.textContent = noGeo > 0 ? ` ${noGeo} návštěv je bez místa.` : "";

  const nights = new Set(state.data.map((c) => c.date)).size;
  const shopCounts = {};
  state.data.forEach((c) => {
    shopCounts[c.shop] = (shopCounts[c.shop] || 0) + 1;
  });
  const topShop = Object.entries(shopCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    ["Návštěv", state.data.length],
    ["Nocí", nights],
    ["Míst", groups.size],
    ["Nejčastěji", topShop ? topShop[0] : "—"]
  ];

  statsEl.innerHTML = stats
    .map(([k, v]) =>
      `<div class="stat"><span class="stat-value">${v}</span><span class="stat-key">${k}</span></div>`)
    .join("");
}

// ---------- žebříček a historie ----------

function renderLeaderboard() {
  const counts = {};
  NAMES.forEach((n) => (counts[n] = 0));
  state.data.forEach((c) => {
    counts[c.person] = (counts[c.person] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const medals = ["🥇", "🥈", "🥉"];

  leaderboardEl.innerHTML = "";
  sorted.forEach(([name, count], i) => {
    const li = document.createElement("li");
    const rank = count > 0 ? medals[i] || `${i + 1}.` : "—";
    li.innerHTML =
      `<span><span class="rank">${rank}</span>${AVATARS[name] || "🐾"} ${name}</span>` +
      `<span class="score">${count}</span>`;
    leaderboardEl.appendChild(li);
  });
}

function renderHistory() {
  historyEl.innerHTML = "";
  if (!state.data.length) {
    historyEl.innerHTML = '<div class="empty">Zatím nikdo nikde.</div>';
    return;
  }

  const sorted = [...state.data].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  sorted.forEach((c) => {
    const div = document.createElement("div");
    div.className = "history-item";
    const where = c.branch ? ` · ${c.branch}` : c.place ? ` · ${c.place}` : "";
    const time = formatTime(c);
    div.innerHTML =
      `<strong>${AVATARS[c.person] || "🐾"} ${c.person}</strong> — ${c.shop} ` +
      `<span>(${formatDate(c.date)}${time ? ` ${time}` : ""}${where})</span>`;

    if (c.hasPhoto && c.id) {
      const photoBtn = document.createElement("button");
      photoBtn.className = "photo-toggle";
      photoBtn.type = "button";
      photoBtn.textContent = "📷 Zobrazit fotku";
      photoBtn.addEventListener("click", async () => {
        const existing = div.querySelector("img");
        if (existing) {
          existing.remove();
          photoBtn.textContent = "📷 Zobrazit fotku";
          return;
        }
        photoBtn.textContent = "Načítám…";
        try {
          const res = await fetch(`${PHOTO_URL}?id=${encodeURIComponent(c.id)}`);
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.dataUrl) throw new Error(json.error || "Fotka se nenačetla.");
          const img = document.createElement("img");
          img.className = "history-photo";
          img.src = json.dataUrl;
          img.alt = `${c.person} v ${c.shop}`;
          div.appendChild(img);
          photoBtn.textContent = "📷 Skrýt fotku";
        } catch (err) {
          photoBtn.textContent = "📷 Fotka se nenačetla";
        }
      });
      div.appendChild(photoBtn);
    }

    historyEl.appendChild(div);
  });
}

function renderAll() {
  renderTodayList();
  renderMap();
  renderLeaderboard();
  renderHistory();
}

// ---------- vymazání dat ----------

// Panel místo confirm/prompt: dialogy prohlížeče část mobilů potlačuje
// a hlavně by se chyba objevila v proužku úplně nahoře, kam odsud není
// vidět. Takhle je výsledek hned u tlačítka.
function toggleResetPanel() {
  resetPanel.hidden = !resetPanel.hidden;
  resetStatus.textContent = "";
  if (!resetPanel.hidden) resetPin.focus();
}

async function resetAll() {
  const pin = resetPin.value.trim();
  if (!pin) {
    resetStatus.textContent = "Zadej PIN.";
    return;
  }

  resetConfirm.disabled = true;
  resetStatus.textContent = "Mažu…";
  try {
    state.data = await apiPost({ action: "reset", pin });
    clearError();
    resetPin.value = "";
    resetPanel.hidden = true;
    flash("Data smazána");
    renderAll();
  } catch (err) {
    resetStatus.textContent = err.message;
  } finally {
    resetConfirm.disabled = false;
  }
}

// ---------- start ----------

async function init() {
  todayDateEl.textContent = `(${formatDate(todayStr())})`;

  renderPersonChips();
  renderChainGrid();
  fillCityList();

  const savedPerson = localStorage.getItem("noc-nakupy-person");
  if (savedPerson && NAMES.includes(savedPerson)) {
    state.party = [savedPerson];
    syncPersonSteps(true);
  }
  const savedPlace = localStorage.getItem("noc-nakupy-place");
  if (savedPlace) cityInput.value = savedPlace;

  // Sbalený krok jde znovu rozbalit klepnutím na jeho hlavičku.
  [stepPerson, stepPlace].forEach((step) => {
    step.querySelector(".step-head").addEventListener("click", () => {
      if (step.dataset.state === "done") setStep(step, "active");
    });
  });

  gpsBtn.addEventListener("click", useGps);
  cityBtn.addEventListener("click", useCity);
  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      useCity();
    }
  });
  radiusSelect.addEventListener("change", loadNearby);
  reloadBtn.addEventListener("click", loadNearby);
  fallbackToggle.addEventListener("click", () => showFallback(chainGrid.hidden));
  resetBtn.addEventListener("click", toggleResetPanel);
  resetConfirm.addEventListener("click", resetAll);
  resetPin.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      resetAll();
    }
  });

  try {
    state.data = await fetchData();
    clearError();
  } catch (err) {
    state.data = [];
    showError(err.message === NO_FUNCTIONS ? err.message : `Data se nenačetla — ${err.message}`);
  }
  renderAll();
}

init();
