// Online-naad. Nu een no-op; later het enige bestand (naast storage.js) dat een
// backend/Supabase aanraakt. Nooit in de antwoord-loop aanroepen.
import { CONFIG } from '../config.js';

export function getIdentity(profile) {
  return { userId: profile?.userId ?? null, online: !!CONFIG.online.enabled };
}
