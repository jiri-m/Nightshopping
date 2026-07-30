// ====== KONFIGURACE — uprav podle potřeby ======
const NAMES = [
  "Luciana",
  "Jiri M.",
  "Lucka",
  "Jiri",
  "Vlastik",
  "Pavlinka"
];

const AVATARS = {
  "Luciana": "🦊",
  "Jiri M.": "🐻",
  "Lucka": "🐱",
  "Jiri": "🦁",
  "Vlastik": "🐢",
  "Pavlinka": "🐰"
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
  ["Třebíč", 49.215, 15.881]
];
// =================================================

const API_URL = "/.netlify/functions/checkins";
const PHOTO_URL = "/.netlify/functions/photo";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

// Projekce odpovídá SVG cestě v index.html (viewBox 1000 x 566).
const PROJ = { lon0: 12.089746, lat1: 51.037793, k: 0.645364, s: 229.8134 };

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

function project(lat, lng) {
  return {
    x: (lng - PROJ.lon0) * PROJ.k * PROJ.s,
    y: (PROJ.lat1 - lat) * PROJ.s
  };
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

function setStep(el, stateName) {
  el.dataset.state = stateName;
}

// ---------- komunikace se serverem ----------

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
  return result.data;
}

async function fetchData() {
  const res = await fetch(API_URL);
  if (res.status === 404) throw new Error(NO_FUNCTIONS);
  const json = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(json)) {
    throw new Error((json && json.error) || `Server vrátil chybu ${res.status}.`);
  }
  return json;
}

// ---------- krok 1: kdo jsi ----------

function renderPersonChips() {
  personChips.innerHTML = "";
  NAMES.forEach((name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (state.person === name ? " on" : "");
    btn.setAttribute("aria-pressed", String(state.person === name));
    btn.innerHTML = `<span class="chip-avatar">${AVATARS[name] || "🐾"}</span>${name}`;
    btn.addEventListener("click", () => selectPerson(name));
    personChips.appendChild(btn);
  });
}

function selectPerson(name) {
  state.person = name;
  localStorage.setItem("noc-nakupy-person", name);
  personPick.textContent = `${AVATARS[name] || "🐾"} ${name}`;
  setStep(stepPerson, "done");
  if (!state.location) setStep(stepPlace, "active");
  renderPersonChips();
  renderTodayList();
}

// ---------- krok 2: kde jsi ----------

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

async function geocodeCity(query) {
  const local = PLACES.find(([n]) => n.toLowerCase() === query.toLowerCase());
  if (local) return { lat: local[1], lng: local[2], label: local[0], precise: false };

  const url =
    `${GEOCODE_URL}?format=jsonv2&limit=1&countrycodes=cz&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "cs" } });
  if (!res.ok) throw new Error(`vyhledávání měst vrátilo ${res.status}`);
  const hits = await res.json();
  if (!hits.length) throw new Error("takové město jsem nenašel");
  const hit = hits[0];
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.name || hit.display_name.split(",")[0],
    precise: false
  };
}

function setLocation(loc) {
  state.location = loc;
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

async function loadNearby() {
  if (!state.location || state.loadingShops) return;
  state.loadingShops = true;
  reloadBtn.disabled = true;
  nearbyList.innerHTML = "";
  nearbyStatus.textContent = "Hledám obchody v okolí…";

  const { lat, lng } = state.location;
  const radius = Number(radiusSelect.value);
  const query =
    `[out:json][timeout:25];` +
    `nwr(around:${radius},${lat},${lng})` +
    `[shop~"^(supermarket|convenience|department_store|greengrocer)$"];` +
    `out center tags;`;

  let elements;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!res.ok) throw new Error(`databáze obchodů vrátila ${res.status}`);
    elements = (await res.json()).elements || [];
  } catch (err) {
    nearbyStatus.textContent = `Obchody se nenačetly — ${err.message}.`;
    showFallback(true);
    state.loadingShops = false;
    reloadBtn.disabled = false;
    return;
  }

  const shops = elements
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

  state.loadingShops = false;
  reloadBtn.disabled = false;

  if (!shops.length) {
    nearbyStatus.textContent = "Tady žádný obchod není. Zkus větší okruh.";
    showFallback(true);
    return;
  }

  nearbyStatus.textContent = state.location.precise
    ? "Klepni na obchod, ve kterém jsi byl."
    : `Obchody kolem místa ${state.location.label}. Pro přesnější výsledky povol polohu.`;
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
  const payload = { person: state.person, shop, date: todayStr(), action: "add" };
  if (branch) payload.branch = branch;
  if (typeof lat === "number" && typeof lng === "number") {
    payload.lat = lat;
    payload.lng = lng;
    if (place) payload.place = place;
  }

  try {
    state.data = await apiPost(payload);
    clearError();
    flash(`Zapsáno — ${branch || shop} ✓`);
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
  const mine = state.data
    .filter((c) => c.date === date)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  todayListEl.innerHTML = "";

  if (!mine.length) {
    todayListEl.innerHTML =
      '<div class="empty">Dnes zatím nikdo nikde. Zapiš první návštěvu nahoře.</div>';
    return;
  }

  mine.forEach((c) => {
    const row = document.createElement("div");
    row.className = "today-item";

    const info = document.createElement("div");
    info.className = "today-info";
    info.innerHTML =
      `<span class="today-who">${AVATARS[c.person] || "🐾"} ${c.person}</span>` +
      `<span class="today-where">${c.branch || c.shop}</span>`;
    row.appendChild(info);

    // Zpětvzetí a fotka jen u vlastních záznamů — cizí check-in nemá
    // smysl mazat omylem.
    if (c.person === state.person) {
      const actions = document.createElement("div");
      actions.className = "today-actions";

      const cameraLabel = document.createElement("label");
      cameraLabel.className = "icon-btn";
      cameraLabel.title = "Přidat fotku";
      cameraLabel.textContent = c.hasPhoto ? "🖼️" : "📷";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.setAttribute("capture", "environment");
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) attachPhoto(c.id, file);
        fileInput.value = "";
      });
      cameraLabel.appendChild(fileInput);

      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "icon-btn";
      undoBtn.title = "Vzít zpět";
      undoBtn.textContent = "↺";
      undoBtn.addEventListener("click", () => removeCheckin(c.id));

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
    const { x, y } = project(g.lat, g.lng);
    return { x, y, g };
  });

  constellationEdges(points).forEach(({ a, b }) => {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", points[a].x.toFixed(1));
    line.setAttribute("y1", points[a].y.toFixed(1));
    line.setAttribute("x2", points[b].x.toFixed(1));
    line.setAttribute("y2", points[b].y.toFixed(1));
    line.setAttribute("class", "constellation");
    linesEl.appendChild(line);
  });

  points.forEach(({ x, y, g }, i) => {
    // Malé hvězdičky. Roste to logaritmicky, aby jedno oblíbené místo
    // nepřerostlo celou mapu.
    const outer = 4.5 + Math.min(6, Math.log2(g.count + 1) * 1.9);

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
    div.innerHTML =
      `<strong>${AVATARS[c.person] || "🐾"} ${c.person}</strong> — ${c.shop} ` +
      `<span>(${formatDate(c.date)}${where})</span>`;

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
    selectPerson(savedPerson);
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
