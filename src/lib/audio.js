// Procedurele audio-engine (Web Audio API). Geen assets: alle geluiden én de
// achtergrondmuziek worden live gesynthetiseerd. Volledig import-veilig: zonder
// Web Audio (bv. in tests/SSR) doet alles niets en gooit niets.
import { writable } from 'svelte/store';

// Naam van het spelende nummer (voor de UI). Leeg = niets/uit.
export const nowPlaying = writable('');

// Of de audio echt "draait" (AudioContext === running). false = nog geen geluid
// mogelijk (bv. iOS vóór de eerste geslaagde gesture). Voedt een UI-hint.
export const audioReady = writable(false);

let ctx = null;
let master = null; // master gain → destination (via compressor)
let musicBus = null; // muziek loopt hierdoor (apart regelbaar)
let musicSum = null; // alle muziek-stemmen → hier → sidechain-VCA → musicBus
let sfxBus = null; // effecten lopen hierdoor
let reverbSend = null; // galm-send (gedeeld door instrumenten)
let delaySend = null; // tempo-delay-send (ruimte/echo)
let noiseBuffer = null;

let sfxOn = true;
let musicOn = true;

const MUSIC_VOL = 0.26;
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

    // Master-keten: alles → compressor (lijmt de mix, maakt 'm luider/strakker) → out.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 3;
    comp.attack.value = 0.006;
    comp.release.value = 0.22;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.92;
    master.connect(comp);

    // Muziek: alle stemmen → musicSum → sidechain-VCA (musicBus) → master.
    // De VCA "dipt" bij elke kick = de pompende dance-ademhaling.
    musicBus = ctx.createGain();
    musicBus.gain.value = 0; // volume-fade in/out
    musicBus.connect(master);
    musicSum = ctx.createGain();
    musicSum.gain.value = 1;
    musicSum.connect(musicBus);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(master);

    // Galm-send (gegenereerde impulse response) — geeft ruimte/diepte.
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(2.2, 2.6);
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(conv);
    const revWet = ctx.createGain();
    revWet.gain.value = 0.9;
    conv.connect(revWet);
    revWet.connect(musicSum);

    // Tempo-delay-send — subtiele echo's op leads/stabs.
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.32;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dWet = ctx.createGain();
    dWet.gain.value = 0.5;
    delaySend = ctx.createGain();
    delaySend.gain.value = 1;
    delaySend.connect(delay);
    delay.connect(fb);
    fb.connect(delay); // feedback-lus
    delay.connect(dWet);
    dWet.connect(musicSum);

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

// Genereer een impulse-respons (afnemende ruis) voor de galm — geen asset nodig.
function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(seconds * rate));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// Stuur een bron naar een effect-send met een bepaald niveau.
function sendTo(node, target, amount) {
  if (!target || !amount) return;
  const g = ctx.createGain();
  g.gain.value = amount;
  node.connect(g);
  g.connect(target);
}

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

// --- Instrumenten (alle muziek → musicSum, zodat ze de sidechain-pomp + fx krijgen) ---

// Sidechain: dip de muziek kort bij elke kick (de pompende dance-"ademhaling").
function duck(t, depth = 0.55) {
  if (!musicBus) return;
  const g = musicBus.gain;
  const base = musicOn ? MUSIC_VOL : 0.0001;
  g.cancelScheduledValues(t);
  g.setValueAtTime(Math.max(0.0001, base * (1 - depth)), t);
  g.linearRampToValueAtTime(base, t + 0.18);
}

function kick(t, gain = 0.9) {
  if (!ctx) return;
  duck(t, 0.5);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  // lichte tik bovenop voor "punch"
  const click = ctx.createOscillator();
  const cg = ctx.createGain();
  click.type = 'triangle';
  click.frequency.setValueAtTime(900, t);
  cg.gain.setValueAtTime(gain * 0.25, t);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  o.connect(g);
  click.connect(cg);
  g.connect(musicSum);
  cg.connect(musicSum);
  o.start(t); o.stop(t + 0.22);
  click.start(t); click.stop(t + 0.03);
}

function snare(t, gain = 0.45) {
  noise(t, 0.16, { gain: gain * 0.5, hp: 1700, lp: 9500, bus: musicSum });
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  g.gain.setValueAtTime(gain * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(musicSum);
  sendTo(g, reverbSend, gain * 0.18); // beetje galm op de snare
  o.start(t);
  o.stop(t + 0.14);
}

function hat(t, open = false, gain = 0.1) {
  noise(t, open ? 0.12 : 0.03, { gain, hp: 8800, bus: musicSum });
}

function clap(t, gain = 0.3) {
  [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.045, { gain, hp: 1200, lp: 6500, bus: musicSum }));
}

// Bassline met sub-octaaf eronder = vollere low-end.
function sawBass(t, freq, dur, gain = 0.28, lp = 1100) {
  if (!ctx) return;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = lp;
  f.Q.value = 6;
  env(g, t, dur, gain, 0.004, 0.02);
  // hoofd-saw
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  o.connect(f);
  // sub-sine een octaaf lager
  const sub = ctx.createOscillator();
  const sg = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.value = freq / 2;
  env(sg, t, dur, gain * 0.7, 0.004, 0.02);
  sub.connect(sg);
  sg.connect(musicSum);
  f.connect(g);
  g.connect(musicSum);
  o.start(t); o.stop(t + dur + 0.05);
  sub.start(t); sub.stop(t + dur + 0.05);
}

// "Supersaw": dikker (meer stemmen + sub-octaaf-stem) en met galm/delay-send.
function supersaw(t, freq, dur, opts = {}) {
  if (!ctx) return;
  const { gain = 0.1, voices = 5, detune = 16, lp = 4000, release = 0.06, reverb = 0.14, delay = 0.1 } = opts;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = lp;
  f.Q.value = 1.2;
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
  // sub-octaaf-stem voor body
  const sub = ctx.createOscillator();
  sub.type = 'sawtooth';
  sub.frequency.value = freq / 2;
  sub.connect(f);
  sub.start(t);
  sub.stop(t + dur + release + 0.03);
  f.connect(g);
  g.connect(musicSum);
  sendTo(g, reverbSend, gain * reverb);
  sendTo(g, delaySend, gain * delay);
}

function stab(t, freqs, dur, gain = 0.06) {
  freqs.forEach((fq) => supersaw(t, fq, dur, { gain, voices: 5, detune: 18, lp: 3400, release: 0.05, reverb: 0.2, delay: 0.18 }));
}

// Zingende lead-noot: square+saw met een vleugje galm/delay = een melodie die
// blijft hangen. Dit geeft de tracks een herkenbare "topline".
function lead(t, freq, dur, opts = {}) {
  if (!ctx) return;
  const { gain = 0.12, lp = 5200, release = 0.08, type = 'square' } = opts;
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = lp;
  env(g, t, dur, gain, 0.005, release);
  const o1 = ctx.createOscillator();
  o1.type = type;
  o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = freq;
  o2.detune.value = 6; // lichte chorus
  o1.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(musicSum);
  sendTo(g, reverbSend, gain * 0.18);
  sendTo(g, delaySend, gain * 0.28);
  o1.start(t); o1.stop(t + dur + release + 0.03);
  o2.start(t); o2.stop(t + dur + release + 0.03);
}

// Melodieregels per track (16 stappen; null = stilte). Tonen = halve-toon-offset
// t.o.v. de grondtoon van de huidige maat (+ octaaf via de play-functie).
const MEL = {
  stadium: [0, null, 7, null, 12, null, 7, 10, 12, null, 10, 7, null, 5, 3, null],
  turbo: [12, 12, null, 10, 7, null, 12, null, 14, 12, 10, null, 7, null, 10, null],
  chiptune: [0, 4, 7, 12, 7, 4, null, 7, 9, null, 7, 4, 0, null, 2, null],
  synthwave: [7, null, null, 5, null, 4, null, null, 3, null, 5, null, 7, null, null, null],
  pursuit: [0, null, 3, null, 7, 6, 7, null, 10, null, 7, null, 3, null, 0, null],
  menu: [null, null, 7, null, null, null, 5, null, null, null, 3, null, null, null, null, null]
};

function pad(t, freqs, dur, gain = 0.05) {
  freqs.forEach((fq) => supersaw(t, fq, dur, { gain, voices: 7, detune: 18, lp: 2600, release: 0.5, reverb: 0.35, delay: 0.12 }));
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
      const m = MEL.menu[s];
      if (m != null) lead(t, F(b.root + 24 + m), 0.4, { gain: 0.07, lp: 2800, release: 0.3 });
    }
  },
  stadium: {
    name: 'Stadium Rush',
    bpm: 150,
    play(step, t) {
      const b = barAt(EUPH, step);
      const s = step % 16;
      if (s === 0) pad(t, b.chord.map((c) => F(b.root + 12 + c)), 1.9, 0.03); // warme onderlaag
      if (s % 4 === 0) kick(t, 0.95);
      if (s === 4 || s === 12) snare(t, 0.4);
      hat(t, s % 4 === 2, s % 2 === 0 ? 0.05 : 0.09);
      // rollende offbeat-bas (ducks onder de kick)
      if (s % 4 !== 0) sawBass(t, F(b.root - 12 + (s % 2 ? 12 : 0)), 0.1, 0.24, 1100);
      else sawBass(t, F(b.root - 12), 0.1, 0.26, 1000);
      const tn = b.chord[s % b.chord.length];
      supersaw(t, F(b.root + 24 + tn), 0.1, { gain: 0.06, voices: 5, detune: 14, lp: 4400, release: 0.04 });
      if (s === 0) stab(t, b.chord.slice(0, 3).map((c) => F(b.root + 12 + c)), 0.45, 0.05);
      const m = MEL.stadium[s];
      if (m != null) lead(t, F(b.root + 24 + m), 0.14, { gain: 0.13, lp: 5000 });
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
      const m = MEL.turbo[s];
      if (m != null) lead(t, F(b.root + 24 + m), 0.11, { gain: 0.12, lp: 5600 });
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
      if (s % 2 === 0) tone(F(b.root - 12), t, 0.12, { type: 'triangle', gain: 0.26, bus: musicSum, release: 0.02 });
      // begeleidende arp zachtjes, plus een duidelijke chiptune-melodie erboven
      const arp = [0, b.chord[1], b.chord[2], b.chord[1]];
      tone(F(b.root + 24 + arp[s % arp.length]), t, 0.08, { type: 'square', gain: 0.08, bus: musicSum, release: 0.03 });
      const m = MEL.chiptune[s];
      if (m != null) lead(t, F(b.root + 24 + m), 0.1, { gain: 0.13, lp: 6000, type: 'square' });
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
      const m = MEL.synthwave[s];
      if (m != null) lead(t, F(b.root + 12 + m), 0.5, { gain: 0.1, lp: 3200, release: 0.25, type: 'sawtooth' });
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
      supersaw(t, F(b.root + 24 + tn), 0.09, { gain: 0.07, voices: 4, detune: 20, lp: 3900, release: 0.03 });
      if (s === 0) stab(t, b.chord.slice(0, 3).map((c) => F(b.root + 12 + c)), 0.4, 0.06);
      const m = MEL.pursuit[s];
      if (m != null) lead(t, F(b.root + 24 + m), 0.1, { gain: 0.12, lp: 4800, type: 'sawtooth' });
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

const SWING = 0.18; // shuffle: oneven 16e-noten iets later = groove
function tick() {
  if (!ctx) return;
  const track = TRACKS[currentTrack] ?? TRACKS.menu;
  const stepDur = 60 / track.bpm / 4; // zestiende noot
  while (nextStepTime < ctx.currentTime + 0.12) {
    const swing = stepCounter % 2 === 1 ? stepDur * SWING : 0;
    track.play(stepCounter, nextStepTime + swing);
    nextStepTime += stepDur;
    stepCounter++;
  }
  musicTimer = setTimeout(tick, 25);
}

export function startMusic(trackId) {
  if (!ensure()) return;
  if (trackId && TRACKS[trackId]) currentTrack = trackId;
  if (!musicOn) return;
  // Mobiel suspend't de context regelmatig; altijd proberen te hervatten.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  nowPlaying.set(TRACKS[currentTrack]?.name ?? '');
  if (musicTimer) return; // loopt al
  nextStepTime = ctx.currentTime + 0.08;
  stepCounter = 0;
  // musicBus = sidechain-VCA (door duck() bestuurd); de in/uit-fade zit op musicSum.
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(MUSIC_VOL, ctx.currentTime);
  musicSum.gain.cancelScheduledValues(ctx.currentTime);
  musicSum.gain.setValueAtTime(Math.max(0.0001, musicSum.gain.value), ctx.currentTime);
  musicSum.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
  tick();
}

export function stopMusic() {
  if (!ctx) return;
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  // Fade op musicSum (musicBus blijft vrij voor de sidechain).
  musicSum.gain.cancelScheduledValues(ctx.currentTime);
  musicSum.gain.setValueAtTime(musicSum.gain.value, ctx.currentTime);
  musicSum.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
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

// Speelt een onhoorbare buffer af binnen de user-gesture. Dit is op iOS/Safari
// vaak de enige manier om de AudioContext betrouwbaar te "ontgrendelen".
function silentPing() {
  if (!ctx) return;
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) {
    /* genegeerd */
  }
}

// iOS-specifiek: een stil, loopend <audio>-element. Web Audio wordt op iOS
// gedempt door de hardware mute-switch; een spelend media-element zet iOS in de
// 'playback'-sessie waardoor Web Audio hoorbaar wordt, óók met de mute-switch
// aan. (Aanpak van unmute.js / Howler.) Geen asset nodig: korte stille WAV.
let silentEl = null;
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
function kickSilentMediaElement() {
  if (typeof Audio === 'undefined') return;
  try {
    if (!silentEl) {
      silentEl = new Audio(SILENT_WAV);
      silentEl.loop = true;
      silentEl.volume = 0.0001; // praktisch stil, maar wél "echte" media
      silentEl.setAttribute('playsinline', '');
    }
    const p = silentEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {
    /* genegeerd */
  }
}

// Roep aan vanuit een user-gesture. Idempotent en zelfherstellend: als de
// context nog 'suspended' is (iOS slikt de eerste resume soms), probeert de
// volgende gesture het opnieuw.
function syncReady() {
  audioReady.set(!!ctx && ctx.state === 'running');
}

export function unlock() {
  if (!ensure()) return;
  kickSilentMediaElement(); // iOS: open de media-sessie (mute-switch omzeilen)
  silentPing();
  const afterResume = () => {
    syncReady();
    if (musicOn) startMusic();
  };
  if (ctx.state === 'suspended') {
    const p = ctx.resume();
    if (p && typeof p.then === 'function') p.then(afterResume).catch(syncReady);
    else afterResume();
  } else {
    afterResume();
  }
}

let gestureBound = false;
// Bind globale gesture-handlers die de audio ontgrendelen. Blijven gebonden tot
// de context echt draait én de muziek loopt (mobiel faalt vaak de 1e keer).
export function armGestureUnlock() {
  if (gestureBound || typeof window === 'undefined') return;
  gestureBound = true;
  const handler = () => {
    unlock();
    syncReady();
    // Pas afkoppelen als het echt gelukt is (anders volgende tik opnieuw proberen).
    if (ctx && ctx.state === 'running' && (musicTimer || !musicOn)) {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('touchend', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
      gestureBound = false;
    }
  };
  window.addEventListener('pointerdown', handler, { passive: true });
  window.addEventListener('touchend', handler, { passive: true });
  window.addEventListener('keydown', handler);
  window.addEventListener('click', handler);
  // Herstel na terugkeren naar het tabblad (mobiel suspend't de context én
  // pauzeert het stille media-element).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && musicOn) {
      kickSilentMediaElement();
      if (ctx && ctx.state === 'suspended') ctx.resume().then(() => startMusic()).catch(() => {});
    }
  });
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

// --- Diagnose (voor het oplossen van "geen geluid op mobiel") ---

// Live status van de audio-engine, als leesbare tekst voor in de UI.
export function diagnostics() {
  if (typeof window === 'undefined') return 'geen window';
  if (!supported()) return 'Web Audio niet ondersteund';
  if (!ctx) return 'context: niet aangemaakt';
  return [
    'state: ' + ctx.state,
    'rate: ' + Math.round(ctx.sampleRate),
    'out: ' + (ctx.destination?.maxChannelCount ?? '?') + 'ch',
    'music: ' + (musicOn ? 'aan' : 'uit'),
    'loop: ' + (musicTimer ? 'ja' : 'nee'),
    'musicBus: ' + (musicBus ? musicBus.gain.value.toFixed(3) : '—'),
    'musicSum: ' + (musicSum ? musicSum.gain.value.toFixed(3) : '—'),
    'master: ' + (master ? master.gain.value.toFixed(2) : '—'),
    'track: ' + currentTrack
  ].join(' · ');
}

// Speelt een luide testtoon RECHTSTREEKS naar de speaker (bypasst de hele
// muziek-/effectketen: geen master, compressor, musicBus of sidechain). Splitst
// het probleem: hoor je dit wél maar de muziek niet → keten-bug; hoor je dit
// óók niet → iOS-routing/hardware. Geeft de diagnose-tekst terug.
export function testTone() {
  if (!ensure()) return 'geen context';
  kickSilentMediaElement();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  syncReady();
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); // flink hoorbaar
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g);
    g.connect(ctx.destination); // ← direct naar de speaker
    o.start(t);
    o.stop(t + 0.65);
  } catch (e) {
    return 'fout: ' + (e?.message ?? e);
  }
  return diagnostics();
}
