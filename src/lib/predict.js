// "Ga ik slagen?"-model. Eerlijk en transparant; alle knoppen staan in config.js.
import { CONFIG } from '../config.js';
import { topics, questionsForTopic } from './content.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Beheersing per topic + ruwe stats.
export function topicStats(srs) {
  const items = srs?.items ?? {};
  const P = CONFIG.predict;
  const out = {};

  for (const t of topics) {
    const qs = questionsForTopic(t.id);
    const total = qs.length;
    let seen = 0;
    let boxSum = 0;
    let recentCorrect = 0;
    let recentAttempts = 0;
    let attempts = 0;

    for (const q of qs) {
      const it = items[q.id];
      if (!it || !it.box) continue;
      seen++;
      boxSum += it.box;
      attempts += it.reps ?? 0;
      for (const h of it.history ?? []) {
        recentAttempts++;
        recentCorrect += h;
      }
    }

    const A = recentAttempts > 0 ? (recentCorrect + 1) / (recentAttempts + 2) : null; // Laplace
    const R = seen > 0 ? clamp01((boxSum / seen - 1) / (CONFIG.maxBox - 1)) : null;
    const C = total > 0 ? seen / total : 0;

    let mastery;
    if (seen === 0) {
      mastery = P.prior;
    } else {
      const a = A == null ? P.prior : A;
      const r = Math.max(R ?? 0, 0.001);
      const c = Math.max(C, 0.001);
      let m = Math.pow(a, P.expAccuracy) * Math.pow(r, P.expRetention) * Math.pow(c, P.expCoverage);
      m = (recentAttempts * m + P.pseudoCount * P.prior) / (recentAttempts + P.pseudoCount);
      mastery = clamp01(m);
    }

    out[t.id] = {
      total,
      seen,
      attempts,
      recentAccuracy: A ?? 0,
      retention: R ?? 0,
      coverage: C,
      mastery,
      weight: t.examWeight
    };
  }
  return out;
}

export function topicMasteryMap(srs) {
  const stats = topicStats(srs);
  const map = {};
  for (const id in stats) map[id] = stats[id].mastery;
  return map;
}

export function predict(srs) {
  const P = CONFIG.predict;
  const stats = topicStats(srs);

  let S = 0;
  let coverageSum = 0;
  let attempts = 0;
  let n = 0;
  for (const t of topics) {
    const s = stats[t.id];
    S += s.weight * s.mastery;
    coverageSum += s.coverage;
    attempts += s.attempts;
    n++;
  }
  const meanCoverage = n > 0 ? coverageSum / n : 0;

  const pPass = 1 / (1 + Math.exp(-P.k * (S - P.S0)));
  const confidence = clamp01(attempts / P.confidenceAttempts) * meanCoverage;
  const half = P.bandMax * (1 - confidence);
  const band = [clamp01(pPass - half), clamp01(pPass + half)];

  const weakest = topics
    .map((t) => {
      const s = stats[t.id];
      return {
        id: t.id,
        title: t.title,
        shortTitle: t.shortTitle ?? t.title,
        icon: t.icon,
        mastery: s.mastery,
        coverage: s.coverage,
        gain: t.examWeight * (CONFIG.masteryTarget - s.mastery)
      };
    })
    .sort((a, b) => b.gain - a.gain);

  return {
    S,
    pPass,
    band,
    confidence,
    attempts,
    enoughData: attempts >= P.minAttemptsForNumber,
    stats,
    weakest: weakest.slice(0, 3)
  };
}
