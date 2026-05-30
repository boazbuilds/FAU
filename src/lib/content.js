// Laadt de content (los van de engine). Merge't Boaz' vragenbank-schema en normaliseert
// elke vraag naar de interne runtime-vorm die de engine/components al kennen.
// Vite bundelt de JSON bij de build in.
import baseData from '../../content/course/vragenbank.json';
import casusData from '../../content/course/vragenbankcasussen.json';
import techniekData from '../../content/course/vragenbanktechniek.json';
import extraData from '../../content/course/vragenbankextra.json';
import tipsData from '../../content/examtips.json';
import { CONFIG } from '../config.js';

// --- 1. Merge: base + extensies (per README-regel) ---
function mergeCourse(base, extensions) {
  const course = structuredClone(base);
  for (const ext of extensions) {
    const addLessons = ext.addLessonsToModule || {};
    for (const m of course.modules) {
      if (addLessons[m.id]) m.lessons.push(...structuredClone(addLessons[m.id]));
    }
    if (ext.addModules) course.modules.push(...structuredClone(ext.addModules));
  }
  course.modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return course;
}

// --- 2. Normaliseer een bronvraag naar de interne vorm ---
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
    tipRef: q.tipRef ?? null
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
    default:
      // onbekend type: laat door, maar markeer (validator vangt dit af)
      return { ...common, type: q.type };
  }
}

const OBJECTIVE_TYPES = new Set(['mcq', 'truefalse', 'short', 'match']);
export function isObjective(question) {
  return OBJECTIVE_TYPES.has(question.type);
}

// --- 3. Bouw de indexen ---
const course = mergeCourse(baseData, [casusData, techniekData, extraData]);

// Genereer per module een boss-examen. Virtueel: de boss-les heeft zelf geen
// vragen, maar buildBossSession() trekt een wisselende subset uit de modulepool
// (zo is elke poging anders en blijft de progressie spannend/verslavend).
for (const m of course.modules) {
  m.lessons = m.lessons ?? [];
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
  lessons: (m.lessons ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    casusIntro: l.casusIntro ?? null,
    boss: !!l.boss,
    questionIds: (l.questions ?? []).map((q) => q.id)
  }))
}));

// engine-alias: een "topic" == een module
export const topics = modules;
export const topicById = Object.fromEntries(modules.map((m) => [m.id, m]));
export const moduleById = topicById;

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

// --- Examentips ---
export const tips = tipsData.tips ?? [];
export const tipById = Object.fromEntries(tips.map((t) => [t.id, t]));

// --- Achievements ---
import achievementsData from '../../content/achievements.json';
export const achievements = achievementsData.achievements ?? [];
