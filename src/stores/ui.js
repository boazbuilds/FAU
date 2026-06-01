import { writable } from 'svelte/store';
import { persistentStore } from './persistent.js';

// home(modi-menu) | path | session | blitz | deadline | results | progress | predict | settings | cheatsheet | mistakes
export const screen = writable('home');

// Gekozen tentamen: 'instelling' (ins-tracks) of 'landelijk' (basis m0–m9). Persistent.
export const examScope = persistentStore('examScope', 'instelling');

// Welke track toont het Pad-scherm: 'basis' (landelijk), 'pad' of 'leercurve'.
export const pathTrack = writable('pad');

// Tijdens een sessie: { ids:[], mode, lessonId?, moduleId? }. Na afloop: { summary:{...} }.
export const activeSession = writable(null);

export function go(name) {
  screen.set(name);
}
