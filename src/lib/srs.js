// Spaced repetition volgens Leitner (5 dozen). Pure functies, makkelijk te testen.
import { CONFIG } from '../config.js';
import { todayNumber } from './day.js';

export function newItemState() {
  return { box: 0, reps: 0, lapses: 0, due: 0, lastSeen: null, history: [], introduced: null };
}

// result: 'correct' | 'partial' | 'wrong'
export function applyResult(prev, result, today = todayNumber()) {
  const item = prev
    ? { ...prev, history: [...(prev.history ?? [])] }
    : newItemState();
  const isNew = !item.box;
  if (!item.introduced) item.introduced = today;
  item.reps = (item.reps ?? 0) + 1;

  if (result === 'correct') {
    item.box = isNew ? 2 : Math.min(item.box + 1, CONFIG.maxBox);
    item.history.push(1);
    item.due = today + CONFIG.intervals[item.box];
  } else if (result === 'partial') {
    item.box = isNew ? 1 : item.box;
    item.history.push(0.5);
    item.due = today + Math.max(1, Math.round(CONFIG.intervals[item.box] / 2));
  } else {
    if (item.box >= 3) item.lapses = (item.lapses ?? 0) + 1;
    item.box = 1;
    item.history.push(0);
    item.due = today; // meteen weer aan de beurt
  }

  if (item.history.length > CONFIG.historyCap) {
    item.history = item.history.slice(-CONFIG.historyCap);
  }
  item.lastSeen = today;
  return item;
}

export function isDue(item, today = todayNumber()) {
  return !!item && item.box > 0 && item.due <= today;
}
