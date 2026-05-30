// Stelt een dagsessie samen: due reviews + nieuwe items, door elkaar gehusseld.
import { CONFIG } from '../config.js';
import { allQuestions, questionsForTopic, questionsForLesson, isObjective } from './content.js';
import { isDue } from './srs.js';
import { todayNumber } from './day.js';
import { topicMasteryMap } from './predict.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Husselt maar vermijdt dat twee opeenvolgende vragen van hetzelfde topic zijn.
function interleave(items) {
  const pool = shuffle(items);
  const result = [];
  while (pool.length) {
    let idx = pool.findIndex(
      (q) => !result.length || q.topicId !== result[result.length - 1].topicId
    );
    if (idx === -1) idx = 0;
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

export function dueCount(srs, today = todayNumber()) {
  const items = srs?.items ?? {};
  return allQuestions.filter((q) => isDue(items[q.id], today)).length;
}

export function buildSession(srs, opts = {}) {
  const length = opts.length ?? CONFIG.sessionLength;
  const newCount = opts.newCount ?? CONFIG.newPerSession;
  const today = todayNumber();
  const items = srs?.items ?? {};
  const seen = (id) => items[id] && items[id].box > 0;

  const due = allQuestions.filter((q) => isDue(items[q.id], today));
  due.sort((a, b) => items[a.id].due - items[b.id].due || items[a.id].box - items[b.id].box);

  const mastery = topicMasteryMap(srs);
  const fresh = allQuestions.filter((q) => !items[q.id]);
  fresh.sort(
    (a, b) => (mastery[a.topicId] ?? 1) - (mastery[b.topicId] ?? 1) || a.difficulty - b.difficulty
  );

  const nNew = Math.min(newCount, fresh.length);
  const picked = [];
  picked.push(...due.slice(0, Math.max(0, length - nNew)));
  picked.push(...fresh.slice(0, nNew));

  // backfill: eerst extra nieuwe, dan eerstvolgende toekomstige reviews
  if (picked.length < length) {
    picked.push(...fresh.slice(nNew, nNew + (length - picked.length)));
  }
  if (picked.length < length) {
    const chosen = new Set(picked.map((q) => q.id));
    const future = allQuestions
      .filter((q) => seen(q.id) && !chosen.has(q.id))
      .sort((a, b) => items[a.id].due - items[b.id].due);
    picked.push(...future.slice(0, length - picked.length));
  }

  return interleave(picked).map((q) => q.id);
}

// Oefensessie (herstel): bij voorkeur reeds geziene items; kost geen levens.
export function buildPracticeSession(srs, topicId = null, length = CONFIG.sessionLength) {
  const items = srs?.items ?? {};
  const base = topicId ? questionsForTopic(topicId) : allQuestions;
  let pool = base.filter((q) => items[q.id]);
  if (pool.length === 0) pool = base; // nog niets gezien: pak nieuwe
  return interleave(shuffle(pool).slice(0, length)).map((q) => q.id);
}

// Les: alle vragen van de les, geschud (één topic, dus geen interleave nodig).
export function buildLessonSession(lessonId) {
  return shuffle(questionsForLesson(lessonId)).map((q) => q.id);
}

// Boss: een wisselende, begrensde subset objectieve vragen uit de hele module.
// Elke poging is dus anders (variatie) en blijft kort/spannend.
export function buildBossSession(moduleId, length = CONFIG.path.bossLength) {
  const pool = questionsForTopic(moduleId).filter(isObjective);
  return shuffle(pool)
    .slice(0, length ?? pool.length)
    .map((q) => q.id);
}

// Oefenen op een tag (bv. "St.520" of "typologie"); voor drills.
export function buildTagSession(tag, length = CONFIG.sessionLength) {
  const pool = allQuestions.filter((q) => (q.tags ?? []).includes(tag));
  return interleave(shuffle(pool).slice(0, length)).map((q) => q.id);
}
