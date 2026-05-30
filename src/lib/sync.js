// Online-naad. Nu een no-op; later het enige bestand (naast storage.js) dat een
// backend/Supabase aanraakt. Nooit in de antwoord-loop aanroepen.
import { CONFIG } from '../config.js';

export function getIdentity(profile) {
  return { userId: profile?.userId ?? null, online: !!CONFIG.online.enabled };
}

export async function pushProgress(_snapshot) {
  if (!CONFIG.online.enabled) return { ok: false, skipped: true };
  // later: naar backend sturen
  return { ok: false, skipped: true };
}

export async function pullLeaderboard() {
  if (!CONFIG.online.enabled || !CONFIG.online.weeklyLeaderboard) return [];
  // later: van backend halen
  return [];
}
