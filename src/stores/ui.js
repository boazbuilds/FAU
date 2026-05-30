import { writable } from 'svelte/store';

// home | session | results | progress | predict | settings
export const screen = writable('home');

// Tijdens een sessie: { ids:[], mode:'normal'|'practice' }. Na afloop: { summary:{...} }.
export const activeSession = writable(null);

export function go(name) {
  screen.set(name);
}
