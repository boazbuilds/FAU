import { writable } from 'svelte/store';
import { load, save } from '../lib/storage.js';

// Writable store die zichzelf synct met localStorage.
export function persistentStore(key, initial) {
  const store = writable(load(key, initial));
  store.subscribe((value) => save(key, value));
  return store;
}
