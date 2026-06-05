import { persistentStore } from './persistent.js';

// Tussenstand van de 100-vragen DEADLINE, zodat je 'm in stukjes kunt spelen en
// later verdergaat waar je was. pos = aantal beantwoord (= hervat-index).
export const deadlineState = persistentStore('deadline', { pos: 0, correct: 0, xp: 0 });
