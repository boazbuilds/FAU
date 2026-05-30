<script>
  import { go } from '../stores/ui.js';
  import { auth } from '../stores/auth.js';
  import { isConfigured } from '../lib/cloud/online.js';
  import { myFriendCode, addFriendByCode, removeFriend, fetchLeaderboard } from '../lib/cloud/friends.js';

  let friendInput = '';
  let board = [];
  let loading = false;
  let busy = false;
  let msg = '';
  let err = '';

  $: code = $auth.user ? myFriendCode() : null;

  async function refresh() {
    if (!$auth.user) return;
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

  async function add() {
    if (!friendInput.trim()) return;
    busy = true;
    err = msg = '';
    try {
      const f = await addFriendByCode(friendInput);
      msg = `${f.username} toegevoegd!`;
      friendInput = '';
      await refresh();
    } catch (e) {
      err = e?.message || 'Toevoegen mislukt.';
    } finally {
      busy = false;
    }
  }

  async function drop(id) {
    try {
      await removeFriend(id);
      await refresh();
    } catch (e) {
      err = e?.message || 'Verwijderen mislukt.';
    }
  }

  function copyCode() {
    if (code && navigator.clipboard) navigator.clipboard.writeText(code).then(() => (msg = 'Code gekopieerd!'));
  }

  // Laad de ranglijst zodra we ingelogd zijn.
  $: if ($auth.user) refresh();
</script>

<div class="space-y-5 px-4 pb-28 pt-2">
  <h1 class="font-pixel text-sm uppercase neon-cyan">Vrienden</h1>

  {#if !isConfigured()}
    <section class="arcade-panel space-y-2 rounded-2xl p-5">
      <p class="text-sm text-slate-200">Online staat nog uit.</p>
      <p class="text-xs leading-relaxed text-slate-400">
        Met een gratis account bewaar je je voortgang in de cloud én kun je vrienden toevoegen en samen
        op de ranglijst staan. Instellen kost ~10 min — zie <span class="font-mono text-slate-300">docs/ONLINE-SETUP.md</span>.
      </p>
    </section>
  {:else if !$auth.user}
    <section class="arcade-panel space-y-3 rounded-2xl p-5 text-center">
      <p class="text-sm text-slate-200">Log in om vrienden toe te voegen.</p>
      <button class="btn-arcade w-full rounded-xl py-2.5 font-pixel text-[10px] uppercase" on:click={() => go('settings')}>Naar inloggen →</button>
    </section>
  {:else}
    <!-- Mijn vriendcode -->
    <section class="arcade-panel space-y-3 rounded-2xl p-5">
      <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Jouw vriendcode</h2>
      <button class="flex w-full items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2.5" on:click={copyCode}>
        <span class="text-xs text-slate-400">Deel deze met vrienden</span>
        <span class="font-pixel text-sm text-cyan-300">{code} 📋</span>
      </button>
    </section>

    <!-- Vriend toevoegen -->
    <section class="arcade-panel space-y-3 rounded-2xl p-5">
      <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Vriend toevoegen</h2>
      <div class="flex gap-2">
        <input class="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm uppercase text-white" placeholder="FAU-XXXXX" bind:value={friendInput} />
        <button class="btn-arcade rounded-xl px-4 font-pixel text-[10px] uppercase disabled:opacity-50" on:click={add} disabled={busy}>+</button>
      </div>
    </section>

    <!-- Ranglijst -->
    <section class="arcade-panel space-y-3 rounded-2xl p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Ranglijst · week-XP</h2>
        <button class="text-xs text-slate-400 hover:text-slate-200" on:click={refresh} aria-label="Vernieuwen">⟳</button>
      </div>
      {#if loading}
        <p class="text-xs text-slate-500">Laden…</p>
      {:else if board.length === 0}
        <p class="text-xs text-slate-500">Nog niemand. Voeg een vriend toe met zijn code.</p>
      {:else}
        <ol class="space-y-1.5">
          {#each board as r (r.id)}
            <li class="flex items-center gap-3 rounded-lg px-2 py-1.5 {r.isMe ? 'bg-cyan-500/10' : ''}">
              <span class="w-6 text-center font-pixel text-[10px] {r.rank === 1 ? 'text-amber-300' : 'text-slate-500'}">{r.rank}</span>
              <span class="flex-1 truncate text-sm text-slate-200">{r.username}{r.isMe ? ' (jij)' : ''}</span>
              <span class="font-pixel text-[10px] text-cyan-300">{r.weekXp}</span>
              {#if !r.isMe}<button class="text-slate-600 hover:text-rose-400" title="Verwijderen" on:click={() => drop(r.id)}>✕</button>{/if}
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  {/if}

  {#if msg}<p class="text-center text-xs text-emerald-300">{msg}</p>{/if}
  {#if err}<p class="text-center text-xs text-rose-300">{err}</p>{/if}
</div>
