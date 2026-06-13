// Auth- en sync-acties tegen Supabase. Alles is veilig wanneer online uit staat
// (functies geven dan netjes op). De zware logica (mergeSnapshot) is los getest.
import { get } from 'svelte/store';
import { getClient, isConfigured } from './online.js';
import { auth } from '../../stores/auth.js';
import { mergeSnapshot } from './merge.js';
import { readLocal, writeLocal } from './snapshot.js';

// Voorkomt dat de UI eindeloos op "..." blijft hangen als het netwerk of Supabase
// niet reageert (bv. een slapend free-tier-project): faal na een tijdje netjes.
// Wordt om ELKE netwerk-aanroep gezet (auth én database), zodat geen enkele stap
// het inloggen kan laten vastlopen. Geëxporteerd zodat de time-out testbaar is.
export function withTimeout(promise, ms = 12000, msg = 'De server reageert niet. Probeer het opnieuw of speel als gast.') {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(msg)), ms);
  });
  // Promise.resolve adopteert ook Supabase' thenable query-builders; clearTimeout
  // ruimt de timer op zodra de echte aanroep klaar is (settled).
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(t)), timeout]);
}

// 'player_data' = privé voortgang (alleen jij). 'players' = publiek mini-profiel
// (gebruikersnaam + totaal-XP) voor de globale aller-tijden-ranglijst.
export async function signUp(email, password, username) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { data, error } = await withTimeout(c.auth.signUp({ email, password }));
  if (error) throw error;
  // Direct ingelogd? Dan meteen een spelersrij met username aanmaken — maar dit mag
  // het inloggen nooit blokkeren: de sessie bestaat al, de ranglijst-rij is bijzaak.
  if (data?.session?.user) {
    try {
      await upsertPlayer(data.session.user.id, readLocal(), username);
    } catch {
      /* ranglijst-rij komt later vanzelf goed via loginSync */
    }
  }
  return data;
}

export async function signIn(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { error } = await withTimeout(c.auth.signInWithPassword({ email, password }));
  if (error) throw error;
}

export async function signOut() {
  const c = await getClient();
  if (c) await withTimeout(c.auth.signOut());
}

// Gast met een naam: een anonieme sessie (echte auth.users-rij) zodat de gast
// meteen meedoet op de ranglijst. Vereist 'Anonymous sign-ins' aan in Supabase;
// staat dat uit, dan gooit dit een fout en valt de UI terug op een lokale gast.
export async function signInAnonymously(username) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { data, error } = await withTimeout(c.auth.signInAnonymously());
  if (error) throw error;
  // Meteen een spelersrij met de gekozen naam (zodat de gast op de ranglijst komt).
  // Best-effort: een mislukte ranglijst-rij mag de gast-sessie niet tegenhouden.
  if (data?.session?.user) {
    try {
      await upsertPlayer(data.session.user.id, readLocal(), username);
    } catch {
      /* gast is ingelogd; ranglijst-rij volgt later */
    }
  }
  return data;
}

// Een gast (anonieme sessie) omzetten naar een vast account met e-mail/wachtwoord.
// De gebruikers-id blijft gelijk, dus voortgang én ranglijstplek blijven behouden.
export async function upgradeGuest(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { error } = await withTimeout(c.auth.updateUser({ email, password }));
  if (error) throw error;
}

export async function pullCloud(userId) {
  const c = await getClient();
  if (!c) return null;
  const { data, error } = await withTimeout(c.from('player_data').select('data').eq('id', userId).maybeSingle());
  if (error) throw error;
  return data?.data ?? null;
}

async function upsertPlayer(userId, snapshot, username) {
  const c = await getClient();
  if (!c) return;
  const now = new Date().toISOString();
  // 1) Privé voortgang.
  const r1 = await withTimeout(c.from('player_data').upsert({ id: userId, data: snapshot, updated_at: now }));
  if (r1.error) throw r1.error;
  // 2) Publiek mini-profiel voor de ranglijst: het totaal-XP aller tijden.
  const pub = {
    id: userId,
    total_xp: snapshot?.profile?.xp ?? 0,
    updated_at: now
  };
  if (username) pub.username = username;
  const r2 = await withTimeout(c.from('players').upsert(pub));
  if (r2.error) throw r2.error;
}

// Pas pushen NADAT de eerste cloud↔lokaal-merge klaar is. Anders schiet een vroege
// push (de store-subscriptions vuren al bij mount) de nog-niet-gemergede lokale staat
// naar de cloud en overschrijft die de cloud-voortgang.
let synced = false;
export function resetSync() {
  synced = false;
}

// Bij inloggen: cloud ophalen, samenvoegen met lokaal, terugschrijven en pushen.
// Veerkrachtig: lukt het ophalen niet (netwerk/Supabase traag), dan speelt de
// gebruiker deze sessie gewoon lokaal verder en pushen we NIET (synced blijft
// false → geen risico dat we de cloud-voortgang met lokaal overschrijven).
export async function loginSync() {
  const u = get(auth).user;
  if (!u || !isConfigured()) return;
  let cloud;
  try {
    cloud = await pullCloud(u.id);
  } catch {
    return; // cloud niet bereikbaar → lokaal verder, geen push (geen dataverlies)
  }
  const merged = mergeSnapshot(readLocal(), cloud);
  writeLocal(merged); // triggert schedulePush, maar synced=false → nog geen push
  try {
    await upsertPlayer(u.id, merged);
    synced = true; // pas NA een geslaagde push mogen wijzigingen meegepusht worden
  } catch {
    /* push mislukt → synced blijft false; volgende login/refresh probeert opnieuw */
  }
}

// Gedempte push bij wijzigingen (pas actief na de eerste merge).
let timer = null;
export function schedulePush() {
  const u = get(auth).user;
  if (!u || !isConfigured() || !synced) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    upsertPlayer(u.id, readLocal()).catch(() => {});
  }, 2500);
}
