<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { screen, go } from './stores/ui.js';
  import { profile } from './stores/profile.js';
  import { settings } from './stores/settings.js';
  import { progress } from './stores/progressStore.js';
  import { srs } from './stores/srsStore.js';
  import { ratings } from './stores/ratings.js';
  import { auth, guest, initAuth } from './stores/auth.js';
  import { loginSync, schedulePush } from './lib/cloud/sync.js';
  import { regenHearts, reconcileDay, migrateProfile } from './lib/gamify.js';
  import { ensureInit } from './lib/progress.js';
  import { maybeRemind } from './lib/notify.js';
  import { todayNumber } from './lib/day.js';
  import { modules } from './lib/content.js';
  import { getIdentity } from './lib/sync.js';
  import * as audio from './lib/audio.js';
  import { audioReady } from './lib/audio.js';
  import TopBar from './components/TopBar.svelte';
  import Home from './screens/Home.svelte';
  import Path from './screens/Path.svelte';
  import Session from './screens/Session.svelte';
  import Blitz from './screens/Blitz.svelte';
  import Results from './screens/Results.svelte';
  import Progress from './screens/Progress.svelte';
  import Predict from './screens/Predict.svelte';
  import Settings from './screens/Settings.svelte';
  import Cheatsheet from './screens/Cheatsheet.svelte';
  import Mistakes from './screens/Mistakes.svelte';
  import Leaderboard from './screens/Leaderboard.svelte';
  import Login from './screens/Login.svelte';

  onMount(() => {
    profile.update((p) => {
      migrateProfile(p); // backfill nieuwe velden voor bestaande gebruikers
      regenHearts(p);
      reconcileDay(p);
      return p;
    });
    progress.update((pr) => ensureInit(pr, modules));
    getIdentity(get(profile)); // online-naad (no-op zolang uit)
    maybeRemind(get(profile), get(settings), todayNumber());

    // Audio ontgrendelen op de eerste interactie (browser-autoplaybeleid).
    // armGestureUnlock blijft proberen tot het echt lukt (mobiel faalt vaak de
    // 1e keer) en herstelt na terugkeren naar het tabblad.
    const s = get(settings);
    audio.setSfxEnabled(s.sound !== false);
    audio.setMusicEnabled(s.music !== false);
    audio.armGestureUnlock();

    // Online (uit tenzij geconfigureerd): account + cloud-sync.
    initAuth();
    [profile, progress, srs, ratings].forEach((st) => st.subscribe(() => schedulePush()));
  });

  // Bij inloggen één keer cloud↔lokaal samenvoegen (per gebruiker).
  let syncedFor = null;
  function handleAuth(u) {
    if (u && u.id !== syncedFor) {
      syncedFor = u.id;
      loginSync();
    } else if (!u) {
      syncedFor = null;
    }
  }
  $: handleAuth($auth.user);

  $: if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('reduce-motion', !!$settings.reducedMotion);
  }

  // Audio-instellingen live volgen.
  $: audio.setSfxEnabled($settings.sound !== false);
  $: audio.setMusicEnabled($settings.music !== false);
  // Track wisselen: energiek in de sessie/resultaten, rustig in de menu's.
  $: audio.setContext($screen);

  $: chromeless = $screen === 'session' || $screen === 'results' || $screen === 'blitz';

  // Login-first: zodra online aanstaat en niemand is ingelogd, tonen we eerst het
  // inlogscherm — tenzij je als gast verdergaat. Zonder online-config is auth meteen
  // 'ready' (user=null) en val je direct in de gast-stroom.
  $: gated = $auth.ready && !$auth.user && !$guest;

  const nav = [
    { id: 'home', label: 'Oefenen', icon: '🎮' },
    { id: 'progress', label: 'Voortgang', icon: '📊' },
    { id: 'leaderboard', label: 'Ranglijst', icon: '🏆' },
    { id: 'settings', label: 'Meer', icon: '⚙️' }
  ];
</script>

<div class="mx-auto min-h-[100dvh] w-full max-w-md">
  {#if !$auth.ready && !$guest}
    <!-- Even checken of er nog een sessie is, vóór we het inlogscherm tonen. -->
    <div class="flex min-h-[100dvh] items-center justify-center">
      <p class="font-pixel text-[10px] uppercase tracking-wide text-slate-500">Laden…</p>
    </div>
  {:else if gated}
    <Login />
  {:else}
  {#if $settings.music !== false && !$audioReady}
    <!-- iOS/mobiel: geluid kan pas na een echte tik. Directe click-handler = betrouwbaarst. -->
    <button
      type="button"
      class="fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-md bg-cyan-500/90 py-2 text-center font-pixel text-[9px] uppercase tracking-wide text-slate-950"
      on:click={() => audio.unlock()}
    >🔊 Tik om geluid aan te zetten</button>
  {/if}

  {#if !chromeless}
    <TopBar />
  {/if}

  {#if $screen === 'home'}
    <Home />
  {:else if $screen === 'path'}
    <Path />
  {:else if $screen === 'session'}
    <Session />
  {:else if $screen === 'blitz'}
    <Blitz />
  {:else if $screen === 'results'}
    <Results />
  {:else if $screen === 'progress'}
    <Progress />
  {:else if $screen === 'predict'}
    <Predict />
  {:else if $screen === 'settings'}
    <Settings />
  {:else if $screen === 'leaderboard'}
    <Leaderboard />
  {:else if $screen === 'cheatsheet'}
    <Cheatsheet />
  {:else if $screen === 'mistakes'}
    <Mistakes />
  {/if}

  {#if !chromeless}
    <nav class="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-cyan-500/25 bg-slate-950/90 backdrop-blur">
      <div class="grid grid-cols-4">
        {#each nav as item}
          <button
            class="flex flex-col items-center gap-1 py-2.5 {$screen === item.id ? 'neon-cyan' : 'text-slate-500'}"
            on:click={() => go(item.id)}
          >
            <span class="text-lg">{item.icon}</span>
            <span class="font-pixel text-[7px] uppercase tracking-wide">{item.label}</span>
          </button>
        {/each}
      </div>
    </nav>
  {/if}
  {/if}
</div>
