// Audio-engine. SFX worden live gesynthetiseerd (Web Audio, snel + assetvrij);
// de ACHTERGRONDMUZIEK is een echte, zelfgemaakte lo-fi loop die via Howler.js
// gatloos en betrouwbaar speelt (mobiel-unlock + naadloos loopen out of the box).
// Volledig import-veilig: zonder Web Audio (tests/SSR) doet alles niets.
import { writable } from 'svelte/store';
import { Howl, Howler } from 'howler';
import lofiUrl from '../assets/audio/lofi.wav';
import ambientUrl from '../assets/audio/ambient.wav';

// Naam van het spelende nummer (voor de UI). Leeg = niets/uit.
export const nowPlaying = writable('');
// Of de audio echt "draait" (context running) — voedt een UI-hint.
export const audioReady = writable(false);

let ctx = null; // alleen voor SFX
let master = null;
let sfxBus = null;
let noiseBuffer = null;

let sfxOn = true;
let musicOn = true;

const SFX_VOL = 0.85;
const MUSIC_VOL = 0.55; // doelvolume van de muziek (Howler, 0..1)

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

// MIDI-nootnummer → frequentie (Hz).
export function midiToFreq(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
const F = midiToFreq;

// --- Lage-niveau bouwstenen (SFX) ---
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
//  SFX (procedureel)
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
//  Muziek — echte lo-fi loops via Howler.js (chill, naadloos, betrouwbaar)
// =========================================================================

const MUSIC_TRACKS = [
  { id: 'ambient', name: 'Diepe Focus', url: ambientUrl },
  { id: 'lofi', name: 'Lo-Fi Studie', url: lofiUrl }
];
export const trackList = MUSIC_TRACKS.map(({ id, name }) => ({ id, name }));

const howls = {}; // id → Howl (lazy)
let currentTrack = 'ambient';
let sessionTrack = 'lofi';
let currentHowl = null;

function trackById(id) {
  return MUSIC_TRACKS.find((t) => t.id === id);
}

// Eén persistente Howl per track (buiten de render-cyclus → overleeft re-renders).
function getHowl(id) {
  const tr = trackById(id);
  if (!tr) return null;
  if (howls[id]) return howls[id];
  try {
    howls[id] = new Howl({ src: [tr.url], format: ['wav'], loop: true, html5: false, preload: true, volume: 0 });
  } catch (e) {
    return null;
  }
  return howls[id];
}

export function startMusic(trackId) {
  if (trackId && trackById(trackId)) currentTrack = trackId;
  nowPlaying.set(trackById(currentTrack)?.name ?? '');
  if (!musicOn) return;
  try {
    const h = getHowl(currentTrack);
    if (!h) return;
    if (currentHowl && currentHowl !== h && currentHowl.playing()) {
      const old = currentHowl;
      old.fade(old.volume(), 0, 500);
      setTimeout(() => { try { old.pause(); } catch (e) {} }, 520);
    }
    currentHowl = h;
    if (!h.playing()) {
      h.volume(0);
      h.play();
    }
    h.fade(h.volume(), MUSIC_VOL, 600);
  } catch (e) {
    /* import-veilig */
  }
}

export function stopMusic() {
  try {
    if (currentHowl && currentHowl.playing()) {
      const h = currentHowl;
      h.fade(h.volume(), 0, 350);
      setTimeout(() => { try { h.pause(); } catch (e) {} }, 380);
    }
  } catch (e) {
    /* genegeerd */
  }
}

// Wissel van track (met crossfade via startMusic).
export function setTrack(trackId) {
  if (!trackById(trackId) || trackId === currentTrack) return;
  currentTrack = trackId;
  nowPlaying.set(trackById(trackId)?.name ?? '');
  if (musicOn) startMusic(trackId);
}

// Volgend nummer in de jukebox. Geeft de nieuwe naam terug.
export function nextTrack() {
  const i = MUSIC_TRACKS.findIndex((t) => t.id === currentTrack);
  const next = MUSIC_TRACKS[(i + 1) % MUSIC_TRACKS.length];
  sessionTrack = next.id;
  setTrack(next.id);
  return next.name;
}

// Kies het sessienummer. Alles is chill; de boss/snelle modi krijgen de iets
// ritmischer 'lofi', rustig studeren mag ook 'ambient' zijn.
export function pickSession(isBoss) {
  sessionTrack = isBoss ? 'lofi' : Math.random() < 0.5 ? 'lofi' : 'ambient';
  setTrack(sessionTrack);
}

// Schakel de muziek mee met het scherm: rustig in het menu, sessietrack tijdens spelen.
export function setContext(screen) {
  if (screen === 'session' || screen === 'results') setTrack(sessionTrack);
  else setTrack('ambient');
}

// =========================================================================
//  Aansturing / unlock
// =========================================================================

function syncReady() {
  const sfxRunning = !!ctx && ctx.state === 'running';
  let musicRunning = false;
  try {
    musicRunning = !!Howler.ctx && Howler.ctx.state === 'running';
  } catch (e) {
    /* genegeerd */
  }
  audioReady.set(sfxRunning || musicRunning);
}

// Roep aan vanuit een user-gesture. Ontgrendelt de SFX-context én Howler, en
// start de muziek als die aanstaat. Idempotent.
export function unlock() {
  ensure();
  try {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (e) {
    /* genegeerd */
  }
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
  } catch (e) {
    /* genegeerd */
  }
  syncReady();
  if (musicOn) startMusic();
}

let gestureBound = false;
// Bind globale gesture-handlers die de audio ontgrendelen (mobiel faalt vaak de
// eerste keer; blijft proberen tot het echt loopt).
export function armGestureUnlock() {
  if (gestureBound || typeof window === 'undefined') return;
  gestureBound = true;
  const handler = () => {
    unlock();
    syncReady();
    let running = false;
    try {
      running = !!Howler.ctx && Howler.ctx.state === 'running';
    } catch (e) {
      /* genegeerd */
    }
    if (running || !musicOn) {
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
  // Pauzeer bij tab weg, hervat bij terugkomst (geen muziek op de achtergrond).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      try { if (currentHowl && currentHowl.playing()) currentHowl.pause(); } catch (e) {}
    } else if (musicOn) {
      try {
        if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
      } catch (e) {}
      startMusic();
    }
  });
}

export function setSfxEnabled(on) {
  sfxOn = !!on;
}

export function setMusicEnabled(on) {
  musicOn = !!on;
  if (musicOn) startMusic();
  else stopMusic();
}

export function isMusicOn() {
  return musicOn;
}

// =========================================================================
//  Diagnose
// =========================================================================
export function diagnostics() {
  if (typeof window === 'undefined') return 'geen window';
  return [
    'sfx-ctx: ' + (ctx ? ctx.state : 'geen'),
    'howler: ' + (() => { try { return Howler.ctx?.state ?? 'geen'; } catch (e) { return '?'; } })(),
    'music: ' + (musicOn ? 'aan' : 'uit'),
    'track: ' + currentTrack,
    'playing: ' + (() => { try { return currentHowl?.playing() ? 'ja' : 'nee'; } catch (e) { return '?'; } })()
  ].join(' · ');
}

// Luide testtoon rechtstreeks naar de speaker (bypasst alles) — voor het
// diagnosticeren van "geen geluid op mobiel".
export function testTone() {
  if (!ensure()) return 'geen context';
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (e) {
    /* genegeerd */
  }
  syncReady();
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.65);
  } catch (e) {
    return 'fout: ' + (e?.message ?? e);
  }
  return diagnostics();
}
