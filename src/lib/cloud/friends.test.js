import { describe, it, expect } from 'vitest';
import { friendCodeFor, normalizeCode, buildLeaderboard } from './friends.js';

describe('friends — pure helpers', () => {
  it('friendCodeFor is deterministisch en goed gevormd', () => {
    const a = friendCodeFor('user-123');
    expect(a).toBe(friendCodeFor('user-123')); // zelfde id → zelfde code
    expect(a).toMatch(/^FAU-[A-Z2-9]{5}$/); // formaat, geen 0/O/1/I
    expect(friendCodeFor('user-123')).not.toBe(friendCodeFor('user-124'));
  });

  it('verschillende ids geven (vrijwel altijd) verschillende codes', () => {
    const codes = new Set();
    for (let i = 0; i < 200; i++) codes.add(friendCodeFor('id-' + i));
    expect(codes.size).toBeGreaterThan(195); // nagenoeg uniek
  });

  it('normalizeCode is vergevingsgezind maar streng op lengte', () => {
    const code = friendCodeFor('abc');
    const body = code.slice(4);
    expect(normalizeCode(code.toLowerCase())).toBe(code);
    expect(normalizeCode(body)).toBe(code);
    expect(normalizeCode('FAU ' + body)).toBe(code);
    expect(normalizeCode('te-kort')).toBe(''); // geen 5 tekens
    expect(normalizeCode('')).toBe('');
  });

  it('buildLeaderboard sorteert op week-XP en markeert mij + rang', () => {
    const rows = [
      { id: 'a', username: 'Ann', week_xp: 10 },
      { id: 'me', username: 'Ik', week_xp: 40 },
      { id: 'b', username: 'Bo', week_xp: 40 }
    ];
    const board = buildLeaderboard(rows, 'me');
    expect(board[0].weekXp).toBe(40);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(board.find((r) => r.id === 'me').isMe).toBe(true);
    // gelijke week-XP → alfabetisch (Bo voor Ik)
    expect(board.slice(0, 2).map((r) => r.username)).toEqual(['Bo', 'Ik']);
  });

  it('lege/onbekende invoer geeft lege ranglijst', () => {
    expect(buildLeaderboard(null, 'me')).toEqual([]);
    expect(buildLeaderboard([], 'me')).toEqual([]);
  });
});
