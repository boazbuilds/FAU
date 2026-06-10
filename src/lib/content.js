// Laadt de content uit één zelfstandig app-bestand (app-instellingstoets.json) en
// normaliseert elke vraag naar de interne runtime-vorm die de engine/components al
// kennen. Het bestand is self-contained: { meta, _howto, modes[], modules[] (met
// 'track'), instinkers[], tips[] }. Vite bundelt de JSON bij de build in.
import appData from '../../content/app-instellingstoets.json';
import achievementsData from '../../content/achievements.json';
import { CONFIG } from '../config.js';

// --- 1. Normaliseer een bronvraag naar de interne vorm ---
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function normalizeQuestion(q, moduleId, lessonId) {
  const common = {
    id: q.id,
    topicId: moduleId,
    lessonId,
    difficulty: q.difficulty ?? 2,
    prompt: q.prompt,
    explanation: q.explanation ?? '',
    tags: q.tags ?? [],
    context: q.context ?? null,
    tipRef: q.tipRef ?? null,
    phase: q.phase ?? null, // 'kennis' | 'techniek' | 'toepassing'; ontbreekt ⇒ als kennis behandeld
    ref: q.ref ?? null // wet/Standaard-verwijzing (bv. "Standaard 240.31"), getoond na het antwoord
  };

  switch (q.type) {
    case 'multiple_choice':
      return {
        ...common,
        type: 'mcq',
        multi: false,
        options: (q.options ?? []).map((text, i) => ({ id: LETTERS[i], text })),
        correct: [LETTERS[q.correct]]
      };
    case 'multi_select':
      return {
        ...common,
        type: 'mcq',
        multi: true,
        options: (q.options ?? []).map((text, i) => ({ id: LETTERS[i], text })),
        correct: (q.correct ?? []).map((i) => LETTERS[i])
      };
    case 'matching':
      return {
        ...common,
        type: 'match',
        pairs: (q.pairs ?? []).map((p, i) => ({ id: 'p' + i, left: p.left, right: p.right }))
      };
    case 'fill_blank':
      return {
        ...common,
        type: 'short',
        answer: {
          accept: [q.answer, ...(q.accept ?? [])].filter(Boolean),
          minSimilarity: 0.85
        }
      };
    case 'casus_bouw':
      // "Bouw het antwoord": sleep/plaats bouwstenen in de juiste structuurstap.
      // Het app-bestand gebruikt Nederlandse veldnamen (bouwstenen/tekst/rol/punten/
      // feedback); we mappen ze naar de interne vorm (blocks/text/role/points/explain).
      return {
        ...common,
        type: 'build',
        punten: q.punten ?? null, // CA-voorblad-punten (voor de score-presentatie)
        modelantwoord: q.modelantwoord ?? null,
        slots: (q.slots ?? []).map((s) => ({ id: s.id, label: s.label })),
        blocks: (q.bouwstenen ?? q.blocks ?? []).map((b) => ({
          id: b.id,
          text: b.tekst ?? b.text ?? '',
          role: b.rol ?? b.role, // 'kern' | 'instinker' | 'afleider'
          slot: b.slot ?? null, // alleen relevant voor kern-blokken
          points: b.punten ?? b.points ?? 0,
          explain: b.feedback ?? b.explain ?? null,
          ref: b.ref ?? null
        }))
      };
    default:
      // onbekend type: laat door, maar markeer (validator vangt dit af)
      return { ...common, type: q.type };
  }
}

const OBJECTIVE_TYPES = new Set(['mcq', 'truefalse', 'short', 'match']);
export function isObjective(question) {
  return OBJECTIVE_TYPES.has(question.type);
}

// --- 2. Modules (één self-contained bestand; geen merge nodig) ---
const course = { modules: structuredClone(appData.modules) };
course.modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Genereer per module een boss-examen. Virtueel: de boss-les heeft zelf geen
// vragen, maar buildBossSession() trekt een wisselende subset uit de modulepool
// (zo is elke poging anders en blijft de progressie spannend/verslavend).
for (const m of course.modules) {
  m.lessons = m.lessons ?? [];
  // De Eindbaas: markeer de laatste casus_bouw-les als boss (de poort van de
  // module). Heeft een module geen casus (bv. de basis-track m0–m9), dan een
  // auto-boss met een wisselende subset objectieve modulevragen.
  const casusLessons = m.lessons.filter((l) => (l.questions ?? []).some((q) => q.type === 'casus_bouw'));
  if (casusLessons.length) casusLessons[casusLessons.length - 1].boss = true;
  const hasBoss = m.lessons.some((l) => l.boss);
  const hasLessen = m.lessons.some((l) => !l.boss);
  if (!hasBoss && hasLessen) {
    m.lessons.push({ id: m.id + 'boss', title: m.title, boss: true, questions: [] });
  }
}

export const modules = course.modules.map((m) => ({
  id: m.id,
  title: m.title,
  shortTitle: m.shortTitle ?? m.title,
  description: m.description ?? '',
  order: m.order ?? 0,
  icon: m.icon ?? '📘',
  color: m.color ?? '#6366f1',
  track: m.track ?? 'basis', // 'basis' | 'pad' | 'leercurve' | 'examen'
  lessons: (m.lessons ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    casusIntro: l.casusIntro ?? l.context ?? null,
    boss: !!l.boss,
    questionIds: (l.questions ?? []).map((q) => q.id)
  }))
}));

// engine-alias: een "topic" == een module
export const topics = modules;
export const topicById = Object.fromEntries(modules.map((m) => [m.id, m]));

export const questionById = {};
export const questionsByTopic = {};
export const questionsByLesson = {};
export const lessonById = {};
export const lessonsByModule = {};

for (const m of course.modules) {
  questionsByTopic[m.id] = [];
  lessonsByModule[m.id] = m.lessons ?? [];
  for (const l of m.lessons ?? []) {
    lessonById[l.id] = { ...l, moduleId: m.id };
    questionsByLesson[l.id] = [];
    for (const raw of l.questions ?? []) {
      const q = normalizeQuestion(raw, m.id, l.id);
      questionById[q.id] = q;
      questionsByTopic[m.id].push(q);
      questionsByLesson[l.id].push(q);
    }
  }
}

export const allQuestions = Object.values(questionById);

export function questionsForTopic(topicId) {
  return questionsByTopic[topicId] ?? [];
}
export function questionsForLesson(lessonId) {
  return questionsByLesson[lessonId] ?? [];
}

// --- 3. Tracks (uit het app-bestand) ---
// Elke module heeft een 'track'; de modus-knoppen (snel/pad/leercurve/examen) zitten in Home.
export const TRACKS = ['basis', 'pad', 'leercurve', 'examen'];
export const modulesByTrack = {};
for (const m of modules) (modulesByTrack[m.track] ??= []).push(m);
export function modulesForTrack(track) {
  return [...(modulesByTrack[track] ?? [])].sort((a, b) => a.order - b.order);
}

// Tentamen-scope: landelijk = basis (m0–m9); instelling = pad + leercurve + examen (ins*).
const SCOPE_TRACKS = { landelijk: ['basis'], instelling: ['pad', 'leercurve', 'examen'] };
export function modulesForScope(scope) {
  return (SCOPE_TRACKS[scope] ?? SCOPE_TRACKS.instelling)
    .flatMap((t) => modulesForTrack(t))
    .sort((a, b) => a.order - b.order);
}
export function questionsForScope(scope) {
  return modulesForScope(scope).flatMap((m) => questionsForTopic(m.id));
}

// --- 4. Examengewichten afleiden (proportioneel aan vraagaantal; overrides uit config) ---
function deriveWeights() {
  const overrides = CONFIG.content.moduleWeightOverrides ?? {};
  const counts = {};
  let total = 0;
  for (const m of modules) {
    const override = overrides[m.id];
    const n = override !== undefined ? 0 : questionsForTopic(m.id).length;
    counts[m.id] = n;
    total += n;
  }
  for (const m of modules) {
    const override = overrides[m.id];
    m.examWeight = override !== undefined ? override : total > 0 ? counts[m.id] / total : 0;
  }
}
deriveWeights();

// --- Examentips (coaching) — ingesloten in het app-bestand ---
export const tips = appData.tips ?? [];
export const tipById = Object.fromEntries(tips.map((t) => [t.id, t]));

// --- Achievements ---
export const achievements = achievementsData.achievements ?? [];
