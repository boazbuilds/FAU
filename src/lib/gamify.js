// XP, levels, league, levens, streak en achievements. Grotendeels pure helpers.
import { CONFIG } from '../config.js';
import { todayNumber, weekNumber } from './day.js';
import { achievements as achievementDefs } from './content.js';

function uuid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {
    /* fallback */
  }
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function levelFromXp(xp) {
  return Math.floor((Math.sqrt(1 + (8 * xp) / 100) - 1) / 2) + 1;
}

// Minimale XP om een level te bereiken (inverse van levelFromXp).
export function xpForLevel(level) {
  return Math.ceil((Math.pow(2 * level - 1, 2) - 1) * 100 / 8);
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - cur);
  return { level, intoLevel: xp - cur, span, toNext: next - xp, pct: Math.min(1, (xp - cur) / span) };
}

const LEAGUES = [
  { id: 'brons', label: 'Brons', minLevel: 1, color: '#b45309' },
  { id: 'zilver', label: 'Zilver', minLevel: 4, color: '#94a3b8' },
  { id: 'goud', label: 'Goud', minLevel: 8, color: '#eab308' },
  { id: 'platina', label: 'Platina', minLevel: 13, color: '#22d3ee' },
  { id: 'diamant', label: 'Diamant', minLevel: 20, color: '#818cf8' }
];

export function leagueFromLevel(level) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (level >= l.minLevel) league = l;
  return league;
}

export function difficultyMultiplier(difficulty) {
  return CONFIG.difficultyMultiplier[difficulty] ?? 1;
}

export function xpForAnswer(result, difficulty) {
  const base = CONFIG.xpPerCorrect * difficultyMultiplier(difficulty);
  if (result === 'correct') return Math.round(base);
  if (result === 'partial') return Math.round(base * CONFIG.partialXpFactor);
  return 0;
}

export function defaultProfile() {
  const today = todayNumber();
  return {
    v: 2,
    userId: uuid(),
    xp: 0,
    hearts: CONFIG.maxHearts,
    heartsUpdatedAt: Date.now(),
    streak: { current: 0, longest: 0, lastActiveDay: null, freezesOwned: 1 },
    dailyGoalXp: CONFIG.defaultDailyGoalXp,
    today: { day: today, xp: 0, answered: 0, correct: 0, sessions: 0 },
    week: { weekKey: weekNumber(), xp: 0, bestXp: 0 },
    totals: { answered: 0, correct: 0, sessions: 0 },
    achievements: {},
    blitz: { best: 0, lastScore: 0, plays: 0 },
    deadlineBonus: 0, // +punt op het geschatte instellingstoets-cijfer (DEADLINE voltooid)
    createdAt: today
  };
}

// Idempotente migratie van een bestaand profiel naar v2. load() deep-merge't niet.
export function migrateProfile(profile) {
  if (!profile) return defaultProfile();
  if (!profile.userId) profile.userId = uuid();
  if (!profile.week) profile.week = { weekKey: weekNumber(), xp: 0, bestXp: 0 };
  if (!profile.blitz) profile.blitz = { best: 0, lastScore: 0, plays: 0 };
  if (profile.deadlineBonus == null) profile.deadlineBonus = 0;
  if ((profile.v ?? 1) < 2) profile.v = 2;
  return profile;
}

// Vul levens lui aan op basis van verstreken tijd.
export function regenHearts(profile, now = Date.now()) {
  const max = CONFIG.maxHearts;
  if (profile.hearts >= max) {
    profile.heartsUpdatedAt = now;
    return profile;
  }
  const ms = CONFIG.heartRegenHours * 3600 * 1000;
  const elapsed = now - (profile.heartsUpdatedAt ?? now);
  const gained = Math.floor(elapsed / ms);
  if (gained > 0) {
    profile.hearts = Math.min(max, profile.hearts + gained);
    profile.heartsUpdatedAt =
      profile.hearts >= max ? now : (profile.heartsUpdatedAt ?? now) + gained * ms;
  }
  return profile;
}

export function msUntilNextHeart(profile, now = Date.now()) {
  if (profile.hearts >= CONFIG.maxHearts) return 0;
  const ms = CONFIG.heartRegenHours * 3600 * 1000;
  const elapsed = now - (profile.heartsUpdatedAt ?? now);
  return Math.max(0, ms - (elapsed % ms));
}

// Nieuwe dag: reset 'today' en breek de streak bij een hele gemiste dag (met freeze-buffer).
export function reconcileDay(profile, today = todayNumber(), thisWeek = weekNumber()) {
  if (profile.today?.day !== today) {
    profile.today = { day: today, xp: 0, answered: 0, correct: 0, sessions: 0 };
  }
  // Weekbucket rollen (voor het latere leaderboard).
  if (!profile.week) profile.week = { weekKey: thisWeek, xp: 0, bestXp: 0 };
  if (profile.week.weekKey !== thisWeek) {
    profile.week.bestXp = Math.max(profile.week.bestXp ?? 0, profile.week.xp ?? 0);
    profile.week = { weekKey: thisWeek, xp: 0, bestXp: profile.week.bestXp };
  }
  const last = profile.streak?.lastActiveDay;
  if (last != null) {
    const gap = today - last;
    if (gap === 2 && (profile.streak.freezesOwned ?? 0) > 0) {
      profile.streak.freezesOwned -= 1;
      profile.streak.lastActiveDay = today - 1; // buffer één dag
    } else if (gap >= 2) {
      profile.streak.current = 0;
    }
  }
  return profile;
}

// Roep aan nadat XP is bijgeschreven: verhoog de streak als het dagdoel is gehaald.
export function registerGoalProgress(profile, today = todayNumber()) {
  if (profile.today.xp >= profile.dailyGoalXp && profile.streak.lastActiveDay !== today) {
    profile.streak.current =
      profile.streak.lastActiveDay === today - 1 ? (profile.streak.current ?? 0) + 1 : 1;
    profile.streak.lastActiveDay = today;
    profile.streak.longest = Math.max(profile.streak.longest ?? 0, profile.streak.current);
  }
  return profile;
}

// Bepaal nieuw vrijgespeelde achievements. Muteert profile.achievements.
export function evaluateAchievements(profile, opts = {}, today = todayNumber()) {
  const {
    predictResult = null,
    perfectSession = false,
    bossPassed = false,
    bossPerfect = false
  } = opts;
  const unlocked = [];
  const has = (id) => !!profile.achievements[id];
  const give = (id) => {
    if (!has(id)) {
      profile.achievements[id] = today;
      unlocked.push(id);
    }
  };

  if ((profile.totals.sessions ?? 0) >= 1) give('first-session');
  if ((profile.streak.current ?? 0) >= 3) give('streak-3');
  if ((profile.streak.current ?? 0) >= 7) give('streak-7');
  if ((profile.totals.answered ?? 0) >= 100) give('centurion');
  if (perfectSession) give('perfect-session');
  if (bossPassed) give('module-complete');
  if (bossPerfect) give('boss-flawless');
  if (predictResult && predictResult.enoughData && predictResult.pPass >= 0.8) give('exam-ready');

  return unlocked.map((id) => achievementDefs.find((a) => a.id === id)).filter(Boolean);
}
