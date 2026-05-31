import { describe, it, expect } from 'vitest';
import { applyResult, isDue } from './srs.js';
import { gradeShort, gradeMcq, gradeTrueFalse, matchFraction, gradeMatchResult, gradeMatch, normalize, buildScore, buildMaxPoints, gradeBuildResult } from './grading.js';
import { predict } from './predict.js';
import { levelFromXp, xpForAnswer, defaultProfile, migrateProfile } from './gamify.js';
import { modules, allQuestions, questionById, questionsForLesson, tips, tipById, isObjective } from './content.js';
import { buildBossSession } from './session.js';
import { defaultProgress, ensureInit, isLessonUnlocked, isModuleUnlocked, starsFor, completeLesson, recordBoss } from './progress.js';

describe('content loader (merge + normalisatie)', () => {
  it('merget alle losse vragenbestanden samen', () => {
    expect(modules.length).toBe(11); // m0–m9 + instellingstoets-module mi1
    expect(allQuestions.length).toBeGreaterThanOrEqual(473); // groeit als er content bijkomt
    expect(tips.length).toBe(22);
  });

  it('normaliseert multiple_choice naar mcq met letters', () => {
    const q = questionById['m0l1q1'];
    expect(q.type).toBe('mcq');
    expect(q.multi).toBe(false);
    expect(q.options[0].id).toBe('a');
    expect(q.correct).toEqual(['b']); // bron correct:1 -> 'b'
  });

  it('normaliseert matching naar match met pair-ids', () => {
    const q = questionById['m0l1q5'];
    expect(q.type).toBe('match');
    expect(q.pairs.length).toBeGreaterThan(1);
    expect(q.pairs[0].id).toBe('p0');
  });

  it('bevat geen invul-vragen meer (omgezet naar keuze/koppel)', () => {
    expect(allQuestions.some((q) => q.type === 'short')).toBe(false);
    // voorheen een fill_blank; nu meerkeuze
    expect(questionById['m0l1q4'].type).toBe('mcq');
  });

  it('normaliseert multi_select naar mcq multi', () => {
    const q = questionById['m2l1q4'];
    expect(q.type).toBe('mcq');
    expect(q.multi).toBe(true);
    expect(q.correct).toEqual(['a', 'b']); // bron correct:[0,1]
  });

  it('elke tipRef bestaat', () => {
    for (const q of allQuestions) {
      if (q.tipRef) expect(tipById[q.tipRef]).toBeTruthy();
    }
  });

  it('elke module heeft een boss-examen', () => {
    for (const m of modules) {
      expect(m.lessons.some((l) => l.boss)).toBe(true);
    }
  });

  it('module m9 (skeletten/instinkers) bestaat en heeft vragen', () => {
    const m9 = modules.find((m) => m.id === 'm9');
    expect(m9).toBeTruthy();
    expect(questionById['m9l1q1']).toBeTruthy(); // intro-les
    expect(questionById['m9lb1q01']).toBeTruthy(); // via bank9 toegevoegd
  });

  it('buildBossSession trekt een begrensde, objectieve subset', () => {
    const ids = buildBossSession('m3');
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(12);
    expect(new Set(ids).size).toBe(ids.length); // geen dubbele
    for (const id of ids) expect(isObjective(questionById[id])).toBe(true);
  });

  it('m7 heeft examWeight 0, kennismodules samen ~1', () => {
    const m7 = modules.find((m) => m.id === 'm7');
    expect(m7.examWeight).toBe(0);
    const sum = modules.reduce((s, m) => s + m.examWeight, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });
});

describe('grading', () => {
  it('mcq enkel en multi', () => {
    expect(gradeMcq({ correct: ['c'] }, ['c'])).toBe(true);
    expect(gradeMcq({ correct: ['a', 'b'] }, ['b', 'a'])).toBe(true); // volgorde-onafhankelijk
    expect(gradeMcq({ correct: ['a', 'b'] }, ['a'])).toBe(false);
  });

  it('short met synoniemen/fuzzy', () => {
    const q = { answer: { accept: ['waardering', 'de waardering'], minSimilarity: 0.85 } };
    expect(gradeShort(q, 'Waardering')).toBe(true);
    expect(gradeShort(q, 'bestaan')).toBe(false);
  });

  it('match: fractie, 3-weg en binair', () => {
    const q = { pairs: [{ id: 'p0' }, { id: 'p1' }, { id: 'p2' }, { id: 'p3' }] };
    expect(matchFraction(q, { p0: 'p0', p1: 'p1', p2: 'p2', p3: 'p3' })).toBe(1);
    expect(gradeMatch(q, { p0: 'p0', p1: 'p1', p2: 'p2', p3: 'p3' })).toBe(true);
    expect(gradeMatchResult(q, { p0: 'p0', p1: 'p1', p2: 'x', p3: 'x' })).toBe('partial'); // 0.5
    expect(gradeMatchResult(q, { p0: 'x', p1: 'x', p2: 'x', p3: 'x' })).toBe('wrong');
  });

  it('truefalse en normalize', () => {
    expect(gradeTrueFalse({ correct: true }, true)).toBe(true);
    expect(normalize('Détéctie, risico!')).toBe('detectie risico');
  });

  it('casus_bouw: punten, juist/verkeerd slot, instinker/afleider, partial-drempels', () => {
    const q = {
      type: 'build',
      blocks: [
        { id: 'b1', role: 'kern', slot: 's1', points: 3 },
        { id: 'b2', role: 'kern', slot: 's2', points: 2 },
        { id: 'i1', role: 'instinker' },
        { id: 'd1', role: 'afleider' }
      ]
    };
    expect(buildMaxPoints(q)).toBe(5);
    // alles juist → 1.0 → correct
    expect(buildScore(q, { b1: 's1', b2: 's2' })).toBe(1);
    expect(gradeBuildResult(q, { b1: 's1', b2: 's2' })).toBe('correct');
    // kern in verkeerd slot = halve punten: (1.5 + 2)/5 = 0.7 → partial
    expect(buildScore(q, { b1: 's2', b2: 's2' })).toBeCloseTo(0.7, 5);
    expect(gradeBuildResult(q, { b1: 's2', b2: 's2' })).toBe('partial');
    // instinker gekozen kapt 'correct' af op 'partial', ook al is de kern goed
    expect(gradeBuildResult(q, { b1: 's1', b2: 's2', i1: 's1' })).toBe('partial');
    // instinker/afleider leveren zelf 0 punten op
    expect(buildScore(q, { i1: 's1', d1: 's1' })).toBe(0);
    expect(gradeBuildResult(q, { i1: 's1' })).toBe('wrong');
    // niets geplaatst → 0 → wrong
    expect(buildScore(q, {})).toBe(0);
  });

  it('casus_bouw normaliseert naar type "build" met slots en blocks', () => {
    const q = questionById['mi1ceb'];
    expect(q).toBeTruthy();
    expect(q.type).toBe('build');
    expect(q.slots.length).toBeGreaterThanOrEqual(2);
    expect(q.blocks.some((b) => b.role === 'kern')).toBe(true);
    expect(q.blocks.some((b) => b.role === 'instinker')).toBe(true);
    expect(buildMaxPoints(q)).toBe(15);
  });

  it('buildBossSession gebruikt de expliciete Eindbaas-vraag van module mi1', () => {
    const ids = buildBossSession('mi1');
    expect(ids).toEqual(['mi1ceb']); // de casus_bouw, niet een willekeurige trekking
  });
});

describe('srs (Leitner)', () => {
  it('promoot bij goed, reset bij fout', () => {
    let it = applyResult(undefined, 'correct', 100);
    expect(it.box).toBe(2);
    it = applyResult(it, 'correct', 101);
    it = applyResult(it, 'wrong', 105);
    expect(it.box).toBe(1);
    expect(isDue(it, 105)).toBe(true);
  });
});

describe('progress (leerpad)', () => {
  const mods = modules;
  it('m0 en m7 zijn vroeg ontgrendeld; m3 niet', () => {
    const pr = ensureInit(defaultProgress(), mods);
    expect(isModuleUnlocked(pr, mods, 'm0')).toBe(true);
    expect(isModuleUnlocked(pr, mods, 'm7')).toBe(true);
    expect(isModuleUnlocked(pr, mods, 'm3')).toBe(false);
  });

  it('les 2 ontgrendelt na les 1; cascade na boss', () => {
    const pr = ensureInit(defaultProgress(), mods);
    const m0 = mods.find((m) => m.id === 'm0');
    const [l1, l2] = m0.lessons;
    expect(isLessonUnlocked(pr, mods, 'm0', l2.id)).toBe(false);
    completeLesson(pr, l1.id, 1, 0);
    expect(isLessonUnlocked(pr, mods, 'm0', l2.id)).toBe(true);
  });

  it('sterren-drempels', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.8)).toBe(2);
    expect(starsFor(0.5)).toBe(1);
  });

  it('recordBoss haalt drempel en ontgrendelt volgende module', () => {
    const pr = ensureInit(defaultProgress(), mods);
    const fail = recordBoss(pr, mods, 'm1', 0.5, 0);
    expect(fail.passed).toBe(false);
    const pass = recordBoss(pr, mods, 'm1', 0.9, 0);
    expect(pass.passed).toBe(true);
    expect(pass.unlockedModuleId).toBe('m2');
    expect(isModuleUnlocked(pr, mods, 'm2')).toBe(true);
  });
});

describe('gamify', () => {
  it('level stijgt met XP; XP-beloning schaalt met moeilijkheid', () => {
    expect(levelFromXp(1000)).toBeGreaterThan(levelFromXp(100));
    expect(xpForAnswer('correct', 3)).toBeGreaterThan(xpForAnswer('correct', 1));
    expect(xpForAnswer('wrong', 2)).toBe(0);
  });

  it('defaultProfile is v2 met userId en week', () => {
    const p = defaultProfile();
    expect(p.v).toBe(2);
    expect(p.userId).toBeTruthy();
    expect(p.week).toBeTruthy();
  });

  it('migreert een oud v1-profiel naar v2 zonder dataverlies', () => {
    const old = { v: 1, xp: 500, streak: { current: 4 }, today: {}, totals: {}, achievements: {} };
    const m = migrateProfile(old);
    expect(m.v).toBe(2);
    expect(m.xp).toBe(500); // bestaande data intact
    expect(m.userId).toBeTruthy();
    expect(m.week).toBeTruthy();
  });
});

describe('predict (Ga ik slagen?)', () => {
  it('lage kans zonder data, hoger met goede antwoorden', () => {
    const empty = predict({ items: {} });
    expect(empty.enoughData).toBe(false);

    const items = {};
    let day = 0;
    for (const q of allQuestions) {
      let it;
      for (let i = 0; i < 3; i++) it = applyResult(it, 'correct', day++);
      items[q.id] = it;
    }
    const good = predict({ items });
    expect(good.pPass).toBeGreaterThan(empty.pPass);
    expect(good.enoughData).toBe(true);
  });
});
