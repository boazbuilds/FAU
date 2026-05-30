// Procedurele audio-engine (Web Audio API). Geen assets: alle geluiden en de
// achtergrondmuziek worden live gesynthetiseerd. Volledig import-veilig: zonder
// Web Audio (bv. in tests/SSR) doet alles niets en gooit niets.

let ctx = null;
let master = null; // master gain → destination
let musicBus = null; // muziek loopt hierdoor (apart regelbaar)
let sfxBus = null; // effecten lopen hierdoor
let noiseBuffer = null;

let sfxOn = true;
let musicOn = true;

const MUSIC_VOL = 0.22;
const SFX_VOL = 0.85;

function supported() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

function ensure() {
  if (ctx) return ctx;
  if (!supported()) return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0; // we ramp-en omhoog bij start
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(master);

    // Eénmalig ruis-buffer voor hi-hats/snares.
    const len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// MIDI-nootnummer → frequentie (Hz). Puur, handig om te testen.
export function midiToFreq(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
const F = midiToFreq;

// --- Lage-niveau stembouwsteen: een korte toon met envelope ---
function tone(freq, t, dur, opts = {}) {
  if (!ctx) return;
  const {
    type = 'square',
    gain = 0.4,
    attack = 0.004,
    release = 0.08,
    bus = sfxBus,
    detune = 0,
    sweepTo = 0
  } = opts;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t + dur);
  if (detune) osc.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  osc.connect(g);
  g.connect(bus);
  osc.start(t);
  osc.stop(t + dur + release + 0.02);
}

function noise(t, dur, opts = {}) {
  if (!ctx || !noiseBuffer) return;
  const { gain = 0.3, hp = 2000, lp = 16000, bus = sfxBus } = opts;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = hp;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(g);
  g.connect(bus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

// =========================================================================
//  SFX
// =========================================================================

// Heerlijk bevredigend "goed!" — stijgend arpeggio dat hoger wordt met je combo.
export function correct(combo = 0) {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  const step = Math.min(Math.max(combo - 1, 0), 14); // klimt mee met de reeks
  const root = 67 + step; // G4 omhoog
  const arp = [0, 4, 7, 12];
  arp.forEach((s, i) => {
    tone(F(root + s), t + i * 0.045, 0.08, { type: 'square', gain: 0.32 });
    tone(F(root + s + 12), t + i * 0.045, 0.06, { type: 'triangle', gain: 0.12 });
  });
  // glinsterende afsluiter
  tone(F(root + 19), t + arp.length * 0.045, 0.16, { type: 'triangle', gain: 0.28, release: 0.22 });
}

// Zachte, niet-bestraffende "fout".
export function wrong() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  tone(F(52), t, 0.12, { type: 'sawtooth', gain: 0.22, sweepTo: F(49) });
  tone(F(47), t + 0.1, 0.2, { type: 'sawtooth', gain: 0.2, sweepTo: F(43), release: 0.2 });
}

// Deels goed: vriendelijk dubbeltikje.
export function partial() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  tone(F(67), t, 0.09, { type: 'square', gain: 0.25 });
  tone(F(71), t + 0.08, 0.12, { type: 'square', gain: 0.22, release: 0.12 });
}

// Triomfantelijke fanfare (perfecte sessie / boss verslagen).
export function fanfare() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  const run = [60, 64, 67, 72, 76, 79];
  run.forEach((n, i) => {
    tone(F(n), t + i * 0.08, 0.12, { type: 'square', gain: 0.32 });
    tone(F(n + 12), t + i * 0.08, 0.1, { type: 'triangle', gain: 0.14 });
  });
  const end = t + run.length * 0.08;
  [84, 88, 91].forEach((n) => tone(F(n), end, 0.5, { type: 'triangle', gain: 0.26, release: 0.5 }));
}

// Mijlpaal-flits bovenop het goed-geluid (combo 3/5/8…).
export function comboFlair(level = 0) {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime + 0.18;
  const base = 84 + Math.min(level, 10);
  [0, 7, 12].forEach((s, i) => tone(F(base + s), t + i * 0.04, 0.1, { type: 'triangle', gain: 0.2, release: 0.15 }));
}

// Badge/level-up: korte glittersweep.
export function levelUp() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 8; i++) tone(F(72 + i * 2), t + i * 0.04, 0.08, { type: 'triangle', gain: 0.2 });
}

// Subtiele UI-tik.
export function tap() {
  if (!ensure() || !sfxOn) return;
  tone(F(76), ctx.currentTime, 0.025, { type: 'square', gain: 0.1, release: 0.04 });
}

// =========================================================================
//  Muziek — chiptune-sequencer (Trackmania/arcade-vibe)
// =========================================================================

const TRACKS = {
  // Energiek, drijvend — voor sessies. i–VI–III–VII in A mineur (euforisch).
  race: {
    bpm: 152,
    bars: [
      { root: 33, chord: [0, 3, 7, 10] }, // Am
      { root: 29, chord: [0, 4, 7, 12] }, // F
      { root: 36, chord: [0, 4, 7, 11] }, // C
      { root: 31, chord: [0, 4, 7, 10] } // G
    ]
  },
  // Rustiger lounge-loop — voor de menu's.
  menu: {
    bpm: 104,
    bars: [
      { root: 33, chord: [0, 7, 12, 7] },
      { root: 28, chord: [0, 7, 12, 7] },
      { root: 36, chord: [0, 7, 11, 7] },
      { root: 31, chord: [0, 7, 10, 7] }
    ]
  }
};

let musicTimer = null;
let nextStepTime = 0;
let stepCounter = 0;
let currentTrack = 'menu';

function kick(t) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g);
  g.connect(musicBus);
  osc.start(t);
  osc.stop(t + 0.2);
}

function scheduleStep(step, t) {
  const track = TRACKS[currentTrack] ?? TRACKS.menu;
  const energetic = currentTrack === 'race';
  const barLen = 16;
  const bar = track.bars[Math.floor(step / barLen) % track.bars.length];
  const s = step % barLen;

  if (energetic) {
    if (s % 4 === 0) kick(t); // four-on-the-floor
    noise(t, s % 4 === 2 ? 0.05 : 0.025, { gain: s % 4 === 2 ? 0.16 : 0.07, hp: 7000 });
    if (s === 4 || s === 12) noise(t, 0.12, { gain: 0.22, hp: 1500, lp: 9000 }); // snare
    if (s % 2 === 0) {
      const bassN = bar.root + (s % 8 === 0 ? 0 : 12);
      tone(F(bassN), t, 0.12, { type: 'sawtooth', gain: 0.28, bus: musicBus, release: 0.02 });
    }
    // signatuur-arp, twee octaven hoog
    const tn = bar.chord[s % bar.chord.length];
    tone(F(bar.root + 24 + tn), t, 0.09, { type: 'square', gain: 0.16, bus: musicBus, detune: 4, release: 0.03 });
  } else {
    if (s === 0 || s === 8) kick(t);
    if (s % 4 === 2) noise(t, 0.04, { gain: 0.05, hp: 8000 });
    if (s % 4 === 0) tone(F(bar.root), t, 0.4, { type: 'triangle', gain: 0.22, bus: musicBus, release: 0.2 });
    if (s % 2 === 0) {
      const tn = bar.chord[(s / 2) % bar.chord.length];
      tone(F(bar.root + 24 + tn), t, 0.22, { type: 'sine', gain: 0.12, bus: musicBus, release: 0.15 });
    }
  }
}

function tick() {
  if (!ctx) return;
  const track = TRACKS[currentTrack] ?? TRACKS.menu;
  const stepDur = 60 / track.bpm / 4; // zestiende noot
  while (nextStepTime < ctx.currentTime + 0.12) {
    scheduleStep(stepCounter, nextStepTime);
    nextStepTime += stepDur;
    stepCounter++;
  }
  musicTimer = setTimeout(tick, 25);
}

export function startMusic(trackId) {
  if (!ensure()) return;
  if (trackId && TRACKS[trackId]) currentTrack = trackId;
  if (!musicOn) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (musicTimer) return; // loopt al
  nextStepTime = ctx.currentTime + 0.08;
  stepCounter = 0;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(MUSIC_VOL, ctx.currentTime + 0.6);
  tick();
}

export function stopMusic() {
  if (!ctx) return;
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
}

// Wissel van track zonder de loop te onderbreken (naadloos).
export function setTrack(trackId) {
  if (!TRACKS[trackId] || currentTrack === trackId) return;
  currentTrack = trackId;
}

// =========================================================================
//  Aansturing
// =========================================================================

// Roep aan vanuit een user-gesture (autoplay-policy ontgrendelen).
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (musicOn) startMusic();
}

export function setSfxEnabled(on) {
  sfxOn = !!on;
}

export function setMusicEnabled(on) {
  musicOn = !!on;
  if (!ctx) return;
  if (musicOn) startMusic();
  else stopMusic();
}

export function isMusicOn() {
  return musicOn;
}
