// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ratings, rateQuestion } from '../stores/ratings.js';
import { questionWeight, RATING_WEIGHT, buildBossSession } from './session.js';

beforeEach(() => {
  localStorage.clear();
  ratings.set({});
});

describe('vraag-beoordelingen', () => {
  it('rateQuestion zet, toggelt en wisselt', () => {
    rateQuestion('q1', 'down');
    expect(get(ratings).q1).toBe('down');
    rateQuestion('q1', 'down'); // zelfde nogmaals = weer neutraal
    expect(get(ratings).q1).toBeUndefined();
    rateQuestion('q1', 'up');
    expect(get(ratings).q1).toBe('up');
  });

  it('questionWeight: down telt veel minder mee dan neutraal/up', () => {
    expect(questionWeight('x', {})).toBe(1);
    expect(questionWeight('x', { x: 'down' })).toBe(RATING_WEIGHT.down);
    expect(questionWeight('x', { x: 'up' })).toBe(RATING_WEIGHT.up);
    expect(questionWeight('x', { x: 'down' })).toBeLessThan(questionWeight('x', {}));
  });

  it('een down-vraag komt veel minder vaak in de boss-selectie dan een neutrale', () => {
    const ids = buildBossSession('m0');
    const downId = ids[0];
    const neutralId = ids[1];
    rateQuestion(downId, 'down');
    let downHits = 0;
    let neutralHits = 0;
    const runs = 300;
    for (let i = 0; i < runs; i++) {
      const s = buildBossSession('m0', 6);
      if (s.includes(downId)) downHits++;
      if (s.includes(neutralId)) neutralHits++;
    }
    // groot, stabiel verschil: down verschijnt veel minder vaak
    expect(downHits).toBeLessThan(neutralHits);
  });
});
