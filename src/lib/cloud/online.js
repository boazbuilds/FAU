// Gated Supabase-client. Zonder VITE_SUPABASE_URL/ANON_KEY is alles uit en
// blijft de app volledig lokaal werken. De SDK wordt pas (lazy) geladen als
// online geconfigureerd is, dus de gewone bundel blijft licht.
const URL = import.meta.env?.VITE_SUPABASE_URL;
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export function isConfigured() {
  return !!(URL && KEY);
}

let _client = null;
let _loading = null;
export async function getClient() {
  if (!isConfigured()) return null;
  if (_client) return _client;
  if (!_loading) {
    // Lazy import met time-out: als de (niet vooraf gecachte) Supabase-chunk niet
    // binnenkomt, blijft de app anders eindeloos hangen op "...".
    _loading = Promise.race([
      import('@supabase/supabase-js'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Verbinding maken duurde te lang.')), 12000))
    ])
      .then(({ createClient }) => {
        _client = createClient(URL, KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return _client;
      })
      .catch((e) => {
        _loading = null; // reset, zodat een volgende poging opnieuw probeert
        throw e;
      });
  }
  return _loading;
}
