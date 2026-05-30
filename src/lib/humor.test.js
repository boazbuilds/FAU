import { describe, it, expect } from 'vitest';
import {
  jokes, praise, consolation, jokeOfTheDay, pick, randomFrom,
  praiseFor, comboMessage, resultQuip, motivation, motivationOfDay
} from './humor.js';

describe('humor', () => {
  it('jokeOfTheDay is deterministisch en geldig', () => {
    expect(jokeOfTheDay(42)).toBe(jokeOfTheDay(42));
    expect(jokes).toContain(jokeOfTheDay(7));
    expect(typeof jokeOfTheDay(0)).toBe('string');
  });

  it('pick is stabiel per seed, randomFrom geeft een element', () => {
    expect(pick(jokes, 3)).toBe(pick(jokes, 3));
    expect(jokes).toContain(randomFrom(jokes));
  });

  it('comboMessage alleen op mijlpalen', () => {
    expect(comboMessage(1)).toBeNull();
    expect(comboMessage(2)).toBeNull();
    expect(comboMessage(3)).toMatch(/3 op rij/);
    expect(comboMessage(5)).toMatch(/5 op rij/);
    expect(comboMessage(4)).toBeNull();
    expect(comboMessage(10)).toMatch(/10 op rij/);
  });

  it('praiseFor past bij het resultaat', () => {
    expect(praise).toContain(praiseFor('correct'));
    expect(praiseFor('partial')).toMatch(/Deels/);
    expect(consolation).toContain(praiseFor('wrong'));
  });

  it('heeft 25 unieke, niet-lege motivatie-quotes', () => {
    expect(motivation.length).toBe(25);
    expect(new Set(motivation).size).toBe(25); // allemaal uniek
    expect(motivation.every((q) => typeof q === 'string' && q.trim().length > 0)).toBe(true);
    // determinisme + geldige selectie
    expect(motivationOfDay(42)).toBe(motivationOfDay(42));
    expect(motivation).toContain(motivationOfDay(3));
  });

  it('resultQuip geeft altijd een string', () => {
    expect(typeof resultQuip({ perfect: true, isBoss: false, bossPassed: false, accuracy: 100 })).toBe('string');
    expect(typeof resultQuip({ perfect: false, isBoss: true, bossPassed: true, accuracy: 90 })).toBe('string');
    expect(typeof resultQuip({ perfect: false, isBoss: true, bossPassed: false, accuracy: 40 })).toBe('string');
    expect(typeof resultQuip({ perfect: false, isBoss: false, bossPassed: false, accuracy: 30 })).toBe('string');
  });
});
