<script>
  import { profile } from '../stores/profile.js';
  import { settings } from '../stores/settings.js';
  import { CONFIG } from '../config.js';
  import { exportData, importData, clearAll } from '../lib/storage.js';
  import { requestPermission } from '../lib/notify.js';

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
  <h1 class="text-2xl font-bold text-white">Instellingen</h1>

  <section class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Dagdoel</h2>
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
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Spel</h2>
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
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Geluid</h2>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">🔊 Geluidseffecten</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.sound !== false} on:change={toggleSound} />
    </label>
    <label class="flex items-center justify-between">
      <span class="text-slate-200">🎵 Achtergrondmuziek</span>
      <input type="checkbox" class="h-5 w-5 accent-indigo-500" checked={$settings.music !== false} on:change={toggleMusic} />
    </label>
    <p class="-mt-2 text-xs text-slate-500">Arcade-deuntjes en bevredigende effecten. Start zodra je de app aanraakt.</p>
  </section>

  <section class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Herinnering</h2>
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
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Gegevens</h2>
    <button class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800" on:click={doExport}>Back-up downloaden</button>
    <label class="block w-full cursor-pointer rounded-xl border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-slate-800">
      Back-up herstellen
      <input type="file" accept="application/json" class="hidden" on:change={doImport} />
    </label>
    <button class="w-full rounded-xl border border-rose-800 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-950/50" on:click={reset}>Voortgang wissen</button>
    <p class="text-xs text-slate-500">Je voortgang staat lokaal in deze browser. Maak af en toe een back-up.</p>
  </section>

  <p class="pt-2 text-center text-xs text-slate-600">FAU — leer Financial Auditing · v0.1</p>
</div>
