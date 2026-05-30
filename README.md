# FAU — leer Financial Auditing 🎯

Een kleine, verslavende leer-app (Duolingo-stijl) om het vak **Financial Auditing**
te halen. Korte dagelijkse vragen, XP & streaks, spaced repetition, en een eerlijke
**"ga ik slagen?"-schatting** op basis van je oefenresultaten.

**▶️ Live:** https://boazbuilds.github.io/FAU/

- 📱 Werkt op telefoon én laptop, **offline** (PWA, installeerbaar).
- 🗺️ **Leerpad** Module → Les → Boss met sterren en ontgrendeling (Duolingo-stijl).
- 🧠 **Spaced repetition** (Leitner) zodat je de stof onthoudt.
- 🎮 XP, niveaus, league, streaks, levens (mild) en badges.
- ❓ Vraagtypen: meerkeuze, meerkeuze-meervoudig, **koppelen** en invul — met echte tentamencasussen.
- 💡 **Examentips** als hint na je antwoord + 📕 **Spiekbriefje** ("Tab je HRA" + beslisbomen).
- 🔮 Slagingskans + "oefen dit als eerste", gewogen naar examenbelang; 📕 foutenlogboek.
- 🇳🇱 Nederlandse vragenbank: **8 modules, 103 vragen** (NBA-instellingstoets).
- 🆓 Geen account, geen backend, geen kosten — alles lokaal in je browser.

## Lokaal draaien
```bash
npm install
npm run dev        # http://localhost:5173/FAU/
```

## Bouwen & testen
```bash
npm run validate   # controleert de content (ids, types, gewichten)
npm test           # unit-tests van de engine (srs/grading/predict)
npm run build      # productie-build naar dist/ (draait ook validate)
npm run preview    # serveer de productie-build lokaal
```

## Online zetten (GitHub Pages)
1. Push naar `main`.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. De workflow in `.github/workflows/deploy.yml` bouwt en publiceert automatisch.
   De app komt op https://boazbuilds.github.io/FAU/

> De `base` staat op `/FAU/` in `vite.config.js`. Wijkt je repo-naam af, pas die dan aan.

## Vragen toevoegen
De content staat los van de code in `content/` — zie [`content/SCHEMA.md`](content/SCHEMA.md).
Voeg lessen/vragen toe in `content/course/*.json` (jouw vragenbank-formaat), draai
`npm run validate`, klaar. Spiekbriefje uitbreiden? Pas `content/cheatsheet.json` aan.

## Structuur
```
content/course/   vragenbank.json (+ casussen/techniek)  — de vragenbank
content/          examtips.json, cheatsheet.json, achievements.json
src/lib/          engine: content (merge+normaliseer), srs, grading, session,
                  progress (leerpad), gamify, predict, storage, sync (online-naad)
src/stores/       Svelte stores (gekoppeld aan localStorage)
src/components/ + src/screens/   de UI (Path = home, Session, Results, Cheatsheet, …)
src/config.js     alle afstembare knoppen op één plek
```
