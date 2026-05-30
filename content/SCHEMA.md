# Contentschema

De content (vragenbank) staat los van de game-engine. De engine leest alleen dit
schema, dus je kunt vragen toevoegen/wijzigen zonder code aan te raken. Later kan
een AI-script vragen in exact dit formaat genereren en in `content/questions/` zetten.

Valideer altijd met `npm run validate` (draait ook automatisch bij `npm run build`).

## `topics.json`
```jsonc
{
  "schemaVersion": 1,
  "topics": [
    {
      "id": "audit-risk-model",      // uniek, kleine letters met streepjes; ONVERANDERLIJK
      "title": "Auditrisicomodel",    // NL-label
      "shortTitle": "Auditrisico",
      "description": "…",
      "examWeight": 0.4,              // 0..1; som over alle topics ≈ 1.00
      "order": 1,                      // aanbevolen leervolgorde
      "icon": "🎯",                    // emoji
      "color": "#6366f1"
    }
  ]
}
```

## `questions/<topic-id>.json`
Eén bestand per onderwerp. Elke vraag heeft **altijd** `id`, `topicId`, `type`,
`difficulty` (1=makkelijk, 2=gemiddeld, 3=moeilijk), `prompt`, `explanation` en bij
voorkeur `reference`. Het veld `type` bepaalt de renderer én de beoordeling.

| type | extra velden | beoordeling |
|------|--------------|-------------|
| `open` | `modelAnswer`, `keyPoints[]` | zelfbeoordeling: Wist ik / Deels / Niet (kost géén leven) |
| `short` | `answer.accept[]`, `answer.minSimilarity` | automatisch, genormaliseerd + fuzzy |
| `mcq` | `options[] {id,text}`, `correct[]` | automatisch (vergelijkt option-id's) |
| `truefalse` | `correct` (boolean) | automatisch |

Regels:
- `id` is globaal uniek en **onveranderlijk** (de voortgang/spaced-repetition hangt eraan). Gebruik `prefix-NNN`.
- Houd vragen kort: één concept per vraag (micro-skills).
- Een nieuw vraagtype toevoegen = een renderer + een grader toevoegen; de engine blijft gelijk.

## Een onderwerp toevoegen
1. Voeg het topic toe in `topics.json` (en herverdeel de `examWeight` zodat de som ≈ 1.00).
2. Maak `content/questions/<topic-id>.json` met vragen.
3. `npm run validate`.
