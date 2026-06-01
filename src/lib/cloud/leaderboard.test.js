import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from './leaderboard.js';

describe('leaderboard — pure helper', () => {
  it('buildLeaderboard sorteert op totaal-XP (aller tijden) en markeert mij + rang', () => {
    const rows = [
      { id: 'a', username: 'Ann', total_xp: 10 },
      { id: 'me', username: 'Ik', total_xp: 40 },
      { id: 'b', username: 'Bo', total_xp: 40 }
    ];
    const board = buildLeaderboard(rows, 'me');
    expect(board[0].totalXp).toBe(40);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(board.find((r) => r.id === 'me').isMe).toBe(true);
    // gelijke XP → alfabetisch (Bo voor Ik)
    expect(board.slice(0, 2).map((r) => r.username)).toEqual(['Bo', 'Ik']);
  });

  it('mist total_xp → telt als 0; ontbrekende gebruikersnaam → "Speler"', () => {
    const board = buildLeaderboard([{ id: 'x' }], 'me');
    expect(board[0].totalXp).toBe(0);
    expect(board[0].username).toBe('Speler');
    expect(board[0].isMe).toBe(false);
  });

  it('lege/onbekende invoer geeft lege ranglijst', () => {
    expect(buildLeaderboard(null, 'me')).toEqual([]);
    expect(buildLeaderboard([], 'me')).toEqual([]);
  });
});
