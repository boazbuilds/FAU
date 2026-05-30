<script>
  import { settings } from '../stores/settings.js';
  import * as audio from '../lib/audio.js';
  import { nowPlaying } from '../lib/audio.js';

  export let showName = true;

  function toggle() {
    audio.unlock();
    settings.update((s) => { s.music = s.music === false ? true : false; return s; });
  }
  function next() {
    audio.unlock();
    if ($settings.music === false) settings.update((s) => { s.music = true; return s; });
    audio.nextTrack();
  }
</script>

<div class="flex items-center gap-1.5">
  {#if $settings.music !== false}
    {#if showName && $nowPlaying}
      <span class="hidden max-w-[96px] truncate font-pixel text-[7px] uppercase tracking-wide text-cyan-300/80 sm:inline">{$nowPlaying}</span>
    {/if}
    <button
      class="text-base leading-none text-cyan-300 hover:text-cyan-200"
      on:click={next}
      title="Volgend nummer"
      aria-label="Volgend nummer"
    >⏭</button>
  {/if}
  <button
    class="text-lg leading-none {$settings.music !== false ? 'text-indigo-300' : 'text-slate-600'}"
    on:click={toggle}
    title="Muziek aan/uit"
    aria-label="Muziek aan of uit"
  >{$settings.music !== false ? '🎵' : '🔇'}</button>
</div>
