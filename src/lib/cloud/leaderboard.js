// Globale aller-tijden-ranglijst, bovenop de Supabase-client (online.js) en de
// publieke 'players'-tabel (sync.js). Veilig wanneer online uit staat: alles
// geeft dan netjes op. De pure helper (buildLeaderboard) staat los zodat hij
// testbaar is zonder netwerk.
import { get } from 'svelte/store';
import { getClient, isConfigured } from './online.js';
import { auth } from '../../stores/auth.js';

// Hoeveel spelers we tonen. Ruim genoeg voor een leesbare lijst, klein genoeg
// om in één query op te halen.
const TOP_N = 100;

// ---- Pure helper (geen netwerk, getest in leaderboard.test.js) ----

// Ranglijst sorteren op totaal-XP (aller tijden), 'ik' markeren en de rang zetten.
// Gelijke XP → alfabetisch op gebruikersnaam, zodat de volgorde stabiel is.
export function buildLeaderboard(rows, myId) {
  return [...(rows || [])]
    .map((r) => ({
      id: r.id,
      username: r.username || 'Speler',
      totalXp: r.total_xp ?? 0,
      isMe: r.id === myId
    }))
    .sort((a, b) => b.totalXp - a.totalXp || a.username.localeCompare(b.username))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---- Netwerk-actie (gated) ----

function myId() {
  return get(auth).user?.id ?? null;
}

// Globale ranglijst: de top spelers op totaal-XP. Werkt ook als gast (alleen-lezen
// op de publieke 'players'-tabel); 'ik' wordt alleen gemarkeerd als je ingelogd bent.
export async function fetchLeaderboard() {
  if (!isConfigured()) return [];
  const c = await getClient();
  if (!c) return [];
  const { data: rows, error } = await c
    .from('players')
    .select('id, username, total_xp')
    .order('total_xp', { ascending: false })
    .limit(TOP_N);
  if (error) throw error;
  return buildLeaderboard(rows, myId());
}
