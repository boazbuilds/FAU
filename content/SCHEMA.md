# Contentschema (vragenbank)

De app leest **jouw** vragenbank-formaat. De content staat los van de code; je voegt
vragen toe zonder code aan te raken. Valideer altijd met `npm run validate`
(draait ook automatisch bij `npm run build`).

## Bestanden in `content/`
- `course/vragenbank.json` — de basis: `course` + `modules[]`.
- `course/vragenbankcasussen.json` — uitbreiding via `addLessonsToModule{}` + `addModules[]`.
- `course/vragenbanktechniek.json` — uitbreiding (module m7) via `addModules[]`.
- `examtips.json` — de 22 examentips (`id, nr, category, title, body, tags`).
- `cheatsheet.json` — Spiekbriefje: `hraNav[]` (Tab je HRA) + `decisionTrees[]` (beslisbomen).

De loader (`src/lib/content.js`) merge't base + uitbreidingen (per module-id lessen
toevoegen; modules toevoegen; sorteren op `order`) en normaliseert elk vraagtype.

## Module → Les → Vraag
```jsonc
{
  "modules": [
    { "id": "m0", "order": 0, "icon": "🧱", "title": "Fundamenten", "description": "…",
      "lessons": [
        { "id": "m0l1", "title": "Beweringen",
          "casusIntro": "(optioneel) volledige casus die voor alle vragen geldt",
          "boss": false,                       // true = examenquiz (alleen objectieve typen)
          "questions": [ /* zie hieronder */ ] }
      ] }
  ]
}
```

## Vraagtypen
Elke vraag: `id` (uniek, onveranderlijk — voortgang hangt eraan), `difficulty` (1-3),
`prompt`, `explanation`, optioneel `tags`, `context` (casusfragment per vraag) en
`tipRef` (id van een tip in `examtips.json`, getoond na het antwoord).

```jsonc
// meerkeuze, één juist — correct = index in options
{ "id":"m0l1q1", "type":"multiple_choice", "prompt":"…",
  "options":["A","B","C","D"], "correct":1, "explanation":"…", "difficulty":1, "tags":["…"] }

// meerkeuze, meerdere juist — correct = array van indices
{ "id":"…", "type":"multi_select", "options":["…","…","…"], "correct":[0,1], "explanation":"…" }

// koppelen — pairs links↔rechts; de app schudt de rechterkolom
{ "id":"…", "type":"matching",
  "pairs":[{"left":"Beoordeling","right":"Standaard 2400"},{"left":"Samenstellen","right":"4410"}],
  "explanation":"…" }

// invul — ___ in de prompt; antwoord + synoniemen
{ "id":"…", "type":"fill_blank", "prompt":"AR = IR × CR × ___",
  "answer":"detectierisico", "accept":["dr","detection risk"], "explanation":"…" }
```

## Regels (door de validator afgedwongen)
- Unieke module-, les- en vraag-id's.
- `multiple_choice`: `correct`-index binnen `options`. `multi_select`: alle indices geldig.
- `matching`: ≥2 pairs, niet-lege left/right, geen dubbele `left` (dubbele `right` mág — de
  app matcht op positie, handig voor de 2×2-matrix).
- `fill_blank`: heeft `answer`.
- Elke `tipRef` bestaat in `examtips.json`. Elke vraag heeft `explanation`.
- Boss-lessen (`boss:true`) bevatten alleen objectieve typen (geen open vragen).

## Een onderwerp/les toevoegen
1. Voeg een les toe aan een module (of een module aan `addModules`).
2. Schrijf de vragen in een van de vier typen hierboven.
3. `npm run validate` → bij groen is alles klaar voor de build.

## Examengewichten
De slaagkans-voorspelling weegt modules naar vraagaantal. Module `m7` (techniek) staat
op gewicht 0 via `CONFIG.content.moduleWeightOverrides` in `src/config.js`; daar stem je
de gewichten af op het echte tentamen-blueprint.
