// Valideert de content vóór een build. Geen dependencies nodig.
// Leest het zelfstandige app-bestand (app-instellingstoets.json) en controleert
// het schema: modules/lessen/vragen, unieke id's, vraagtypen, casus_bouw, tipRef.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const errors = [];
const warnings = [];
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const app = readJson(join(contentDir, 'app-instellingstoets.json'));

// --- tips (ingesloten) ---
const tipIds = new Set((app.tips ?? []).map((t) => t.id));
if (tipIds.size === 0) errors.push('app-instellingstoets.json bevat geen tips');

// --- modules / lessen / vragen ---
const moduleIds = new Set();
const lessonIds = new Set();
const qIds = new Set();
let qCount = 0;
let lessonCount = 0;
const OBJECTIVE = new Set(['multiple_choice', 'multi_select', 'matching', 'fill_blank']);

for (const m of app.modules ?? []) {
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
        case 'casus_bouw': {
          // Veldnamen uit het app-bestand: slots[], bouwstenen[] (tekst/rol/punten/slot).
          const slots = q.slots ?? [];
          const blocks = q.bouwstenen ?? q.blocks ?? [];
          if (slots.length < 1) errors.push(`${q.id}: casus_bouw heeft geen slots`);
          if (blocks.length < 2) errors.push(`${q.id}: casus_bouw heeft < 2 bouwstenen`);
          const slotIds = new Set();
          for (const s of slots) {
            if (!s.id || !s.label) errors.push(`${q.id}: slot mist id/label`);
            if (slotIds.has(s.id)) errors.push(`${q.id}: dubbele slot-id '${s.id}'`);
            slotIds.add(s.id);
          }
          const blockIds = new Set();
          let kernCount = 0;
          let kernPoints = 0;
          for (const b of blocks) {
            const text = b.tekst ?? b.text;
            const role = b.rol ?? b.role;
            const points = b.punten ?? b.points;
            if (!b.id || !text) errors.push(`${q.id}: bouwsteen mist id/tekst`);
            if (blockIds.has(b.id)) errors.push(`${q.id}: dubbele bouwsteen-id '${b.id}'`);
            blockIds.add(b.id);
            if (!['kern', 'instinker', 'afleider'].includes(role)) {
              errors.push(`${q.id}: bouwsteen '${b.id}' heeft ongeldige rol '${role}'`);
            }
            if (role === 'kern') {
              kernCount++;
              kernPoints += points ?? 0;
              if (!(points > 0)) errors.push(`${q.id}: kern-bouwsteen '${b.id}' mist punten>0`);
              if (!slotIds.has(b.slot)) errors.push(`${q.id}: kern-bouwsteen '${b.id}' verwijst naar onbekend slot '${b.slot}'`);
            }
          }
          if (kernCount < 1) errors.push(`${q.id}: casus_bouw heeft geen kern-bouwstenen`);
          if (q.punten != null && q.punten !== kernPoints) {
            warnings.push(`${q.id}: punten (${q.punten}) ≠ som kern-punten (${kernPoints})`);
          }
          break;
        }
        default:
          errors.push(`${q.id}: onbekend type '${q.type}'`);
      }

      // bossvragen moeten objectief óf casus_bouw zijn (alle gesloten/auto-scoorbaar)
      if (l.boss && !OBJECTIVE.has(q.type) && q.type !== 'casus_bouw') {
        errors.push(`${q.id}: boss-les mag alleen objectieve typen of casus_bouw bevatten`);
      }
    }
  }
}

if (warnings.length) {
  console.warn(`\n⚠️  ${warnings.length} waarschuwing(en) (eerste 20):`);
  for (const w of warnings.slice(0, 20)) console.warn(`  - ${w}`);
}
if (errors.length) {
  console.error('\n❌ Contentfouten:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} fout(en) gevonden.\n`);
  process.exit(1);
}
console.log(`\n✅ Content OK — ${moduleIds.size} modules, ${lessonCount} lessen, ${qCount} vragen, ${tipIds.size} tips.\n`);
