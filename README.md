# FAU — leer Financial Auditing 🎯

Een kleine, verslavende leer-app (Duolingo-stijl) om het vak **Financial Auditing**
te halen. Korte dagelijkse vragen, XP & streaks, spaced repetition, en een eerlijke
**"ga ik slagen?"-schatting** op basis van je oefenresultaten.

- 📱 Werkt op telefoon én laptop, **offline** (PWA, installeerbaar).
- 🧠 **Spaced repetition** (Leitner) zodat je de stof onthoudt.
- 🎮 XP, niveaus, league, streaks, levens (mild) en badges.
- 🔮 Slagingskans + "oefen dit als eerste", gewogen naar examenbelang.
- 🇳🇱 Nederlandstalige vragenbank; nadruk op open/begripsvragen (active recall).
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
   De app komt op `https://<gebruiker>.github.io/FAU/`.

> De `base` staat op `/FAU/` in `vite.config.js`. Wijkt je repo-naam af, pas die dan aan.

## Vragen toevoegen
De content staat los van de code in `content/` — zie [`content/SCHEMA.md`](content/SCHEMA.md).
Voeg vragen toe in `content/questions/<topic>.json`, draai `npm run validate`, klaar.
Later kan een AI-script vragen in exact hetzelfde formaat genereren.

## Structuur
```
content/   topics.json, achievements.json, questions/*.json  (de vragenbank)
src/lib/   engine: srs, grading, session, gamify, predict, storage, content
src/stores/  Svelte stores (gekoppeld aan localStorage)
src/components/ + src/screens/  de UI
src/config.js  alle afstembare knoppen op één plek
```
