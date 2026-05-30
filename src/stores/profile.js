import { persistentStore } from './persistent.js';
import { defaultProfile } from '../lib/gamify.js';

export const profile = persistentStore('profile', defaultProfile());
