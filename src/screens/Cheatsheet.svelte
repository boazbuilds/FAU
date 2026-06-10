<script>
  import { go } from '../stores/ui.js';
  import { tips, instinkers } from '../lib/content.js';
  import cheatsheet from '../../content/cheatsheet.json';

  let tab = 'hra'; // 'hra' | 'trees' | 'valkuilen' | 'tips'
  let query = '';
  let tipFilter = 'alle'; // 'alle' | 'techniek' | 'inhoud'

  const hraNav = cheatsheet.hraNav ?? [];
  const trees = cheatsheet.decisionTrees ?? [];

  $: q = query.trim().toLowerCase();
  $: filteredHra = hraNav.filter((r) =>
    !q ||
    r.topic.toLowerCase().includes(q) ||
    (r.standard ?? '').toLowerCase().includes(q) ||
    (r.note ?? '').toLowerCase().includes(q) ||
    (r.paras ?? '').toLowerCase().includes(q)
  );
  $: hraGroups = [...new Set(filteredHra.map((r) => r.group))];
  $: filteredTips = tips.filter((t) => tipFilter === 'alle' || t.category === tipFilter);
</script>

<div class="space-y-4 px-4 pb-28 pt-2">
  <div class="flex items-center gap-3">
    <button class="text-xl text-slate-400 hover:text-white" on:click={() => go('home')} aria-label="Terug">←</button>
    <h1 class="text-2xl font-bold text-white">Spiekbriefje 📕</h1>
  </div>

  <div class="grid grid-cols-4 gap-1 rounded-xl bg-slate-900/60 p-1 text-xs">
    <button class="rounded-lg py-2 font-medium {tab === 'hra' ? 'bg-indigo-600 text-white' : 'text-slate-300'}" on:click={() => (tab = 'hra')}>HRA</button>
    <button class="rounded-lg py-2 font-medium {tab === 'trees' ? 'bg-indigo-600 text-white' : 'text-slate-300'}" on:click={() => (tab = 'trees')}>Bomen</button>
    <button class="rounded-lg py-2 font-medium {tab === 'valkuilen' ? 'bg-rose-600 text-white' : 'text-slate-300'}" on:click={() => (tab = 'valkuilen')}>⚠️ Valkuilen</button>
    <button class="rounded-lg py-2 font-medium {tab === 'tips' ? 'bg-indigo-600 text-white' : 'text-slate-300'}" on:click={() => (tab = 'tips')}>Tips</button>
  </div>

  {#if tab === 'hra'}
    <p class="text-xs text-slate-400">Open boek = punten in snel vinden. Tab deze Standaarden + paragrafen in je HRA-bundel.</p>
    <input
      type="search"
      bind:value={query}
      placeholder="Zoek op onderwerp, Standaard of nummer…"
      class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-400"
    />
    {#each hraGroups as group}
      <div class="space-y-1.5">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</h2>
        {#each filteredHra.filter((r) => r.group === group) as r}
          <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-medium text-white">{r.topic}</span>
              <span class="shrink-0 rounded-md bg-indigo-600/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">{r.standard}{r.paras && r.paras !== '—' ? ` · ${r.paras}` : ''}</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-slate-400">{r.note}</p>
          </div>
        {/each}
      </div>
    {/each}
    {#if filteredHra.length === 0}<p class="text-center text-sm text-slate-500">Niets gevonden.</p>{/if}

  {:else if tab === 'trees'}
    {#each trees as t}
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 class="mb-2 font-semibold text-white">{t.title}</h2>
        <ol class="space-y-1.5 text-sm text-slate-300">
          {#each t.steps as step, i}
            <li class="flex gap-2"><span class="font-semibold text-indigo-400">{i + 1}.</span><span>{step}</span></li>
          {/each}
        </ol>
      </div>
    {/each}

  {:else if tab === 'valkuilen'}
    <p class="text-xs text-slate-400">De {instinkers.length} klassieke instinkers waar CA's punten op verliezen. Lees ze vlak voor de toets nog één keer door.</p>
    {#each instinkers as v (v.id)}
      <div class="rounded-xl border border-rose-900/60 bg-slate-900/60 p-3">
        <div class="flex items-baseline gap-2">
          <span class="shrink-0 text-xs font-semibold text-rose-400">#{v.nr}</span>
          <span class="font-medium text-white">{v.title}</span>
        </div>
        <p class="mt-1 text-xs leading-relaxed text-rose-200/90"><span class="font-semibold">⚠️ Valkuil:</span> {v.valkuil}</p>
        <p class="mt-1 text-xs leading-relaxed text-emerald-200/90"><span class="font-semibold">✓ Zo wel:</span> {v.goed}</p>
      </div>
    {/each}

  {:else}
    <div class="flex gap-2 text-xs">
      {#each ['alle', 'techniek', 'inhoud'] as f}
        <button class="rounded-full border px-3 py-1 {tipFilter === f ? 'border-indigo-500 bg-indigo-600/20 text-white' : 'border-slate-700 text-slate-300'}" on:click={() => (tipFilter = f)}>{f}</button>
      {/each}
    </div>
    {#each filteredTips as t}
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div class="flex items-baseline gap-2">
          <span class="shrink-0 text-xs font-semibold text-indigo-400">#{t.nr}</span>
          <span class="font-medium text-white">{t.title}</span>
        </div>
        <p class="mt-1 text-xs leading-relaxed text-slate-400">{t.body}</p>
      </div>
    {/each}
  {/if}
</div>
