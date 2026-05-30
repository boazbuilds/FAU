// Auth- en sync-acties tegen Supabase. Alles is veilig wanneer online uit staat
// (functies geven dan netjes op). De zware logica (mergeSnapshot) is los getest.
import { get } from 'svelte/store';
import { getClient, isConfigured } from './online.js';
import { auth } from '../../stores/auth.js';
import { mergeSnapshot } from './merge.js';
import { readLocal, writeLocal } from './snapshot.js';

// 'player_data' = privé voortgang (alleen jij). 'players' = publiek mini-profiel
// (gebruikersnaam + week-XP) voor de latere vrienden-ranglijst.
export async function signUp(email, password, username) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) throw error;
  // Direct ingelogd? Dan meteen een spelersrij met username aanmaken.
  if (data?.session?.user) {
    await upsertPlayer(data.session.user.id, readLocal(), username);
  }
  return data;
}

export async function signIn(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Online staat uit (geen Supabase-config).');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const c = await getClient();
  if (c) await c.auth.signOut();
}

export async function pullCloud(userId) {
  const c = await getClient();
  if (!c) return null;
  const { data, error } = await c.from('player_data').select('data').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function upsertPlayer(userId, snapshot, username) {
  const c = await getClient();
  if (!c) return;
  const now = new Date().toISOString();
  // 1) Privé voortgang.
  const r1 = await c.from('player_data').upsert({ id: userId, data: snapshot, updated_at: now });
  if (r1.error) throw r1.error;
  // 2) Publiek mini-profiel voor de ranglijst.
  const pub = {
    id: userId,
    week_xp: snapshot?.profile?.week?.xp ?? 0,
    week_key: snapshot?.profile?.week?.weekKey ?? null,
    updated_at: now
  };
  if (username) pub.username = username;
  const r2 = await c.from('players').upsert(pub);
  if (r2.error) throw r2.error;
}

// Bij inloggen: cloud ophalen, samenvoegen met lokaal, terugschrijven en pushen.
export async function loginSync() {
  const u = get(auth).user;
  if (!u || !isConfigured()) return;
  const cloud = await pullCloud(u.id);
  const merged = mergeSnapshot(readLocal(), cloud);
  writeLocal(merged);
  await upsertPlayer(u.id, merged);
}

// Gedempte push bij wijzigingen (na inloggen geactiveerd).
let timer = null;
export function schedulePush() {
  const u = get(auth).user;
  if (!u || !isConfigured()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    upsertPlayer(u.id, readLocal()).catch(() => {});
  }, 2500);
}
