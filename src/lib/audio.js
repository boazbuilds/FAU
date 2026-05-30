// Procedurele audio-engine (Web Audio API). Geen assets: alle geluiden én de
// achtergrondmuziek worden live gesynthetiseerd. Volledig import-veilig: zonder
// Web Audio (bv. in tests/SSR) doet alles niets en gooit niets.
import { writable } from 'svelte/store';

// Naam van het spelende nummer (voor de UI). Leeg = niets/uit.
export const nowPlaying = writable('');

let ctx = null;
let master = null; // master gain → destination
let musicBus = null; // muziek loopt hierdoor (apart regelbaar)
let sfxBus = null; // effecten lopen hierdoor
let noiseBuffer = null;

let sfxOn = true;
let musicOn = true;

const MUSIC_VOL = 0.24;
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
    musicBus.gain.value = 0; // we faden omhoog bij start
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(master);

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

// --- Lage-niveau bouwstenen ---
function env(g, t, dur, peak, attack, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
}

function tone(freq, t, dur, opts = {}) {
  if (!ctx) return;
  const { type = 'square', gain = 0.4, attack = 0.004, release = 0.08, bus = sfxBus, detune = 0, sweepTo = 0 } = opts;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t + dur);
  if (detune) osc.detune.value = detune;
  env(g, t, dur, gain, attack, release);
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
  const step = Math.min(Math.max(combo - 1, 0), 14);
  const root = 67 + step;
  const arp = [0, 4, 7, 12];
  arp.forEach((s, i) => {
    tone(F(root + s), t + i * 0.045, 0.08, { type: 'square', gain: 0.32 });
    tone(F(root + s + 12), t + i * 0.045, 0.06, { type: 'triangle', gain: 0.12 });
  });
  tone(F(root + 19), t + arp.length * 0.045, 0.16, { type: 'triangle', gain: 0.28, release: 0.22 });
}

export function wrong() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  tone(F(52), t, 0.12, { type: 'sawtooth', gain: 0.22, sweepTo: F(49) });
  tone(F(47), t + 0.1, 0.2, { type: 'sawtooth', gain: 0.2, sweepTo: F(43), release: 0.2 });
}

export function partial() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  tone(F(67), t, 0.09, { type: 'square', gain: 0.25 });
  tone(F(71), t + 0.08, 0.12, { type: 'square', gain: 0.22, release: 0.12 });
}

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

export function comboFlair(level = 0) {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime + 0.18;
  const base = 84 + Math.min(level, 10);
  [0, 7, 12].forEach((s, i) => tone(F(base + s), t + i * 0.04, 0.1, { type: 'triangle', gain: 0.2, release: 0.15 }));
}

export function levelUp() {
  if (!ensure() || !sfxOn) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 8; i++) tone(F(72 + i * 2), t + i * 0.04, 0.08, { type: 'triangle', gain: 0.2 });
}

export function tap() {
  if (!ensure() || !sfxOn) return;
  tone(F(76), ctx.currentTime, 0.025, { type: 'square', gain: 0.1, release: 0.04 });
}

// =========================================================================
//  Muziek — chiptune/trance-sequencer (Trackmania/arcade-vibe)
// =========================================================================

// --- Instrumenten (alles via de musicBus) ---
function kick(t, gain = 0.9) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(165, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g);
  g.connect(musicBus);
  o.start(t);
  o.stop(t + 0.2);
}

function snare(t, gain = 0.45) {
  noise(t, 0.13, { gain: gain * 0.5, hp: 1800, lp: 9000, bus: musicBus });
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  g.gain.setValueAtTime(gain * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(musicBus);
  o.start(t);
  o.stop(t + 0.14);
}

function hat(t, open = false, gain = 0.1) {
  noise(t, open ? 0.12 : 0.03, { gain, hp: 8500, bus: musicBus });
}

function clap(t, gain = 0.3) {
  [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.04, { gain, hp: 1200, lp: 6500, bus: musicBus }));
}

function sawBass(t, freq, dur, gain = 0.28, lp = 1100) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.value = lp;
  env(g, t, dur, gain, 0.004, 0.02);
  o.connect(f);
  f.connect(g);
  g.connect(musicBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// "Supersaw": meerdere licht ontstemde zaagtanden = die dikke trance/Trackmania-lead.
function supersaw(t, freq, dur, opts = {}) {
  if (!ctx) return;
  const { gain = 0.1, voices = 3, detune = 14, lp = 4000, release = 0.06 } = opts;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = lp;
  env(g, t, dur, gain, 0.006, release);
  for (let i = 0; i < voices; i++) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = (i - (voices - 1) / 2) * detune;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + release + 0.03);
  }
  f.connect(g);
  g.connect(musicBus);
}

function stab(t, freqs, dur, gain = 0.06) {
  freqs.forEach((fq) => supersaw(t, fq, dur, { gain, voices: 3, detune: 16, lp: 3200, release: 0.05 }));
}

function pad(t, freqs, dur, gain = 0.05) {
  freqs.forEach((fq) => supersaw(t, fq, dur, { gain, voices: 5, detune: 17, lp: 2600, release: 0.45 }));
}

// Akkoordprogressies (per maat: grondtoon + akkoordtonen als halve-toon-offsets).
const EUPH = [
  { root: 45, chord: [0, 3, 7, 10] }, // Am7
  { root: 41, chord: [0, 4, 7, 11] }, // Fmaj7
  { root: 48, chord: [0, 4, 7, 11] }, // Cmaj7
  { root: 43, chord: [0, 4, 7, 10] } // G7
];
const DARK = [
  { root: 45, chord: [0, 3, 7, 10] }, // Am
  { root: 43, chord: [0, 3, 7, 10] }, // Gm-ish
  { root: 44, chord: [0, 3, 6, 9] }, // dim spanning
  { root: 40, chord: [0, 4, 7, 10] } // E7
];
const HAPPY = [
  { root: 48, chord: [0, 4, 7, 12] }, // C
  { root: 43, chord: [0, 4, 7, 12] }, // G
  { root: 45, chord: [0, 3, 7, 12] }, // Am
  { root: 41, chord: [0, 4, 7, 12] } // F
];

const barAt = (prog, step) => prog[Math.floor(step / 16) % prog.length];

// Elke track: naam, bpm, en een play(step, t) die de instrumenten aanstuurt.
const TRACKS = {
  menu: {
    name: 'Neon Lounge',
    bpm: 96,
    play(step, t) {
      const b = barAt(EUPH, step);
      const s = step % 16;
      if (s === 0 || s === 8) kick(t, 0.55);
      if (s === 4 || s === 12) snare(t, 0.3);
      if (s % 4 === 2) hat(t, false, 0.05);
      if (s === 0) pad(t, b.chord.map((c) => F(b.root + 12 + c)), 1.7, 0.045);
      if (s % 4 === 0) {
        const tn = b.chord[(s / 4) % b.chord.length];
        supersaw(t, F(b.root + 24 + tn), 0.4, { gain: 0.05, voices: 2, detune: 8, lp: 2600, release: 0.3 });
      }
    }
  },
  stadium: {
    name: 'Stadium Rush',
    bpm: 150,
    play(step, t) {
      const b = barAt(EUPH, step);
      const s = step % 16;
      if (s % 4 === 0) kick(t, 0.95);
      if (s === 4 || s === 12) snare(t, 0.4);
      hat(t, s % 4 === 2, s % 2 === 0 ? 0.05 : 0.09);
      // rollende offbeat-bas (ducks onder de kick)
      if (s % 4 !== 0) sawBass(t, F(b.root - 12 + (s % 2 ? 12 : 0)), 0.1, 0.24, 1100);
      else sawBass(t, F(b.root - 12), 0.1, 0.26, 1000);
      const tn = b.chord[s % b.chord.length];
      supersaw(t, F(b.root + 24 + tn), 0.1, { gain: 0.09, voices: 3, detune: 14, lp: 4400, release: 0.04 });
      if (s === 0) stab(t, b.chord.slice(0, 3).map((c) => F(b.root + 12 + c)), 0.45, 0.05);
    }
  },
  turbo: {
    name: 'Turbo Drive',
    bpm: 168,
    play(step, t) {
      const b = barAt(EUPH, step);
      const s = step % 16;
      if (s % 4 === 0) kick(t, 0.95);
      if (s === 4 || s === 12) clap(t, 0.28);
      hat(t, false, 0.07);
      if (s === 2 || s === 6 || s === 10 || s === 14) {
        hat(t, true, 0.09);
        stab(t, b.chord.slice(0, 3).map((c) => F(b.root + 12 + c)), 0.15, 0.06);
      }
      if (s % 2 === 0) sawBass(t, F(b.root - 12), 0.11, 0.28, 1300);
      if (s % 2 === 1) {
        const tn = b.chord[s % b.chord.length];
        supersaw(t, F(b.root + 36 + tn), 0.08, { gain: 0.06, voices: 3, detune: 18, lp: 5200, release: 0.03 });
      }
    }
  },
  chiptune: {
    name: '8-Bit Hero',
    bpm: 138,
    play(step, t) {
      const b = barAt(HAPPY, step);
      const s = step % 16;
      if (s % 4 === 0) kick(t, 0.65);
      if (s === 4 || s === 12) snare(t, 0.35);
      if (s % 2 === 1) hat(t, false, 0.05);
      if (s % 2 === 0) tone(F(b.root - 12), t, 0.12, { type: 'triangle', gain: 0.26, bus: musicBus, release: 0.02 });
      const arp = [0, b.chord[1], b.chord[2], b.chord[1]];
      tone(F(b.root + 24 + arp[s % arp.length]), t, 0.09, { type: 'square', gain: 0.14, bus: musicBus, release: 0.03 });
      if (s % 8 === 0) tone(F(b.root + 36), t, 0.06, { type: 'square', gain: 0.05, bus: musicBus });
    }
  },
  synthwave: {
    name: 'Sunset Cruise',
    bpm: 112,
    play(step, t) {
      const b = barAt(EUPH, step);
      const s = step % 16;
      if (s === 0 || s === 8) kick(t, 0.6);
      if (s === 4 || s === 12) snare(t, 0.3);
      if (s % 2 === 1) hat(t, false, 0.04);
      if (s % 4 === 0) sawBass(t, F(b.root - 12), 0.4, 0.2, 800);
      if (s === 0) pad(t, b.chord.map((c) => F(b.root + 12 + c)), 1.85, 0.045);
      if (s % 2 === 0) {
        const tn = b.chord[Math.floor(s / 2) % b.chord.length];
        supersaw(t, F(b.root + 24 + tn), 0.18, { gain: 0.05, voices: 2, detune: 10, lp: 3000, release: 0.15 });
      }
    }
  },
  pursuit: {
    name: 'Boss Pursuit',
    bpm: 174,
    play(step, t) {
      const b = barAt(DARK, step);
      const s = step % 16;
      if (s === 0 || s === 6 || s === 10) kick(t, 0.95);
      if (s === 4 || s === 12) snare(t, 0.5);
      if (s === 14) snare(t, 0.25);
      hat(t, s % 4 === 2, 0.08);
      sawBass(t, F(b.root - 12), 0.075, 0.24, 1500);
      const tn = b.chord[s % b.chord.length];
      supersaw(t, F(b.root + 24 + tn), 0.09, { gain: 0.1, voices: 4, detune: 20, lp: 3900, release: 0.03 });
      if (s === 0) stab(t, b.chord.slice(0, 3).map((c) => F(b.root + 12 + c)), 0.4, 0.06);
    }
  }
};

const ALL_IDS = Object.keys(TRACKS);
const SESSION_POOL = ['stadium', 'turbo', 'chiptune', 'synthwave'];

export const trackList = ALL_IDS.map((id) => ({ id, name: TRACKS[id].name }));

let musicTimer = null;
let nextStepTime = 0;
let stepCounter = 0;
let currentTrack = 'menu';
let energeticChoice = 'stadium';

function tick() {
  if (!ctx) return;
  const track = TRACKS[currentTrack] ?? TRACKS.menu;
  const stepDur = 60 / track.bpm / 4; // zestiende noot
  while (nextStepTime < ctx.currentTime + 0.12) {
    track.play(stepCounter, nextStepTime);
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
  nowPlaying.set(TRACKS[currentTrack]?.name ?? '');
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
  nowPlaying.set(TRACKS[trackId].name);
}

// Volgend nummer in de jukebox (werkt overal). Geeft de nieuwe naam terug.
export function nextTrack() {
  const i = ALL_IDS.indexOf(currentTrack);
  const next = ALL_IDS[(i + 1) % ALL_IDS.length];
  if (SESSION_POOL.includes(next)) energeticChoice = next;
  setTrack(next);
  return TRACKS[next].name;
}

// Kies (random) het sessienummer; boss krijgt het intense 'pursuit'.
export function pickSession(isBoss) {
  energeticChoice = isBoss ? 'pursuit' : SESSION_POOL[Math.floor(Math.random() * SESSION_POOL.length)];
  setTrack(energeticChoice);
}

// Schakel de muziek mee met het actieve scherm.
export function setContext(screen) {
  if (screen === 'session' || screen === 'results') setTrack(energeticChoice);
  else setTrack('menu');
}

// =========================================================================
//  Aansturing
// =========================================================================

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
