import { describe, it, expect } from 'vitest';
import { QUEST_POOL, dailyQuests, questProgress, rollChest } from './quests.js';

describe('dagmissies', () => {
  it('drie unieke missies per dag, deterministisch en roterend', () => {
    expect(dailyQuests(100).map((q) => q.id)).toEqual(dailyQuests(100).map((q) => q.id));
    for (let day = 0; day < 10; day++) {
      expect(new Set(dailyQuests(day).map((q) => q.id)).size).toBe(3); // altijd 3 verschillende
    }
    expect(dailyQuests(1).map((q) => q.id)).not.toEqual(dailyQuests(2).map((q) => q.id));
  });

  it('questProgress: voortgang, cap op het doel en done-vlag', () => {
    const q = QUEST_POOL.find((x) => x.id === 'answer20');
    expect(questProgress(q, { answered: 7 })).toEqual({ value: 7, done: false, pct: 0.35 });
    expect(questProgress(q, { answered: 50 })).toEqual({ value: 20, done: true, pct: 1 }); // gecapt
    expect(questProgress(q, {})).toEqual({ value: 0, done: false, pct: 0 }); // ontbrekende teller
    const combo = QUEST_POOL.find((x) => x.id === 'combo5');
    expect(questProgress(combo, { bestCombo: 5 }).done).toBe(true);
  });

  it('rollChest: 20–60 XP, freeze-kans stuurbaar via rand', () => {
    expect(rollChest(() => 0)).toEqual({ xp: 20, freeze: true }); // 0 < 0.3
    expect(rollChest(() => 0.999)).toEqual({ xp: 60, freeze: false });
    for (let i = 0; i < 100; i++) {
      const r = rollChest();
      expect(r.xp).toBeGreaterThanOrEqual(20);
      expect(r.xp).toBeLessThanOrEqual(60);
      expect(typeof r.freeze).toBe('boolean');
    }
  });
});
