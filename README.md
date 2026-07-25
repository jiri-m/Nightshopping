# Noční nákupy

Kdo z party byl v jakém obchodě mezi 21:00 a zavíračkou. Žebříček ukazuje, kdo
jich nasbíral nejvíc, hvězdná mapa ukazuje kde.

## Nasazení přes Git (doporučeno)

```bash
cd nightshopping
git init
git add .
git commit -m "Nocni nakupy"
git branch -M main
git remote add origin https://github.com/UZIVATEL/nightshopping.git
git push -u origin main
```

Pak v Netlify: **Add new project → Import an existing project** → vyber repo.
Nastavení se načte z `netlify.toml`, nic se nevyplňuje ručně.

Takhle se **úložiště propojí samo** — žádné tokeny ani proměnné prostředí
nejsou potřeba. Každý další `git push` nasadí novou verzi.

`node_modules` je v `.gitignore`, Netlify si závislosti nainstaluje sám.

## Nasazení přetažením (bez Gitu)

Soubory jsou v kořeni balíčku a `node_modules` je přibalená, takže se nic
nebuilduje. Rozbal zip a přetáhni **rozbalenou složku** do Netlify →
Add new project → Deploy manually. V tomhle případě je navíc nutné propojit
úložiště ručně, viz další sekce.

## Propojení úložiště (jen u nasazení přetažením)

**Při nasazení z Gitu tuhle sekci přeskoč.** Týká se jen ručně nahraného
zipu, kterému Netlify přístup k úložišti nedá automaticky — appka pak hlásí
„Úložiště zatím není propojené".

1. **Site ID**: v Netlify → Project configuration → General → zkopíruj *Project ID*
2. **Token**: vpravo nahoře avatar → User settings → Applications →
   Personal access tokens → *New access token* → zkopíruj ho (ukáže se jen jednou)
3. V Netlify → Project configuration → **Environment variables** → Add a variable,
   přidej dvě:
   - `BLOBS_SITE_ID` = Project ID z kroku 1
   - `BLOBS_TOKEN` = token z kroku 2
4. Deploys → Trigger deploy → **Clear cache and deploy site**



## Obchody poblíž

Tlačítko „Najít obchody poblíž" vezme polohu z telefonu a vytáhne konkrétní
obchody z OpenStreetMap — název, ulici, vzdálenost a u většiny i otevírací
dobu. Klepnutím na **+** se zapíše návštěva té konkrétní pobočky, takže na
mapě sedí hvězda přesně na obchodě. Okruh hledání se dá přepnout na
600 m / 1,2 km / 3 km.

Databáze je živá z OpenStreetMap, takže není potřeba nic udržovat.
Když telefon polohu nedá, použije se město vybrané nahoře.

## Když appka hlásí chybu

- **„Serverová část není nasazená"** → v Netlify chybí funkce, viz výše
- **Bílá stránka / Page not found** → publikovala se špatná složka.
  V Netlify: Project configuration → Build & deploy → Publish directory
  musí být prázdné nebo `.`
- **„Úložiště zatím není propojené"** → chybí proměnné, viz sekce nahoře
- **Cokoliv jiného** → Netlify → Logs → Functions, tam je přesná hláška

## Přidání jmen a obchodů

Všechno je nahoře v `app.js`:

- `NAMES` — kdo se účastní
- `AVATARS` — zvířecí ikonka ke jménu
- `SHOPS` — řetězce
- `PLACES` — města nabízená pro mapu

Po úpravě nahraj složku znovu. Data se tím neztratí, jsou v Netlify Blobs
odděleně od kódu.

## Jak to funguje

- Nahoře si vybereš jméno a místo (appka si obojí pamatuje)
- **+** přidá dnešní návštěvu, klidně opakovaně; **−** vrátí poslední zpátky
- **📷** volitelně připojí fotku k poslednímu dnešnímu check-inu
- **Hvězdná mapa** — každé místo je hvězda, větší a jasnější = víc návštěv.
  Poloha z GPS nebo z vybraného města; bez polohy se check-in počítá dál,
  jen nemá hvězdu
- **Žebříček** počítá všechny check-iny za celou dobu
- **Historie** ukazuje všechny záznamy, nejnovější nahoře
