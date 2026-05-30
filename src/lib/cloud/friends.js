// Vrienden + ranglijst, bovenop de bestaande Supabase-client (online.js) en de
// publieke 'players'-tabel (sync.js). Veilig wanneer online uit staat: alles
// geeft dan netjes op. De pure helpers staan los zodat ze testbaar zijn.
import { get } from 'svelte/store';
import { getClient, isConfigured } from './online.js';
import { auth } from '../../stores/auth.js';

// ---- Pure helpers (geen netwerk, getest in friends.test.js) ----

// Leesbare vriendcode uit een user-id, bv. "FAU-7QK2". Deterministisch (zelfde
// id → zelfde code) en zonder verwarrende tekens (0/O/1/I). Zo hoeven we de code
// niet apart op te slaan: hij is af te leiden uit het bestaande id.
export function friendCodeFor(userId) {
  const alf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 tekens
  let h = 2166136261 >>> 0;
  for (const ch of String(userId || '')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += alf[h % alf.length];
    h = Math.floor(h / alf.length) || (Math.imul(h ^ (i + 1), 2654435761) >>> 0);
  }
  return 'FAU-' + code;
}

export function normalizeCode(input) {
  const c = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = c.startsWith('FAU') ? c.slice(3) : c;
  return body.length === 5 ? 'FAU-' + body : '';
}

// Ranglijst sorteren op week-XP (dan totaal-XP), 'ik' markeren en rang zetten.
export function buildLeaderboard(rows, myId) {
  return [...(rows || [])]
    .map((r) => ({
      id: r.id,
      username: r.username || 'Speler',
      weekXp: r.week_xp ?? 0,
      isMe: r.id === myId
    }))
    .sort((a, b) => b.weekXp - a.weekXp || a.username.localeCompare(b.username))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---- Netwerk-acties (gated) ----

function myId() {
  return get(auth).user?.id ?? null;
}

export function myFriendCode() {
  const id = myId();
  return id ? friendCodeFor(id) : null;
}

// Voeg een vriend toe op code. We matchen de code tegen alle spelers (de codes
// zijn deterministisch uit het id), dus we hoeven niets extra's op te slaan.
export async function addFriendByCode(input) {
  const code = normalizeCode(input);
  if (!code) throw new Error('Ongeldige code (formaat FAU-XXXXX).');
  const c = await getClient();
  if (!c) throw new Error('Online staat uit.');
  const me = myId();
  if (!me) throw new Error('Niet ingelogd.');

  const { data: players, error } = await c.from('players').select('id, username');
  if (error) throw error;
  const match = (players || []).find((p) => friendCodeFor(p.id) === code);
  if (!match) throw new Error('Geen speler met die code gevonden.');
  if (match.id === me) throw new Error('Dat is je eigen code 🙂');

  const { error: insErr } = await c
    .from('friendships')
    .upsert({ user_id: me, friend_id: match.id }, { onConflict: 'user_id,friend_id' });
  if (insErr) throw insErr;
  return { id: match.id, username: match.username };
}

export async function removeFriend(friendId) {
  const c = await getClient();
  if (!c) return;
  await c.from('friendships').delete().eq('user_id', myId()).eq('friend_id', friendId);
}

// Ranglijst: ikzelf + iedereen die ik heb toegevoegd, met hun publieke week-XP.
export async function fetchLeaderboard() {
  if (!isConfigured()) return [];
  const c = await getClient();
  const me = myId();
  if (!c || !me) return [];

  const { data: links, error: lErr } = await c.from('friendships').select('friend_id').eq('user_id', me);
  if (lErr) throw lErr;
  const ids = [me, ...(links || []).map((l) => l.friend_id)];

  const { data: rows, error: pErr } = await c.from('players').select('id, username, week_xp').in('id', ids);
  if (pErr) throw pErr;
  return buildLeaderboard(rows, me);
}
