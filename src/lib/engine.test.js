import { describe, it, expect } from 'vitest';
import { applyResult, isDue } from './srs.js';
import { gradeShort, gradeMcq, gradeTrueFalse, normalize, similarity } from './grading.js';
import { predict, topicStats } from './predict.js';
import { levelFromXp, xpForLevel, xpForAnswer } from './gamify.js';
import { allQuestions, topics } from './content.js';

describe('srs (Leitner)', () => {
  it('promoot een nieuw item naar box 2 bij goed', () => {
    const item = applyResult(undefined, 'correct', 100);
    expect(item.box).toBe(2);
    expect(item.due).toBe(101); // 100 + interval[2]=1
    expect(item.history).toEqual([1]);
    expect(item.reps).toBe(1);
  });

  it('reset naar box 1 bij fout en is meteen due', () => {
    let item = applyResult(undefined, 'correct', 100); // box 2
    item = applyResult(item, 'correct', 101); // box 3
    item = applyResult(item, 'wrong', 105);
    expect(item.box).toBe(1);
    expect(item.lapses).toBe(1);
    expect(item.due).toBe(105);
    expect(isDue(item, 105)).toBe(true);
  });

  it('loopt op tot maximaal box 5', () => {
    let item;
    let day = 0;
    for (let i = 0; i < 10; i++) item = applyResult(item, 'correct', day++);
    expect(item.box).toBe(5);
  });

  it('houdt de box gelijk bij deels', () => {
    let item = applyResult(undefined, 'correct', 0); // box 2
    item = applyResult(item, 'correct', 1); // box 3
    const before = item.box;
    item = applyResult(item, 'partial', 2);
    expect(item.box).toBe(before);
  });
});

describe('grading', () => {
  it('normaliseert diakrieten en leestekens', () => {
    expect(normalize('Détéctie, risico!')).toBe('detectie risico');
  });

  it('beoordeelt korte antwoorden met synoniemen en fuzzy match', () => {
    const q = { answer: { accept: ['detectierisico', 'detection risk'], minSimilarity: 0.85 } };
    expect(gradeShort(q, 'Detectierisico')).toBe(true);
    expect(gradeShort(q, 'detectie risico')).toBe(true); // klein verschil
    expect(gradeShort(q, 'het detectierisico')).toBe(true); // kernwoord aanwezig
    expect(gradeShort(q, 'inherent risico')).toBe(false);
    expect(gradeShort(q, '')).toBe(false);
  });

  it('beoordeelt mcq en waar/onwaar', () => {
    expect(gradeMcq({ correct: ['c'] }, ['c'])).toBe(true);
    expect(gradeMcq({ correct: ['c'] }, ['a'])).toBe(false);
    expect(gradeMcq({ correct: ['c'] }, [])).toBe(false);
    expect(gradeTrueFalse({ correct: true }, true)).toBe(true);
    expect(gradeTrueFalse({ correct: false }, true)).toBe(false);
  });

  it('similarity ligt tussen 0 en 1', () => {
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('abc', 'xyz')).toBeGreaterThanOrEqual(0);
    expect(similarity('abc', 'xyz')).toBeLessThan(0.5);
  });
});

describe('gamify', () => {
  it('level stijgt monotoon met XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(1000)).toBeGreaterThan(levelFromXp(100));
    expect(xpForLevel(levelFromXp(500))).toBeLessThanOrEqual(500);
  });

  it('geeft meer XP voor moeilijkere goede antwoorden', () => {
    expect(xpForAnswer('correct', 3)).toBeGreaterThan(xpForAnswer('correct', 1));
    expect(xpForAnswer('wrong', 3)).toBe(0);
    expect(xpForAnswer('partial', 2)).toBeGreaterThan(0);
  });
});

describe('predict (Ga ik slagen?)', () => {
  it('gebruikt de prior en toont geen percentage zonder data', () => {
    const p = predict({ items: {} });
    expect(p.enoughData).toBe(false);
    expect(p.pPass).toBeGreaterThan(0);
    expect(p.pPass).toBeLessThan(0.3); // prior 0.35 < S0 0.60 -> lage kans
    expect(p.weakest.length).toBe(Math.min(3, topics.length));
  });

  it('hogere beheersing verhoogt de slagingskans', () => {
    const items = {};
    let day = 0;
    // beantwoord elke vraag een paar keer goed -> hoge mastery
    for (const q of allQuestions) {
      let it;
      for (let i = 0; i < 4; i++) it = applyResult(it, 'correct', day++);
      items[q.id] = it;
    }
    const good = predict({ items });
    const empty = predict({ items: {} });
    expect(good.pPass).toBeGreaterThan(empty.pPass);
    expect(good.enoughData).toBe(true);
    expect(good.pPass).toBeGreaterThan(0.5);
  });
});
