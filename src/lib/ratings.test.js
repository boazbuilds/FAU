// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ratings, rateQuestion } from '../stores/ratings.js';
import { questionWeight, RATING_WEIGHT, buildBossSession, buildLessonSession, buildBlitzSession, isKnowledge } from './session.js';
import { questionsForLesson, questionById, isObjective } from './content.js';
import { CONFIG } from '../config.js';

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

  it('les-sessie is begrensd en varieert bij een grote les', () => {
    // zoek een les met ruim meer vragen dan de limiet (de extra banken hebben die)
    const big = ['m5lb1', 'm6lb1', 'm7lb1', 'm5lb2'].find((id) => questionsForLesson(id).length > 12);
    expect(big).toBeTruthy();
    const a = buildLessonSession(big);
    const b = buildLessonSession(big);
    expect(a.length).toBeLessThanOrEqual(10); // begrensd door lessonLength
    expect(a.length).toBeGreaterThan(0);
    // twee trekkingen zijn (vrijwel zeker) niet identiek qua volgorde/selectie
    expect(a.join() === b.join()).toBe(false);
  });
});

describe('Kennis-Blitz pool', () => {
  it('isKnowledge: ontbrekende phase telt als kennis', () => {
    expect(isKnowledge({})).toBe(true);
    expect(isKnowledge({ phase: 'kennis' })).toBe(true);
    expect(isKnowledge({ phase: 'toepassing' })).toBe(false);
  });

  it('buildBlitzSession levert enkelvoudige mcq-kennisvragen (1 klik), begrensd en variërend', () => {
    const a = buildBlitzSession({ items: {} });
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(CONFIG.blitz.poolSize);
    // alleen enkelvoudige multiple-choice (één-klik): geen multi-select/matching/typen
    for (const id of a) {
      const q = questionById[id];
      expect(q.type).toBe('mcq');
      expect(q.multi).toBe(false);
      expect(isObjective(q)).toBe(true);
      expect(isKnowledge(q)).toBe(true);
    }
    // geen dubbele
    expect(new Set(a).size).toBe(a.length);
    // varieert tussen rondes
    const b = buildBlitzSession({ items: {} });
    expect(a.join() === b.join()).toBe(false);
  });
});
