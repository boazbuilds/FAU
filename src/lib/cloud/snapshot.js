// Leest/schrijft alle synced lokale stores als één snapshot.
// Instellingen (geluid/muziek e.d.) blijven bewust apparaat-lokaal.
import { get } from 'svelte/store';
import { profile } from '../../stores/profile.js';
import { progress } from '../../stores/progressStore.js';
import { srs } from '../../stores/srsStore.js';
import { ratings } from '../../stores/ratings.js';

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
