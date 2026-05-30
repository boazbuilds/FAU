// Valideert de content vóór een build. Geen dependencies nodig.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const errors = [];
const warnings = [];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// --- topics ---
const topics = readJson(join(contentDir, 'topics.json'));
const topicIds = new Set();
let weightSum = 0;
for (const t of topics.topics ?? []) {
  if (!t.id) errors.push('Topic zonder id');
  else if (topicIds.has(t.id)) errors.push(`Dubbele topic-id: ${t.id}`);
  else topicIds.add(t.id);
  if (typeof t.examWeight !== 'number') errors.push(`examWeight ontbreekt/ongeldig bij topic ${t.id}`);
  else weightSum += t.examWeight;
  for (const f of ['title', 'description', 'order']) {
    if (t[f] === undefined) errors.push(`Topic ${t.id} mist veld '${f}'`);
  }
}
if (Math.abs(weightSum - 1) > 0.01) {
  errors.push(`Som van examWeight is ${weightSum.toFixed(3)} (moet ~1.00 zijn)`);
}

// --- questions ---
const qDir = join(contentDir, 'questions');
const qFiles = readdirSync(qDir).filter((f) => f.endsWith('.json'));
const qIds = new Set();
const topicsWithQuestions = new Set();
let qCount = 0;

for (const file of qFiles) {
  const data = readJson(join(qDir, file));
  if (!data.topicId) errors.push(`${file}: topicId ontbreekt`);
  else if (!topicIds.has(data.topicId)) errors.push(`${file}: onbekende topicId '${data.topicId}'`);
  else topicsWithQuestions.add(data.topicId);

  for (const q of data.questions ?? []) {
    qCount++;
    if (!q.id) { errors.push(`${file}: vraag zonder id`); continue; }
    if (qIds.has(q.id)) errors.push(`Dubbele vraag-id: ${q.id}`);
    qIds.add(q.id);
    if (q.topicId && q.topicId !== data.topicId) errors.push(`${q.id}: topicId wijkt af van bestand`);
    if (!q.prompt) errors.push(`${q.id}: prompt ontbreekt`);
    if (!q.explanation) errors.push(`${q.id}: explanation ontbreekt`);
    if (![1, 2, 3].includes(q.difficulty)) warnings.push(`${q.id}: difficulty ontbreekt of niet 1-3`);

    switch (q.type) {
      case 'mcq': {
        if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${q.id}: mcq heeft < 2 opties`);
        if (!Array.isArray(q.correct) || q.correct.length < 1) {
          errors.push(`${q.id}: mcq mist correct[]`);
        } else {
          const ids = new Set((q.options ?? []).map((o) => o.id));
          for (const c of q.correct) if (!ids.has(c)) errors.push(`${q.id}: correct '${c}' bestaat niet in opties`);
        }
        break;
      }
      case 'truefalse':
        if (typeof q.correct !== 'boolean') errors.push(`${q.id}: truefalse mist boolean 'correct'`);
        break;
      case 'short':
        if (!q.answer || !Array.isArray(q.answer.accept) || q.answer.accept.length < 1) {
          errors.push(`${q.id}: short mist answer.accept[]`);
        }
        break;
      case 'open':
        if (!q.modelAnswer) errors.push(`${q.id}: open mist modelAnswer`);
        break;
      default:
        errors.push(`${q.id}: onbekend type '${q.type}'`);
    }
  }
}

for (const t of topicIds) {
  if (!topicsWithQuestions.has(t)) warnings.push(`Topic '${t}' heeft (nog) geen vragen`);
}

if (warnings.length) {
  console.warn('\n⚠️  Waarschuwingen:');
  for (const w of warnings) console.warn(`  - ${w}`);
}
if (errors.length) {
  console.error('\n❌ Contentfouten:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} fout(en) gevonden.\n`);
  process.exit(1);
}
console.log(`\n✅ Content OK — ${topicIds.size} topics, ${qCount} vragen, ${qFiles.length} bestand(en).\n`);
