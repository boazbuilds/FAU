import { describe, it, expect } from 'vitest';
import { buildQuickSession, buildBlitzSession, buildDeadlineSession } from './session.js';
import { estimateCijfer } from './predict.js';
import { questionById, allQuestions } from './content.js';
import { defaultProfile } from './gamify.js';
import { applyResult } from './srs.js';

const topicOf = (id) => questionById[id].topicId;
const isIns = (t) => /^ins/.test(t); // ins0–ins18 + insmock
const isBasis = (t) => /^m\d+$/.test(t); // m0–m9

describe('tentamen-scope (modi)', () => {
  it('buildQuickSession landelijk → alleen basis (m0–m9), geen casus/typen', () => {
    const ids = buildQuickSession({ items: {} }, 10, 'landelijk');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(isBasis(topicOf(id))).toBe(true);
      expect(['build', 'short']).not.toContain(questionById[id].type);
    }
  });

  it('buildQuickSession instelling → alleen ins-tracks', () => {
    const ids = buildQuickSession({ items: {} }, 10, 'instelling');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(isIns(topicOf(id))).toBe(true);
  });

  it('buildBlitzSession respecteert de scope', () => {
    for (const id of buildBlitzSession({ items: {} }, 20, 'landelijk')) expect(isBasis(topicOf(id))).toBe(true);
    for (const id of buildBlitzSession({ items: {} }, 20, 'instelling')) expect(isIns(topicOf(id))).toBe(true);
  });

  it('buildDeadlineSession = de leercurve-set (ins12–ins18, 100 vragen)', () => {
    const ids = buildDeadlineSession();
    expect(ids.length).toBe(100);
    for (const id of ids) expect(/^ins1[2-8]$/.test(topicOf(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length); // geen dubbele
  });
});

describe('estimateCijfer (instellingstoets)', () => {
  it('geeft een cijfer 1–10; zonder data hasData=false en bonus 0', () => {
    const g = estimateCijfer({ items: {} }, defaultProfile());
    expect(g.cijfer).toBeGreaterThanOrEqual(1);
    expect(g.cijfer).toBeLessThanOrEqual(10);
    expect(g.hasData).toBe(false);
    expect(g.bonus).toBe(0);
  });

  it('deadlineBonus telt als +1 punt, gemaximeerd op 10', () => {
    const base = estimateCijfer({ items: {} }, { deadlineBonus: 0 });
    const withBonus = estimateCijfer({ items: {} }, { deadlineBonus: 1 });
    expect(withBonus.bonus).toBe(1);
    expect(withBonus.cijfer).toBeCloseTo(Math.min(10, base.cijfer + 1), 5);
  });

  it('stijgt met goede antwoorden (mastery-gedreven) en blijft ≤ 10', () => {
    // Beheers de ins-modules door alles meermaals goed te beantwoorden.
    const items = {};
    let day = 0;
    for (const q of allQuestions.filter((qq) => isIns(qq.topicId))) {
      let it;
      for (let i = 0; i < 4; i++) it = applyResult(it, 'correct', day++);
      items[q.id] = it;
    }
    const empty = estimateCijfer({ items: {} }, { deadlineBonus: 0 });
    const good = estimateCijfer({ items }, { deadlineBonus: 0 });
    expect(good.hasData).toBe(true);
    expect(good.cijfer).toBeGreaterThan(empty.cijfer); // beheersing → hoger cijfer
    expect(good.cijfer).toBeLessThanOrEqual(10);
    // +1 bonus mag het cijfer nooit boven 10 tillen
    expect(estimateCijfer({ items }, { deadlineBonus: 1 }).cijfer).toBeLessThanOrEqual(10);
  });
});
