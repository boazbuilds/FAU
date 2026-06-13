import { writable } from 'svelte/store';
import { persistentStore } from './persistent.js';
import { isConfigured, getClient } from '../lib/cloud/online.js';

// Online-account-status. ready=true zodra we weten of er iemand is ingelogd.
// Zonder online-config is er nooit een user en is alles meteen 'ready'.
export const auth = writable({ ready: !isConfigured(), user: null });

// Gast-modus: de app zonder account gebruiken. Voortgang blijft dan lokaal op dit
// apparaat (wordt niet in de cloud bewaard). Persistent, zodat een gast na een
// herlaad niet telkens opnieuw langs het inlogscherm hoeft.
export const guest = persistentStore('guest', false);

let started = false;
export async function initAuth() {
  if (started) return;
  started = true;
  if (!isConfigured()) {
    auth.set({ ready: true, user: null });
    return;
  }
  try {
    const c = await getClient();
    // Reageer op elke sessie-wijziging; dit vuurt in supabase-js v2 ook meteen de
    // INITIAL_SESSION, dus de gate gaat open zodra de sessie bekend is.
    c.auth.onAuthStateChange((_event, session) => {
      auth.set({ ready: true, user: session?.user ?? null });
    });
    // Backstop met time-out: nooit eindeloos op "Laden…" blijven hangen als
    // getSession niet terugkomt (bv. een token-refresh op een trage verbinding).
    // Lost het op als "geen sessie"; een echte sessie corrigeert via de listener.
    const { data } = await Promise.race([
      c.auth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 12000))
    ]);
    auth.set({ ready: true, user: data?.session?.user ?? null });
  } catch (e) {
    auth.set({ ready: true, user: null });
  }
}
