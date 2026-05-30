<script>
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { CONFIG } from '../config.js';
  import { exportData, importData, clearAll } from '../lib/storage.js';
  import { requestPermission } from '../lib/notify.js';
  import * as audio from '../lib/audio.js';
  import { trackList, nowPlaying } from '../lib/audio.js';
  import { ratings } from '../stores/ratings.js';
  import { isConfigured } from '../lib/cloud/online.js';
  import { auth } from '../stores/auth.js';
  import { signIn, signUp, signOut } from '../lib/cloud/sync.js';

  let email = '';
  let password = '';
  let username = '';
  let authMode = 'login';
  let authErr = '';
  let authBusy = false;
  async function doAuth() {
    authErr = '';
    authBusy = true;
    try {
      if (authMode === 'signup') await signUp(email.trim(), password, username.trim());
      else await signIn(email.trim(), password);
      email = password = username = '';
    } catch (e) {
      authErr = e?.message || 'Er ging iets mis.';
    }
    authBusy = false;
  }
  async function doLogout() {
    await signOut();
  }

  $: ratingCount = Object.keys($ratings).length;
  function clearRatings() {
    if (ratingCount === 0) return;
    if (confirm('Al je 👍/👎-beoordelingen van vragen wissen?')) ratings.set({});
  }

  function playTrack(id) {
    audio.unlock();
    settings.update((s) => { s.music = true; return s; });
    audio.setTrack(id);
  }

  function setGoal(xp) {
    profile.update((p) => { p.dailyGoalXp = xp; return p; });
  }

  function toggleHearts(e) {
    const on = e.target.checked;
    settings.update((s) => { s.heartsEnabled = on; return s; });
  }

  function toggleMotion(e) {
    const on = e.target.checked;
    settings.update((s) => { s.reducedMotion = on; return s; });
  }

  function toggleSound(e) {
    const on = e.target.checked;
    settings.update((s) => { s.sound = on; return s; });
  }

  function toggleMusic(e) {
    const on = e.target.checked;
    settings.update((s) => { s.music = on; return s; });
  }

  async function toggleReminder(e) {
    const on = e.target.checked;
    if (on) {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        settings.update((s) => { s.reminderEnabled = false; return s; });
        alert('Notificaties zijn niet toegestaan in je browser.');
        return;
      }
    }
    settings.update((s) => { s.reminderEnabled = on; return s; });
  }

  function setReminderTime(e) {
    const t = e.target.value;
    settings.update((s) => { s.reminderTime = t; return s; });
  }

  function doExport() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fau-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (importData(obj)) location.reload();
        else alert('Importeren mislukt.');
      } catch {
        alert('Ongeldig back-upbestand.');
      }
    };
    reader.readAsText(file);
  }

  function reset() {
    if (confirm('Weet je het zeker? Al je voortgang, XP en streak worden gewist.')) {
      clearAll();
      location.reload();
    }
  }
</script>

<div class="space-y-6 px-4 pb-28 pt-2">
  <h1 class="font-pixel text-sm uppercase neon-cyan">Instellingen</h1>

  <section class="arcade-panel space-y-3 rounded-2xl p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Account</h2>
    {#if !isConfigured()}
      <p class="text-xs leading-relaxed text-slate-400">
        Online staat nog uit. Met een gratis account bewaar je je voortgang in de cloud (op al je apparaten) en kun je vrienden toevoegen (tab Vrienden). Aanzetten? Zie <span class="font-mono text-slate-300">docs/ONLINE-SETUP.md</span>.
      </p>
    {:else if $auth.user}
      <p class="text-sm text-slate-200">Ingelogd als <span class="font-semibold text-white">{$auth.user.email}</span> ✅</p>
      <p class="-mt-1 text-xs text-slate-500">Je voortgang synchroniseert automatisch.</p>
      <button class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800" on:click={doLogout}>Uitloggen</button>
    {:else}
      <div class="grid grid-cols-2 gap-2">
        <button class="rounded-lg border py-2 text-xs font-medium {authMode === 'login' ? 'border-indigo-500 bg-indigo-600/20 text-white' : 'border-slate-700 text-slate-300'}" on:click={() => (authMode = 'login')}>Inloggen</button>
        <button class="rounded-lg border py-2 text-xs font-medium {authMode === 'signup' ? 'border-indigo-500 bg-indigo-600/20 text-white' : 'border-slate-700 text-slate-300'}" on:click={() => (authMode = 'signup')}>Account maken</button>
      </div>
      {#if authMode === 'signup'}
        <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" placeholder="gebruikersnaam" bind:value={username} autocomplete="username" />
      {/if}
      <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" type="email" placeholder="e-mail" bind:value={email} autocomplete="email" />
      <input class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" type="password" placeholder="wachtwoord" bind:value={password} autocomplete="current-password" />
      {#if authErr}<p class="text-xs text-rose-400">{authErr}</p>{/if}
      <button class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50" on:click={doAuth} disabled={authBusy || !email || !password}>
        {authBusy ? '…' : authMode === 'signup' ? 'Account maken' : 'Inloggen'}
      </button>
    {/if}
  </section>

  <section class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Dagdoel</h2>
    <div class="grid grid-cols-2 gap-2">
      {#each CONFIG.dailyGoals as g}
        <button
          class="rounded-xl border px-3 py-3 text-sm font-medium transition {$profile.dailyGoalXp === g.xp ? 'border-indigo-500 bg-indigo-600/20 text-white' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'}"
          on:click={() => setGoal(g.xp)}
        >
          {g.label}<span class="block text-xs text-slate-400">{g.xp} XP / dag</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Spel</h2>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">Levens (hearts)</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.heartsEnabled} on:change={toggleHearts} />
    </label>
    <p class="-mt-2 text-xs text-slate-500">Uit = oneindig oefenen zonder dat fouten je blokkeren.</p>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">Minder beweging/animaties</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.reducedMotion} on:change={toggleMotion} />
    </label>
  </section>

  <section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Geluid</h2>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">🔊 Geluidseffecten</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.sound !== false} on:change={toggleSound} />
    </label>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">🎵 Achtergrondmuziek</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.music !== false} on:change={toggleMusic} />
    </label>
    <div>
      <div class="mb-2 font-pixel text-[8px] uppercase tracking-wide text-slate-500">Kies een nummer</div>
      <div class="grid grid-cols-2 gap-2">
        {#each trackList as t}
          <button
            class="rounded-xl border px-2 py-2 text-left text-xs transition {$nowPlaying === t.name && $settings.music !== false ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'}"
            on:click={() => playTrack(t.id)}
          >
            <span class="block font-pixel text-[8px] uppercase leading-relaxed">{t.name}</span>
            {#if $nowPlaying === t.name && $settings.music !== false}<span class="text-[10px] text-cyan-300">▶ speelt nu</span>{/if}
          </button>
        {/each}
      </div>
    </div>
    <p class="-mt-1 text-xs text-slate-500">Arcade-deuntjes en bevredigende effecten — volledig gesynthetiseerd. Tik ⏭ in de balk voor het volgende nummer.</p>
  </section>

  <section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Herinnering</h2>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">Dagelijkse herinnering</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.reminderEnabled} on:change={toggleReminder} />
    </label>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">Tijdstip</span>
      <input type="time" class="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-white" value={$settings.reminderTime} on:change={setReminderTime} />
    </label>
    <p class="-mt-2 text-xs text-slate-500">Werkt het best als je de app aan je beginscherm toevoegt. Herinneringen zijn best-effort.</p>
  </section>

  <section class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="font-pixel text-[10px] uppercase tracking-wide text-cyan-300/80">Gegevens</h2>
    <button class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800" on:click={doExport}>Back-up downloaden</button>
    <label class="block w-full cursor-pointer rounded-xl border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-slate-800">
      Back-up herstellen
      <input type="file" accept="application/json" class="hidden" on:change={doImport} />
    </label>
    <button class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40" on:click={clearRatings} disabled={ratingCount === 0}>Vraagbeoordelingen wissen{ratingCount ? ` (${ratingCount})` : ''}</button>
    <button class="w-full rounded-xl border border-rose-800 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-950/50" on:click={reset}>Voortgang wissen</button>
    <p class="text-xs text-slate-500">Je voortgang staat lokaal in deze browser. Maak af en toe een back-up.</p>
  </section>

  <p class="pt-2 text-center text-xs text-slate-600">FAU — leer Financial Auditing · v0.1</p>
</div>
