// Stelt een dagsessie samen: due reviews + nieuwe items, door elkaar gehusseld.
import { get } from 'svelte/store';
import { CONFIG } from '../config.js';
import { allQuestions, questionsForTopic, questionsForLesson, isObjective, modules, questionsForScope, modulesForTrack } from './content.js';
import { isDue } from './srs.js';
import { todayNumber } from './day.js';
import { topicMasteryMap } from './predict.js';
import { ratings } from '../stores/ratings.js';
import { shuffle } from './shuffle.js';

// --- Eigen vraagbeoordelingen: 'down' komt veel minder vaak voorbij, 'up' iets vaker. ---
export const RATING_WEIGHT = { down: 0.12, up: 1.6 };
export function questionWeight(id, r) {
  const v = r?.[id];
  return v ? (RATING_WEIGHT[v] ?? 1) : 1;
}

// Hoort een vraag bij de kennis-fase? (ontbrekende phase ⇒ ja, backward compatible)
export function isKnowledge(q) {
  return !q.phase || q.phase === 'kennis';
}

// Trekt n items met gewogen kans (zonder teruglegging), o.b.v. de beoordelingen.
export function weightedSample(items, n, r = get(ratings)) {
  const pool = items.map((q) => ({ q, w: questionWeight(q.id, r) }));
  const out = [];
  while (pool.length && out.length < n) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let t = Math.random() * total;
    let idx = 0;
    while (idx < pool.length - 1 && (t -= pool[idx].w) > 0) idx++;
    out.push(pool.splice(idx, 1)[0].q);
  }
  return out;
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

  const r = get(ratings);
  const downRank = (id) => (r[id] === 'down' ? 1 : 0); // 'minder tonen' zakt naar onderen
  const due = allQuestions.filter((q) => isDue(items[q.id], today));
  due.sort(
    (a, b) =>
      downRank(a.id) - downRank(b.id) ||
      items[a.id].due - items[b.id].due ||
      items[a.id].box - items[b.id].box
  );

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
  return interleave(weightedSample(pool, length)).map((q) => q.id);
}

// Les: een wisselende selectie uit de lesvragen (rating-gewogen). Korte lessen
// tonen alles; grote lessen (door de extra banken) krijgen elke keer een andere,
// frisse set i.p.v. steeds dezelfde — minder herhaling, meer variatie.
export function buildLessonSession(lessonId, length = CONFIG.lessonLength) {
  const pool = questionsForLesson(lessonId);
  const n = Math.min(length ?? pool.length, pool.length);
  return weightedSample(pool, n).map((q) => q.id);
}

// Boss: heeft de module een expliciete boss-les met eigen vragen (bv. een
// casus_bouw-Eindbaas), gebruik dan díe vragen. Anders een wisselende,
// begrensde subset objectieve modulevragen (auto-boss, backward compatible).
export function buildBossSession(moduleId, length = CONFIG.path.bossLength) {
  const mod = modules.find((m) => m.id === moduleId);
  const bossLesson = mod?.lessons?.find((l) => l.boss);
  if (bossLesson && (bossLesson.questionIds?.length ?? 0) > 0) {
    return [...bossLesson.questionIds]; // expliciete Eindbaas-vragen, in volgorde
  }
  const pool = questionsForTopic(moduleId).filter(isObjective);
  return weightedSample(pool, length ?? pool.length).map((q) => q.id);
}

// Kennis-Blitz: ruime, rating-gewogen pool met alléén enkelvoudige multiple-choice
// (één-klik-antwoord) — geen multi-select, matching of typen, zodat de ronde snel
// blijft. Prioriteert SRS-due en zwakke topics, maar blijft gevarieerd. Lijst is
// lang genoeg dat de klok eerder op is dan de vragen.
export function buildBlitzSession(srs, length = CONFIG.blitz.poolSize, scope = 'instelling') {
  const items = srs?.items ?? {};
  const today = todayNumber();
  const pool = questionsForScope(scope).filter((q) => q.type === 'mcq' && !q.multi && isKnowledge(q));
  const mastery = topicMasteryMap(srs);
  // Trek gewogen (down-rated zakt weg), en sorteer dan zwakke topics + due eerst.
  const sample = weightedSample(pool, Math.min(length, pool.length));
  sample.sort((a, b) => {
    const dueA = isDue(items[a.id], today) ? 0 : 1;
    const dueB = isDue(items[b.id], today) ? 0 : 1;
    return dueA - dueB || (mastery[a.topicId] ?? 1) - (mastery[b.topicId] ?? 1);
  });
  return interleave(sample).map((q) => q.id);
}

// ⚡ Snel oefenen: random uit het gekozen tentamen (scope), zonder casus_bouw
// (type 'build', traag) en zonder fill_blank (type 'short', typen) — standaard uit.
export function buildQuickSession(srs, length = CONFIG.sessionLength, scope = 'instelling') {
  const pool = questionsForScope(scope).filter((q) => q.type !== 'build' && q.type !== 'short');
  return interleave(weightedSample(pool, Math.min(length, pool.length))).map((q) => q.id);
}

// ⏱️ DEADLINE: de leercurve-set (ins12–ins18, 100 vragen) als één lange toets.
// Objectief-eerst (tempo), casus_bouw achteraan; in vaste module-/lesvolgorde.
export function buildDeadlineSession() {
  const qs = modulesForTrack('leercurve').flatMap((m) => questionsForTopic(m.id));
  return [...qs.filter(isObjective), ...qs.filter((q) => !isObjective(q))].map((q) => q.id);
}

// Oefenen op een tag (bv. "St.520" of "typologie"); voor drills.
export function buildTagSession(tag, length = CONFIG.sessionLength) {
  const pool = allQuestions.filter((q) => (q.tags ?? []).includes(tag));
  return interleave(weightedSample(pool, length)).map((q) => q.id);
}
