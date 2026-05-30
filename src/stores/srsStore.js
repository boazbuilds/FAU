import { persistentStore } from './persistent.js';

export const srs = persistentStore('srs', { v: 1, items: {} });
