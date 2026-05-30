<script>
  export let lesson;
  export let state = 'locked'; // 'locked' | 'available' | 'done'
  export let stars = 0;
  export let isBoss = false;
  export let color = '#6366f1';

  $: clickable = state !== 'locked';
</script>

<button
  type="button"
  class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition
  {state === 'locked'
    ? 'border-slate-800 bg-slate-900/40 opacity-50'
    : state === 'done'
      ? 'border-emerald-700/60 bg-emerald-950/20 hover:border-emerald-600'
      : 'border-slate-700 bg-slate-800 hover:border-slate-500'}"
  on:click
  disabled={!clickable}
>
  <div
    class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
    style={state === 'locked' ? 'background:#1e293b' : `background:${isBoss ? '#f59e0b' : color}`}
  >
    {state === 'locked' ? '🔒' : isBoss ? '👑' : state === 'done' ? '✓' : '▶'}
  </div>
  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-medium text-white">{isBoss ? 'Boss: ' : ''}{lesson.title}</div>
    {#if state !== 'locked' && !isBoss}
      <div class="text-xs" style="color:{color}">
        {#each Array(3) as _, i}{i < stars ? '★' : '☆'}{/each}
      </div>
    {:else if isBoss && state === 'done'}
      <div class="text-xs font-semibold text-emerald-400">Gehaald! 👑</div>
    {:else if isBoss && state !== 'locked'}
      <div class="text-xs text-amber-400/80">Examenquiz · {Math.round(0.8 * 100)}% om te halen</div>
    {/if}
  </div>
</button>
