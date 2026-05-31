import { describe, it, expect } from 'vitest';
import { mergeSnapshot } from './merge.js';

const snap = (over = {}) => ({
  updatedAt: 1000,
  profile: { v: 2, userId: 'u', xp: 0, streak: { current: 0, longest: 0 }, totals: { answered: 0, correct: 0, sessions: 0 }, achievements: {}, unlockedAchievements: [] },
  progress: { v: 1, lessons: {}, modules: {} },
  srs: { items: {} },
  ratings: {},
  ...over
});

describe('mergeSnapshot — nooit voortgang verliezen', () => {
  it('null-gevallen: geeft de aanwezige kant terug', () => {
    const s = snap();
    expect(mergeSnapshot(s, null)).toBe(s);
    expect(mergeSnapshot(null, s)).toBe(s);
  });

  it('XP en totals nemen het maximum (geen verlies)', () => {
    const a = snap({ profile: { ...snap().profile, xp: 500, totals: { answered: 80, correct: 60, sessions: 9 } } });
    const b = snap({ profile: { ...snap().profile, xp: 300, totals: { answered: 120, correct: 50, sessions: 4 } } });
    const m = mergeSnapshot(a, b);
    expect(m.profile.xp).toBe(500);
    expect(m.profile.totals.answered).toBe(120); // hoogste per teller
    expect(m.profile.totals.correct).toBe(60);
  });

  it('streak neemt het hoogste', () => {
    const a = snap({ profile: { ...snap().profile, streak: { current: 3, longest: 7 } } });
    const b = snap({ profile: { ...snap().profile, streak: { current: 5, longest: 5 } } });
    const m = mergeSnapshot(a, b);
    expect(m.profile.streak.current).toBe(5);
    expect(m.profile.streak.longest).toBe(7);
  });

  it('voltooide lessen = union; sterren = max', () => {
    const a = snap({ progress: { v: 1, lessons: { m0l1: { completed: true, stars: 2 } }, modules: {} } });
    const b = snap({ progress: { v: 1, lessons: { m0l1: { completed: false, stars: 3 }, m0l2: { completed: true, stars: 1 } }, modules: {} } });
    const m = mergeSnapshot(a, b);
    expect(m.progress.lessons.m0l1.completed).toBe(true);
    expect(m.progress.lessons.m0l1.stars).toBe(3);
    expect(m.progress.lessons.m0l2.completed).toBe(true);
  });

  it('boss passed = union over modules', () => {
    const a = snap({ progress: { v: 1, lessons: {}, modules: { m0: { bossPassed: true, completed: true } } } });
    const b = snap({ progress: { v: 1, lessons: {}, modules: { m0: { bossPassed: false, completed: false } } } });
    expect(mergeSnapshot(a, b).progress.modules.m0.bossPassed).toBe(true);
  });

  it('SRS: hoogste box wint', () => {
    const a = snap({ srs: { items: { q1: { box: 4, due: 20 } } } });
    const b = snap({ srs: { items: { q1: { box: 2, due: 5 }, q2: { box: 1, due: 3 } } } });
    const m = mergeSnapshot(a, b);
    expect(m.srs.items.q1.box).toBe(4);
    expect(m.srs.items.q2.box).toBe(1);
  });

  it('badges en ratings worden samengevoegd', () => {
    const a = snap({ profile: { ...snap().profile, unlockedAchievements: ['streak3'] }, ratings: { q1: 'down' } });
    const b = snap({ profile: { ...snap().profile, unlockedAchievements: ['perfect'] }, ratings: { q2: 'up' } });
    const m = mergeSnapshot(a, b);
    expect(new Set(m.profile.unlockedAchievements)).toEqual(new Set(['streak3', 'perfect']));
    expect(m.ratings).toEqual({ q1: 'down', q2: 'up' });
  });

  it('losse voorkeur (dailyGoalXp): nieuwste snapshot wint', () => {
    const a = snap({ updatedAt: 2000, profile: { ...snap().profile, dailyGoalXp: 80 } });
    const b = snap({ updatedAt: 1000, profile: { ...snap().profile, dailyGoalXp: 30 } });
    expect(mergeSnapshot(a, b).profile.dailyGoalXp).toBe(80);
    expect(mergeSnapshot(b, a).profile.dailyGoalXp).toBe(80);
  });

  it('blitz-highscore: het hoogste wint over apparaten', () => {
    const a = snap({ profile: { ...snap().profile, blitz: { best: 120, lastScore: 120, plays: 3 } } });
    const b = snap({ profile: { ...snap().profile, blitz: { best: 200, lastScore: 50, plays: 5 } } });
    const m = mergeSnapshot(a, b);
    expect(m.profile.blitz.best).toBe(200);
    expect(m.profile.blitz.plays).toBe(5);
  });
});
