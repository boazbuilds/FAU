import { persistentStore } from './persistent.js';
import { defaultProgress } from '../lib/progress.js';

export const progress = persistentStore('progress', defaultProgress());
