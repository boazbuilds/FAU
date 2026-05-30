<script>
  import { MASCOT } from '../lib/humor.js';

  export let message = '';
  export let mood = 'happy'; // 'happy' | 'think' | 'cheer' | 'oops'
  export let size = 'md'; // 'sm' | 'md' | 'lg'
  export let hint = null; // klein label onder de bubbel (bv. "tik voor een nieuwe")

  const ring = {
    happy: 'from-indigo-500/30 to-indigo-500/5 ring-indigo-500/40',
    think: 'from-sky-500/30 to-sky-500/5 ring-sky-500/40',
    cheer: 'from-amber-500/30 to-amber-500/5 ring-amber-500/40',
    oops: 'from-rose-500/30 to-rose-500/5 ring-rose-500/40'
  };
  const emojiSize = { sm: 'text-2xl h-10 w-10', md: 'text-3xl h-14 w-14', lg: 'text-4xl h-16 w-16' };
</script>

<div class="flex items-start gap-3">
  <div
    class="grid shrink-0 place-items-center rounded-full bg-gradient-to-b ring-2 {ring[mood] ?? ring.happy} {emojiSize[size] ?? emojiSize.md} animate-bob"
    aria-hidden="true"
  >
    <span class="{mood === 'cheer' ? 'animate-wiggle' : ''}">{MASCOT.emoji}</span>
  </div>
  <div class="relative min-w-0 flex-1">
    <div class="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm leading-relaxed text-slate-100">
      <span class="mb-0.5 block text-xs font-semibold text-indigo-300">{MASCOT.name} {MASCOT.role}</span>
      <slot>{message}</slot>
    </div>
    {#if hint}
      <div class="mt-1 pl-1 text-[11px] text-slate-500">{hint}</div>
    {/if}
  </div>
</div>
