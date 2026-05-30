<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { screen, go } from './stores/ui.js';
  import { profile } from './stores/profile.js';
  import { settings } from './stores/settings.js';
  import { regenHearts, reconcileDay } from './lib/gamify.js';
  import { maybeRemind } from './lib/notify.js';
  import { todayNumber } from './lib/day.js';
  import TopBar from './components/TopBar.svelte';
  import Home from './screens/Home.svelte';
  import Session from './screens/Session.svelte';
  import Results from './screens/Results.svelte';
  import Progress from './screens/Progress.svelte';
  import Predict from './screens/Predict.svelte';
  import Settings from './screens/Settings.svelte';

  onMount(() => {
    profile.update((p) => {
      regenHearts(p);
      reconcileDay(p);
      return p;
    });
    maybeRemind(get(profile), get(settings), todayNumber());
  });

  $: if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('reduce-motion', !!$settings.reducedMotion);
  }

  $: chromeless = $screen === 'session' || $screen === 'results';

  const nav = [
    { id: 'home', label: 'Start', icon: '🏠' },
    { id: 'progress', label: 'Voortgang', icon: '📊' },
    { id: 'predict', label: 'Slaagkans', icon: '🔮' },
    { id: 'settings', label: 'Meer', icon: '⚙️' }
  ];
</script>

<div class="mx-auto min-h-[100dvh] w-full max-w-md">
  {#if !chromeless}
    <TopBar />
  {/if}

  {#if $screen === 'home'}
    <Home />
  {:else if $screen === 'session'}
    <Session />
  {:else if $screen === 'results'}
    <Results />
  {:else if $screen === 'progress'}
    <Progress />
  {:else if $screen === 'predict'}
    <Predict />
  {:else if $screen === 'settings'}
    <Settings />
  {/if}

  {#if !chromeless}
    <nav class="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-slate-800 bg-slate-950/90 backdrop-blur">
      <div class="grid grid-cols-4">
        {#each nav as item}
          <button
            class="flex flex-col items-center gap-0.5 py-2 text-xs {$screen === item.id ? 'text-indigo-400' : 'text-slate-400'}"
            on:click={() => go(item.id)}
          >
            <span class="text-lg">{item.icon}</span>{item.label}
          </button>
        {/each}
      </div>
    </nav>
  {/if}
</div>
