// Voegt een lokale en een cloud-snapshot samen ZONDER voortgang te verliezen.
// Strategie: cumulatieve tellers -> max; voltooid/badges -> union; losse
// voorkeuren -> de nieuwste snapshot wint. Zo kan inloggen op een ander
// apparaat nooit je hoogste XP, je streak of voltooide lessen wegvagen.

const num = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);
const maxNum = (a, b) => Math.max(num(a), num(b));

// Generieke per-id merge van twee {id: record}-maps.
function mergeRecords(a = {}, b = {}, mergeOne) {
  const out = {};
  for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    out[id] = mergeOne(a?.[id], b?.[id]);
  }
  return out;
}

function pickPeriod(a, b, keyName) {
  a = a || {};
  b = b || {};
  if (a[keyName] === b[keyName]) {
    return {
      ...a,
      ...b,
      [keyName]: a[keyName] ?? b[keyName],
      xp: maxNum(a.xp, b.xp),
      answered: maxNum(a.answered, b.answered),
      correct: maxNum(a.correct, b.correct),
      sessions: maxNum(a.sessions, b.sessions)
    };
  }
  // Verschillende dag/week: neem de meest recente periode.
  return num(a[keyName]) >= num(b[keyName]) && a[keyName] != null ? a : b;
}

function mergeProfile(a = {}, b = {}, aNewer) {
  const newer = aNewer ? a : b;
  const older = aNewer ? b : a;
  return {
    ...older,
    ...newer, // de nieuwste snapshot wint voor losse velden (bv. dailyGoalXp)
    v: maxNum(a.v, b.v) || newer.v || 2,
    userId: a.userId || b.userId,
    xp: maxNum(a.xp, b.xp),
    streak: {
      current: maxNum(a.streak?.current, b.streak?.current),
      longest: maxNum(a.streak?.longest, b.streak?.longest),
      lastActiveDay: maxNum(a.streak?.lastActiveDay, b.streak?.lastActiveDay) || (newer.streak?.lastActiveDay ?? null)
    },
    totals: {
      answered: maxNum(a.totals?.answered, b.totals?.answered),
      correct: maxNum(a.totals?.correct, b.totals?.correct),
      sessions: maxNum(a.totals?.sessions, b.totals?.sessions)
    },
    today: pickPeriod(a.today, b.today, 'day'),
    week: pickPeriod(a.week, b.week, 'weekKey'),
    blitz: {
      best: maxNum(a.blitz?.best, b.blitz?.best), // hoogste highscore wint
      lastScore: (newer.blitz ?? older.blitz ?? {}).lastScore ?? 0,
      plays: maxNum(a.blitz?.plays, b.blitz?.plays)
    },
    achievements: { ...(a.achievements || {}), ...(b.achievements || {}) },
    unlockedAchievements: Array.from(
      new Set([...(a.unlockedAchievements ?? []), ...(b.unlockedAchievements ?? [])])
    )
  };
}

const mergeLesson = (x = {}, y = {}) => ({
  completed: !!(x.completed || y.completed),
  stars: maxNum(x.stars, y.stars),
  bestScore: maxNum(x.bestScore, y.bestScore),
  attempts: maxNum(x.attempts, y.attempts),
  completedOn: x.completedOn ?? y.completedOn ?? null
});

const mergeModule = (x = {}, y = {}) => ({
  completed: !!(x.completed || y.completed),
  bossPassed: !!(x.bossPassed || y.bossPassed),
  bestScore: maxNum(x.bestScore, y.bestScore),
  attempts: maxNum(x.attempts, y.attempts)
});

function mergeProgress(a = {}, b = {}) {
  return {
    v: maxNum(a.v, b.v) || 1,
    lessons: mergeRecords(a.lessons, b.lessons, mergeLesson),
    modules: mergeRecords(a.modules, b.modules, mergeModule)
  };
}

// Per SRS-item: het verst geleerde (hoogste box) wint; bij gelijke box de
// eerstvolgende review (kleinste due).
function mergeItem(x, y) {
  if (!x) return y;
  if (!y) return x;
  if (num(x.box) !== num(y.box)) return num(x.box) > num(y.box) ? x : y;
  return num(x.due) <= num(y.due) ? x : y;
}

function mergeSrs(a = {}, b = {}) {
  return { items: mergeRecords(a.items, b.items, mergeItem) };
}

export function mergeSnapshot(local, cloud) {
  if (!cloud) return local ?? null;
  if (!local) return cloud;
  const aNewer = num(local.updatedAt) >= num(cloud.updatedAt);
  return {
    v: 1,
    updatedAt: Math.max(num(local.updatedAt), num(cloud.updatedAt)),
    profile: mergeProfile(local.profile, cloud.profile, aNewer),
    progress: mergeProgress(local.progress, cloud.progress),
    srs: mergeSrs(local.srs, cloud.srs),
    ratings: aNewer
      ? { ...(cloud.ratings || {}), ...(local.ratings || {}) }
      : { ...(local.ratings || {}), ...(cloud.ratings || {}) }
  };
}
