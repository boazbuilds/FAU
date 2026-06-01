<script>
  // Globale ranglijst: alle spelers, gesorteerd op totaal-XP (aller tijden).
  // Werkt ook als gast (alleen-lezen); ingelogd word je gemarkeerd als 'jij'.
  import { go } from '../stores/ui.js';
  import { auth } from '../stores/auth.js';
  import { isConfigured } from '../lib/cloud/online.js';
  import { fetchLeaderboard } from '../lib/cloud/leaderboard.js';

  let board = [];
  let loading = false;
  let err = '';

  async function refresh() {
    if (!isConfigured()) return;
    loading = true;
    err = '';
    try {
      board = await fetchLeaderboard();
    } catch (e) {
      err = e?.message || 'Kon ranglijst niet laden.';
    } finally {
      loading = false;
    }
  }

  // (Her)laad bij binnenkomst en wanneer de inlogstatus wijzigt (zodat 'jij'
  // gemarkeerd wordt zodra je inlogt).
  $: $auth.user, refresh();
</script>

<div class="space-y-5 px-4 pb-28 pt-2">
  <div>
    <h1 class="font-pixel text-sm uppercase neon-cyan">Ranglijst</h1>
    <p class="mt-1 text-xs text-slate-400">Aller tijden · alle spelers</p>
  </div>

  {#if !isConfigured()}
    <section class="arcade-panel space-y-2 rounded-2xl p-5">
      <p class="text-sm text-slate-200">Online staat nog uit.</p>
      <p class="text-xs leading-relaxed text-slate-400">
        Met een gratis account kom je op de wereldwijde ranglijst en bewaar je je voortgang in de
        cloud. Instellen kost ~10 min — zie <span class="font-mono text-slate-300">docs/ONLINE-SETUP.md</span>.
      </p>
    </section>
  {:else}
    {#if !$auth.user}
      <section class="arcade-panel space-y-3 rounded-2xl p-5 text-center">
        <p class="text-sm text-slate-200">Je speelt als gast.</p>
        <p class="-mt-1 text-xs text-slate-400">Log in om zelf op de ranglijst te komen en je voortgang te bewaren.</p>
        <button class="btn-arcade w-full rounded-xl py-2.5 font-pixel text-[10px] uppercase" on:click={() => go('settings')}>Inloggen →</button>
      </section>
    {/if}

    <section class="arcade-panel space-y-3 rounded-2xl p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Top spelers</h2>
        <button class="text-xs text-slate-400 hover:text-slate-200" on:click={refresh} aria-label="Vernieuwen">⟳</button>
      </div>
      {#if loading}
        <p class="text-xs text-slate-500">Laden…</p>
      {:else if board.length === 0}
        <p class="text-xs text-slate-500">Nog geen spelers op de ranglijst.</p>
      {:else}
        <ol class="space-y-1.5">
          {#each board as r (r.id)}
            <li class="flex items-center gap-3 rounded-lg px-2 py-1.5 {r.isMe ? 'bg-cyan-500/10' : ''}">
              <span class="w-6 text-center font-pixel text-[10px] {r.rank === 1 ? 'text-amber-300' : 'text-slate-500'}">{r.rank}</span>
              <span class="flex-1 truncate text-sm text-slate-200">{r.username}{r.isMe ? ' (jij)' : ''}</span>
              <span class="font-pixel text-[10px] text-cyan-300">{r.totalXp} XP</span>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  {/if}

  {#if err}<p class="text-center text-xs text-rose-300">{err}</p>{/if}
</div>
