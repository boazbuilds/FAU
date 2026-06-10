// 🎯 Dagmissies: drie wisselende missies per dag (deterministisch op dagnummer),
// gelezen uit de bestaande dagtellers (profile.today). Alle drie gehaald → de
// schatkist met een variabele beloning (de verslavende kers op de taart).
import { todayNumber } from './day.js';

export const QUEST_POOL = [
  { id: 'answer20', icon: '🎯', label: 'Beantwoord 20 vragen', target: 20, value: (t) => t?.answered ?? 0 },
  { id: 'correct12', icon: '✅', label: '12 vragen goed', target: 12, value: (t) => t?.correct ?? 0 },
  { id: 'combo5', icon: '🔥', label: '5 goed op rij (combo)', target: 5, value: (t) => t?.bestCombo ?? 0 },
  { id: 'sessions2', icon: '📚', label: 'Rond 2 sessies af', target: 2, value: (t) => t?.sessions ?? 0 },
  { id: 'xp80', icon: '⚡', label: 'Verdien 80 XP', target: 80, value: (t) => t?.xp ?? 0 }
];

// Drie missies per dag; de offsets {0,1,3} zijn paarsgewijs verschillend mod 5,
// dus de drie zijn altijd uniek en de mix verschuift elke dag.
export function dailyQuests(day = todayNumber()) {
  const n = QUEST_POOL.length;
  const d = ((day % n) + n) % n;
  return [QUEST_POOL[d], QUEST_POOL[(d + 1) % n], QUEST_POOL[(d + 3) % n]];
}

export function questProgress(quest, today) {
  const value = Math.min(quest.target, quest.value(today));
  return { value, done: value >= quest.target, pct: value / quest.target };
}

// Schatkist: 20–60 XP, met 30% kans op een 🧊 streak-freeze erbovenop.
export function rollChest(rand = Math.random) {
  return { xp: 20 + Math.floor(rand() * 41), freeze: rand() < 0.3 };
}
