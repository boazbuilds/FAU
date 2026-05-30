import { persistentStore } from './persistent.js';
import { CONFIG } from '../config.js';

export function defaultSettings() {
  return {
    v: 1,
    heartsEnabled: true,
    newPerSession: CONFIG.newPerSession,
    sessionLength: CONFIG.sessionLength,
    reminderEnabled: false,
    reminderTime: '19:30',
    reducedMotion: false,
    sound: true,
    music: true
  };
}

export const settings = persistentStore('settings', defaultSettings());
