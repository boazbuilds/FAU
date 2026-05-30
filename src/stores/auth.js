import { writable } from 'svelte/store';
import { isConfigured, getClient } from '../lib/cloud/online.js';

// Online-account-status. ready=true zodra we weten of er iemand is ingelogd.
// Zonder online-config is er nooit een user en is alles meteen 'ready'.
export const auth = writable({ ready: !isConfigured(), user: null });

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
    const { data } = await c.auth.getSession();
    auth.set({ ready: true, user: data?.session?.user ?? null });
    c.auth.onAuthStateChange((_event, session) => {
      auth.set({ ready: true, user: session?.user ?? null });
    });
  } catch (e) {
    auth.set({ ready: true, user: null });
  }
}
