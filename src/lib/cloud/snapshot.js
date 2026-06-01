// Leest/schrijft alle synced lokale stores als één snapshot.
// Instellingen (geluid/muziek e.d.) blijven bewust apparaat-lokaal.
import { get } from 'svelte/store';
import { profile } from '../../stores/profile.js';
import { progress } from '../../stores/progressStore.js';
import { srs } from '../../stores/srsStore.js';
import { ratings } from '../../stores/ratings.js';
import { defaultProfile } from '../gamify.js';
import { defaultProgress, ensureInit } from '../progress.js';
import { modules } from '../content.js';

export function readLocal() {
  return {
    v: 1,
    updatedAt: Date.now(),
    profile: get(profile),
    progress: get(progress),
    srs: get(srs),
    ratings: get(ratings)
  };
}

export function writeLocal(snap) {
  if (!snap) return;
  if (snap.profile) profile.set(snap.profile);
  if (snap.progress) progress.set(snap.progress);
  if (snap.srs) srs.set(snap.srs);
  if (snap.ratings) ratings.set(snap.ratings);
}

// Zet de voortgang terug op een schone start. Gebruikt wanneer iemand als nieuwe
// gast begint: die hoort op 0 te starten (eigen plek op de ranglijst), niet de
// voortgang van dit apparaat te erven. Een ingelogd account staat veilig in de
// cloud en komt terug door opnieuw in te loggen.
export function resetLocal() {
  profile.set(defaultProfile());
  progress.set(ensureInit(defaultProgress(), modules));
  srs.set({ v: 1, items: {} });
  ratings.set({});
}
