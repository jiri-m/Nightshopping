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

## Propojení úložiště

Většinou se propojí samo. Když appka hlásí **„Úložiště zatím není
propojené"**, otevři si nejdřív diagnostiku:

```
https://TVUJ-WEB.netlify.app/.netlify/functions/diag
```

Klíčový je řádek `automatickyKontextBlobs`:

- **`true`** → úložiště je propojené a chyba je jinde, koukni na `uloziste.chyba`
- **`false`** → Netlify přístup nedalo, doplň token podle kroků níž

Pozor na jednu past: zneplatnit token v nastavení účtu **nesmaže** proměnnou
`BLOBS_TOKEN`. Ta pak drží mrtvý token a úložiště vrací 401. Když je web
napojený na Git, proměnnou rovnou smaž — propojení proběhne samo.

### Doplnění tokenu ručně

1. **Token**: v Netlify vpravo nahoře avatar → User settings → Applications →
   Personal access tokens → *New access token* → zkopíruj ho
   (ukáže se jen jednou)
2. Netlify → Project configuration → **Environment variables** →
   Add a variable → `BLOBS_TOKEN` = token z kroku 1
3. Deploys → Trigger deploy → **Clear cache and deploy site**

Site ID doplňovat nemusíš, Netlify ho funkcím dává samo — v diagnostice ho
vidíš na řádku `siteId`. Když by tam přesto bylo `null`, přidej ještě
proměnnou `BLOBS_SITE_ID` s hodnotou *Project ID*
(Project configuration → General).



## Jak se zapisuje návštěva

Jedna karta, tři kroky, které se odemykají postupně:

1. **Kdo jsi** — klepneš na svoje jméno. Appka si ho pamatuje, takže příště
   je krok rovnou hotový.
2. **Kde jsi** — buď „Použít moji polohu" (přesné, hvězda na mapě sedí na
   obchodě), nebo napíšeš město. Nabízí se města ze seznamu `PLACES`,
   ale napsat jde cokoliv — zbytek se dohledá v OpenStreetMap.
3. **Kde jsi nakupoval** — obchody v okolí se načtou samy, s ulicí,
   vzdáleností a u většiny i otevírací dobou. Klepnutím na řádek se zapíše
   návštěva té konkrétní pobočky. Okruh se dá přepnout na 600 m / 1,2 km / 3 km.

Když obchod v seznamu není (nebo OpenStreetMap zrovna neodpovídá), rozbalí se
pod odkazem **„Můj obchod tu není"** seznam řetězců. Návštěva se zapíše
s polohou, ale bez konkrétní pobočky.

Hotový krok se sbalí na jeden řádek a klepnutím na hlavičku se zase rozbalí.

## Jak to funguje dál

- **Dnes** — seznam dnešních návštěv všech. U svých máš **↺** (vzít zpět)
  a **📷** (připojit fotku). Cizí záznamy měnit nejdou.
- **Hvězdná mapa** — každé místo je hvězdička, větší a jasnější = víc
  návštěv. Spojnice tvoří souhvězdí. Bez polohy se check-in počítá dál,
  jen nemá hvězdu.
- **Žebříček** počítá všechny check-iny za celou dobu.
- **Historie** ukazuje všechny záznamy, nejnovější nahoře.

## Mazání dat

Odkaz **„Vymazat všechna data"** úplně dole smaže check-iny i fotky. Protože
je web veřejný, jde to jen s PINem:

1. Netlify → Project configuration → Environment variables → přidej
   `ADMIN_PIN` s libovolnou hodnotou, kterou si vymyslíš
2. Deploys → Trigger deploy → Clear cache and deploy site
3. V appce klepni na odkaz, rozbalí se políčko na PIN

Bez nastaveného `ADMIN_PIN` server mazání odmítne, takže nikdo cizí data
smazat nemůže. Jestli to hlásí, že mazání není povolené, i když proměnnou
máš přidanou, chybí nasazení — na `/.netlify/functions/diag` musí být
`adminPinNastaveny: true`.

## Když appka hlásí chybu

- **„Serverová část není nasazená"** → v Netlify chybí funkce, viz výše
- **Bílá stránka / Page not found** → publikovala se špatná složka.
  V Netlify: Project configuration → Build & deploy → Publish directory
  musí být prázdné nebo `.`
- **„Úložiště zatím není propojené"** → viz sekce Propojení úložiště nahoře
- **Cokoliv jiného** → `/.netlify/functions/diag`, případně
  Netlify → Logs → Functions, tam je přesná hláška

## Přidání jmen a obchodů

Všechno je nahoře v `app.js`:

- `NAMES` — kdo se účastní
- `AVATARS` — zvířecí ikonka ke jménu
- `SHOPS` — řetězce do záložního seznamu
- `PLACES` — města v našeptávači

Po úpravě stačí pushnout. Data se tím neztratí, jsou v Netlify Blobs
odděleně od kódu.
