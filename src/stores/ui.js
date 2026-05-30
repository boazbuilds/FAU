import { writable } from 'svelte/store';

// path | session | results | progress | predict | settings | cheatsheet | mistakes
export const screen = writable('home');

// Tijdens een sessie: { ids:[], mode, lessonId?, moduleId? }. Na afloop: { summary:{...} }.
export const activeSession = writable(null);

export function go(name) {
  screen.set(name);
}
