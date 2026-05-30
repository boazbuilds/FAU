// Valideert de content vóór een build. Geen dependencies nodig.
// Merge't base + extensies en controleert het schema van Boaz' vragenbank.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const errors = [];
const warnings = [];
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const base = readJson(join(contentDir, 'course/vragenbank.json'));
const casus = readJson(join(contentDir, 'course/vragenbankcasussen.json'));
const techniek = readJson(join(contentDir, 'course/vragenbanktechniek.json'));
const extra = readJson(join(contentDir, 'course/vragenbankextra.json'));
const tipsData = readJson(join(contentDir, 'examtips.json'));

// --- merge ---
const course = JSON.parse(JSON.stringify(base));
for (const ext of [casus, techniek, extra]) {
  const addLessons = ext.addLessonsToModule || {};
  for (const m of course.modules) {
    if (addLessons[m.id]) m.lessons.push(...addLessons[m.id]);
  }
  if (ext.addModules) course.modules.push(...ext.addModules);
}
course.modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// --- tips ---
const tipIds = new Set((tipsData.tips ?? []).map((t) => t.id));
if (tipIds.size === 0) errors.push('examtips.json bevat geen tips');

// --- modules / lessen / vragen ---
const moduleIds = new Set();
const lessonIds = new Set();
const qIds = new Set();
let qCount = 0;
let lessonCount = 0;
const OBJECTIVE = new Set(['multiple_choice', 'multi_select', 'matching', 'fill_blank']);

for (const m of course.modules) {
  if (!m.id) errors.push('Module zonder id');
  else if (moduleIds.has(m.id)) errors.push(`Dubbele module-id: ${m.id}`);
  else moduleIds.add(m.id);
  for (const f of ['title', 'order']) {
    if (m[f] === undefined) errors.push(`Module ${m.id} mist veld '${f}'`);
  }

  for (const l of m.lessons ?? []) {
    lessonCount++;
    if (!l.id) errors.push(`Module ${m.id}: les zonder id`);
    else if (lessonIds.has(l.id)) errors.push(`Dubbele les-id: ${l.id}`);
    else lessonIds.add(l.id);
    if (!l.title) errors.push(`Les ${l.id}: title ontbreekt`);
    if (!Array.isArray(l.questions) || l.questions.length === 0) {
      warnings.push(`Les ${l.id}: geen vragen`);
    }

    for (const q of l.questions ?? []) {
      qCount++;
      if (!q.id) { errors.push(`Les ${l.id}: vraag zonder id`); continue; }
      if (qIds.has(q.id)) errors.push(`Dubbele vraag-id: ${q.id}`);
      qIds.add(q.id);
      if (!q.prompt) errors.push(`${q.id}: prompt ontbreekt`);
      if (!q.explanation) errors.push(`${q.id}: explanation ontbreekt`);
      if (![1, 2, 3].includes(q.difficulty)) warnings.push(`${q.id}: difficulty ontbreekt of niet 1-3`);
      if (q.tipRef && !tipIds.has(q.tipRef)) errors.push(`${q.id}: onbekende tipRef '${q.tipRef}'`);

      switch (q.type) {
        case 'multiple_choice': {
          if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${q.id}: mc heeft < 2 opties`);
          if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= (q.options?.length ?? 0)) {
            errors.push(`${q.id}: correct-index buiten bereik`);
          }
          break;
        }
        case 'multi_select': {
          if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${q.id}: multi_select heeft < 2 opties`);
          if (!Array.isArray(q.correct) || q.correct.length < 1) errors.push(`${q.id}: multi_select mist correct[]`);
          else for (const i of q.correct) {
            if (!Number.isInteger(i) || i < 0 || i >= (q.options?.length ?? 0)) errors.push(`${q.id}: correct-index ${i} buiten bereik`);
          }
          break;
        }
        case 'matching': {
          if (!Array.isArray(q.pairs) || q.pairs.length < 2) errors.push(`${q.id}: matching heeft < 2 pairs`);
          else {
            // De grader matcht op pair-positie, niet op tekst, dus dubbele 'right'
            // is toegestaan (bv. 2x 'Oordeel met beperking' in de 2x2-matrix).
            // Dubbele 'left' is wel ambigu en niet toegestaan.
            const lefts = new Set();
            for (const p of q.pairs) {
              if (!p.left || !p.right) errors.push(`${q.id}: pair met lege left/right`);
              if (lefts.has(p.left)) errors.push(`${q.id}: dubbele left '${p.left}'`);
              lefts.add(p.left);
            }
          }
          break;
        }
        case 'fill_blank':
          if (!q.answer) errors.push(`${q.id}: fill_blank mist answer`);
          break;
        default:
          errors.push(`${q.id}: onbekend type '${q.type}'`);
      }

      // bossvragen (lessen met boss:true) moeten objectief zijn
      if (l.boss && !OBJECTIVE.has(q.type)) {
        errors.push(`${q.id}: boss-les mag alleen objectieve typen bevatten`);
      }
    }
  }
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
console.log(`\n✅ Content OK — ${moduleIds.size} modules, ${lessonCount} lessen, ${qCount} vragen, ${tipIds.size} tips.\n`);
