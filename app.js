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

// Města pro mapu, když nechceš povolit GPS. Přidávej klidně další.
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

// Projekce odpovídá SVG cestě v index.html (viewBox 1000 x 566).
const PROJ = { lon0: 12.089746, lat1: 51.037793, k: 0.645364, s: 229.8134 };

const NO_FUNCTIONS =
  "Serverová část není nasazená. Na Netlify zkontroluj, že se nahrála i složka netlify/functions.";

const personSelect = document.getElementById("person-select");
const placeSelect = document.getElementById("place-select");
const shopGrid = document.getElementById("shop-grid");
const leaderboardEl = document.getElementById("leaderboard");
const historyEl = document.getElementById("history");
const todayDateEl = document.getElementById("today-date");
const starsEl = document.getElementById("stars");
const statsEl = document.getElementById("stats");
const nogeoEl = document.getElementById("nogeo");
const bannerEl = document.getElementById("banner");
const findBtn = document.getElementById("find-btn");
const radiusSelect = document.getElementById("radius-select");
const nearbyStatus = document.getElementById("nearby-status");
const nearbyList = document.getElementById("nearby-list");

let allData = [];

function showError(msg) {
  bannerEl.textContent = msg;
  bannerEl.hidden = false;
}

function clearError() {
  bannerEl.hidden = true;
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

// ---------- výběr osoby a místa ----------

function initSelects() {
  NAMES.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = `${AVATARS[name] || "🐾"} ${name}`;
    personSelect.appendChild(opt);
  });

  const savedPerson = localStorage.getItem("noc-nakupy-person");
  if (savedPerson && NAMES.includes(savedPerson)) personSelect.value = savedPerson;

  personSelect.addEventListener("change", () => {
    localStorage.setItem("noc-nakupy-person", personSelect.value);
    renderShopGrid();
  });

  const gpsOpt = document.createElement("option");
  gpsOpt.value = "__gps__";
  gpsOpt.textContent = "📍 Podle polohy";
  placeSelect.appendChild(gpsOpt);

  PLACES.forEach(([name]) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    placeSelect.appendChild(opt);
  });

  const savedPlace = localStorage.getItem("noc-nakupy-place");
  if (savedPlace) placeSelect.value = savedPlace;

  placeSelect.addEventListener("change", () => {
    localStorage.setItem("noc-nakupy-place", placeSelect.value);
  });
}

function getGpsPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        place: "podle polohy"
      }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

async function currentLocation() {
  const choice = placeSelect.value;
  if (choice === "__gps__") return await getGpsPosition();
  const found = PLACES.find(([name]) => name === choice);
  return found ? { lat: found[1], lng: found[2], place: found[0] } : null;
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

async function sendCheckin(shop, action) {
  const payload = { person: personSelect.value, shop, date: todayStr(), action };

  if (action === "add") {
    const loc = await currentLocation();
    if (loc) Object.assign(payload, loc);
  }

  try {
    allData = await apiPost(payload);
    clearError();
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

async function attachPhoto(shop, file) {
  try {
    const dataUrl = await compressImage(file);
    allData = await apiPost({
      person: personSelect.value,
      shop,
      date: todayStr(),
      action: "attach-photo",
      dataUrl
    });
    clearError();
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

// ---------- vykreslení ----------


// ---------- konkrétní obchody poblíž (data z OpenStreetMap) ----------

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

function chainOf(tags) {
  const raw = tags.brand || tags.name || "";
  const hit = SHOPS.find((c) => raw.toLowerCase().includes(c.split(" ")[0].toLowerCase()));
  return hit || tags.brand || tags.name || "Jiný obchod";
}

async function findNearby() {
  findBtn.disabled = true;
  nearbyList.innerHTML = "";
  nearbyStatus.textContent = "Zjišťuji polohu…";

  let origin = await getGpsPosition();
  let usedFallback = false;
  if (!origin) {
    origin = await currentLocation();
    usedFallback = true;
  }
  if (!origin) {
    nearbyStatus.textContent = "Polohu se nepodařilo zjistit. Vyber město nahoře a zkus to znovu.";
    findBtn.disabled = false;
    return;
  }

  const radius = Number(radiusSelect.value);
  nearbyStatus.textContent = "Hledám obchody…";

  const query =
    `[out:json][timeout:25];` +
    `nwr(around:${radius},${origin.lat},${origin.lng})` +
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
    const json = await res.json();
    elements = json.elements || [];
  } catch (err) {
    nearbyStatus.textContent = `Obchody se nenačetly — ${err.message}. Zkus to za chvíli.`;
    findBtn.disabled = false;
    return;
  }

  const shops = elements
    .map((el) => {
      const lat = el.lat != null ? el.lat : el.center && el.center.lat;
      const lng = el.lon != null ? el.lon : el.center && el.center.lon;
      const tags = el.tags || {};
      if (lat == null || lng == null || (!tags.name && !tags.brand)) return null;
      const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
      return {
        name: tags.name || tags.brand,
        chain: chainOf(tags),
        street,
        hours: tags.opening_hours || "",
        lat,
        lng,
        dist: distanceMeters(origin.lat, origin.lng, lat, lng)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 25);

  if (shops.length === 0) {
    nearbyStatus.textContent = "Tady žádný obchod není. Zkus větší okruh.";
    findBtn.disabled = false;
    return;
  }

  nearbyStatus.textContent = usedFallback
    ? `${shops.length} obchodů kolem města ${origin.place}. Pro přesnější výsledky povol polohu.`
    : `${shops.length} obchodů v okolí. Klepni na + a zapiš návštěvu.`;

  shops.forEach((shop) => {
    const row = document.createElement("div");
    row.className = "nearby-item";

    const info = document.createElement("div");
    info.className = "nearby-info";
    const detail = [shop.street, `${shop.dist} m`].filter(Boolean).join(" · ");
    info.innerHTML =
      `<span class="nearby-name">${shop.name}</span>` +
      `<span class="nearby-detail">${detail}</span>` +
      (shop.hours ? `<span class="nearby-hours">${shop.hours}</span>` : "");

    const addBtn = document.createElement("button");
    addBtn.className = "step-btn";
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.setAttribute("aria-label", `Zapsat návštěvu ${shop.name}`);
    addBtn.addEventListener("click", async () => {
      addBtn.disabled = true;
      await checkInBranch(shop);
      addBtn.textContent = "✓";
      setTimeout(() => {
        addBtn.textContent = "+";
        addBtn.disabled = false;
      }, 1200);
    });

    row.append(info, addBtn);
    nearbyList.appendChild(row);
  });

  findBtn.disabled = false;
}

async function checkInBranch(shop) {
  try {
    allData = await apiPost({
      person: personSelect.value,
      shop: shop.chain,
      branch: shop.street ? `${shop.name}, ${shop.street}` : shop.name,
      date: todayStr(),
      action: "add",
      lat: shop.lat,
      lng: shop.lng,
      place: shop.name
    });
    clearError();
    renderAll();
  } catch (err) {
    showError(err.message);
  }
}

function renderShopGrid() {
  const person = personSelect.value;
  const date = todayStr();
  shopGrid.innerHTML = "";

  SHOPS.forEach((shop) => {
    const mine = allData.filter(
      (c) => c.person === person && c.shop === shop && c.date === date
    ).length;
    const total = allData.filter((c) => c.shop === shop && c.date === date).length;

    const row = document.createElement("div");
    row.className = "shop-btn" + (mine > 0 ? " checked" : "");

    const label = document.createElement("span");
    label.className = "shop-label";
    label.innerHTML = `${shop}<br><span class="count">${total}× dnes celkem</span>`;

    const stepper = document.createElement("span");
    stepper.className = "stepper";

    const minusBtn = document.createElement("button");
    minusBtn.className = "step-btn";
    minusBtn.type = "button";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", `Ubrat návštěvu ${shop}`);
    minusBtn.disabled = mine === 0;
    minusBtn.addEventListener("click", () => sendCheckin(shop, "remove-last"));

    const countSpan = document.createElement("span");
    countSpan.className = "my-count";
    countSpan.textContent = mine;

    const plusBtn = document.createElement("button");
    plusBtn.className = "step-btn";
    plusBtn.type = "button";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", `Přidat návštěvu ${shop}`);
    plusBtn.addEventListener("click", () => sendCheckin(shop, "add"));

    stepper.append(minusBtn, countSpan, plusBtn);

    const cameraLabel = document.createElement("label");
    cameraLabel.className = "camera-btn" + (mine === 0 ? " disabled" : "");
    cameraLabel.title = "Přidat fotku k dnešnímu check-inu";
    cameraLabel.textContent = "📷";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.setAttribute("capture", "environment");
    fileInput.disabled = mine === 0;
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) attachPhoto(shop, file);
      fileInput.value = "";
    });
    cameraLabel.appendChild(fileInput);

    row.append(label, stepper, cameraLabel);
    shopGrid.appendChild(row);
  });
}

function renderMap() {
  starsEl.innerHTML = "";

  const groups = new Map();
  let noGeo = 0;

  allData.forEach((c) => {
    if (typeof c.lat !== "number" || typeof c.lng !== "number") {
      noGeo += 1;
      return;
    }
    const key = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
    if (!groups.has(key)) {
      groups.set(key, { lat: c.lat, lng: c.lng, count: 0, place: c.place, shops: new Set() });
    }
    const g = groups.get(key);
    g.count += 1;
    g.shops.add(c.shop);
  });

  const ns = "http://www.w3.org/2000/svg";

  groups.forEach((g) => {
    const { x, y } = project(g.lat, g.lng);
    const r = 3 + Math.min(9, Math.log2(g.count + 1) * 2.6);

    const halo = document.createElementNS(ns, "circle");
    halo.setAttribute("cx", x);
    halo.setAttribute("cy", y);
    halo.setAttribute("r", r * 3.2);
    halo.setAttribute("fill", "url(#glow)");
    starsEl.appendChild(halo);

    const star = document.createElementNS(ns, "circle");
    star.setAttribute("cx", x);
    star.setAttribute("cy", y);
    star.setAttribute("r", r);
    star.setAttribute("class", "star");

    const title = document.createElementNS(ns, "title");
    title.textContent = `${g.place || "Bez názvu"} — ${g.count}× (${[...g.shops].join(", ")})`;
    star.appendChild(title);

    starsEl.appendChild(star);
  });

  nogeoEl.textContent = noGeo > 0 ? ` ${noGeo} návštěv je bez místa.` : "";

  const nights = new Set(allData.map((c) => c.date)).size;
  const shopCounts = {};
  allData.forEach((c) => {
    shopCounts[c.shop] = (shopCounts[c.shop] || 0) + 1;
  });
  const topShop = Object.entries(shopCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    ["Návštěv", allData.length],
    ["Nocí", nights],
    ["Míst", groups.size],
    ["Nejčastěji", topShop ? topShop[0] : "—"]
  ];

  statsEl.innerHTML = stats
    .map(([k, v]) => `<div class="stat"><span class="stat-value">${v}</span><span class="stat-key">${k}</span></div>`)
    .join("");
}

function renderLeaderboard() {
  const counts = {};
  NAMES.forEach((n) => (counts[n] = 0));
  allData.forEach((c) => {
    counts[c.person] = (counts[c.person] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const medals = ["🥇", "🥈", "🥉"];

  leaderboardEl.innerHTML = "";
  sorted.forEach(([name, count], i) => {
    const li = document.createElement("li");
    const rank = medals[i] || `${i + 1}.`;
    li.innerHTML =
      `<span><span class="rank">${rank}</span>${AVATARS[name] || "🐾"} ${name}</span>` +
      `<span class="score">${count}</span>`;
    leaderboardEl.appendChild(li);
  });
}

function renderHistory() {
  historyEl.innerHTML = "";
  if (allData.length === 0) {
    historyEl.innerHTML = '<div class="empty">Zatím nikdo nikde. Přidej první check-in nahoře.</div>';
    return;
  }

  const sorted = [...allData].sort(
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
  renderShopGrid();
  renderMap();
  renderLeaderboard();
  renderHistory();
}

async function init() {
  todayDateEl.textContent = `(${formatDate(todayStr())})`;
  initSelects();
  findBtn.addEventListener("click", findNearby);
  try {
    allData = await fetchData();
    clearError();
  } catch (err) {
    allData = [];
    showError(err.message === NO_FUNCTIONS ? err.message : `Data se nenačetla — ${err.message}`);
  }
  renderAll();
}

init();
