import { writable } from 'svelte/store';

// home(modi-menu) | path | session | results | progress | predict | settings | cheatsheet | mistakes
export const screen = writable('home');

// Welke track toont het Pad-scherm: 'pad' (ins0–ins10) of 'leercurve' (ins12–ins18).
export const pathTrack = writable('pad');

// Tijdens een sessie: { ids:[], mode, lessonId?, moduleId? }. Na afloop: { summary:{...} }.
export const activeSession = writable(null);

export function go(name) {
  screen.set(name);
}
