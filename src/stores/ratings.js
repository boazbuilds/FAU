import { persistentStore } from './persistent.js';

// Eigen beoordeling per vraag: 'up' (goede vraag) of 'down' (minder tonen).
// Neutrale vragen staan niet in de map. Wordt meegewogen in de selectie.
export const ratings = persistentStore('ratings', {});

// Zet een beoordeling; dezelfde waarde nogmaals = weer neutraal (toggle).
export function rateQuestion(id, value) {
  ratings.update((r) => {
    if (r[id] === value) delete r[id];
    else r[id] = value;
    return r;
  });
}
