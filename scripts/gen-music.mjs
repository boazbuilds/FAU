// Genereert royalty-vrije, zelfgemaakte lo-fi loops (geen externe assets/rechten).
// Rendert offline naar 16-bit PCM WAV (mono, 22050 Hz — past bij de lo-fi-vibe en
// houdt de bestanden klein). De loops zijn naadloos gemaakt via een crossfade van
// de staart over de kop, zodat Howler ze gatloos kan herhalen.
//
// Run: node scripts/gen-music.mjs   → src/assets/audio/{lofi,ambient}.wav
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// --- Eén oscillator-stem met ADSR-achtige envelop in een mono-buffer ---
function osc(buf, start, dur, freq, { type = 'sine', gain = 0.2, attack = 0.006, release = 0.12, decayTo = 0.7, detune = 0 } = {}) {
  const f = freq * Math.pow(2, detune / 1200);
  const a = Math.max(1, Math.floor(attack * SR));
  const sustain = Math.floor(dur * SR);
  const r = Math.max(1, Math.floor(release * SR));
  const total = sustain + r;
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= buf.length) continue;
    let e;
    if (i < a) e = i / a;
    else if (i < sustain) e = 1 - (1 - decayTo) * ((i - a) / Math.max(1, sustain - a));
    else e = decayTo * (1 - (i - sustain) / r);
    if (e <= 0) continue;
    const ph = i / SR;
    let s;
    if (type === 'sine') s = Math.sin(2 * Math.PI * f * ph);
    else if (type === 'triangle') s = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * ph));
    else if (type === 'sawtooth') s = 2 * ((f * ph) % 1) - 1;
    else s = Math.sin(2 * Math.PI * f * ph);
    buf[idx] += s * gain * e;
  }
}

function noise(buf, start, dur, { gain = 0.2, hp = false } = {}) {
  const n = Math.floor(dur * SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= buf.length) continue;
    const e = 1 - i / n;
    let s = Math.random() * 2 - 1;
    if (hp) { const cur = s; s = s - prev; prev = cur; } // simpele highpass voor hats/snare
    buf[idx] += s * gain * e * e;
  }
}

// --- Instrumenten ---
function epiano(buf, t, freq, dur, gain = 0.16) {
  osc(buf, t, dur, freq, { type: 'sine', gain, attack: 0.012, release: 0.5, decayTo: 0.55 });
  osc(buf, t, dur, freq, { type: 'triangle', gain: gain * 0.5, attack: 0.012, release: 0.5, detune: 6, decayTo: 0.5 });
  osc(buf, t, Math.min(dur, 0.18), freq * 2, { type: 'sine', gain: gain * 0.3, attack: 0.003, release: 0.12, decayTo: 0.2 }); // "tine"
}
function pad(buf, t, freqs, dur, gain = 0.06) {
  for (const f of freqs) {
    osc(buf, t, dur, f, { type: 'sawtooth', gain, attack: 0.25, release: 0.6, detune: -8, decayTo: 0.9 });
    osc(buf, t, dur, f, { type: 'sawtooth', gain, attack: 0.25, release: 0.6, detune: 8, decayTo: 0.9 });
  }
}
function bass(buf, t, freq, dur, gain = 0.32) {
  osc(buf, t, dur, freq, { type: 'sine', gain, attack: 0.01, release: 0.08, decayTo: 0.8 });
  osc(buf, t, dur, freq, { type: 'sawtooth', gain: gain * 0.22, attack: 0.01, release: 0.08, decayTo: 0.6 });
}
function kick(buf, t, gain = 0.85) {
  const n = Math.floor(0.16 * SR);
  for (let i = 0; i < n; i++) {
    const idx = t + i;
    if (idx < 0 || idx >= buf.length) continue;
    const env = Math.pow(1 - i / n, 2.2);
    const f = 120 * Math.pow(44 / 120, i / n);
    buf[idx] += Math.sin((2 * Math.PI * f * i) / SR) * gain * env;
  }
}
function rim(buf, t, gain = 0.18) {
  noise(buf, t, 0.06, { gain: gain * 0.7, hp: true });
  osc(buf, t, 0.05, midi(64), { type: 'triangle', gain: gain * 0.5, attack: 0.001, release: 0.04, decayTo: 0.1 });
}
function hat(buf, t, gain = 0.06) {
  noise(buf, t, 0.03, { gain, hp: true });
}
function crackle(buf, t, gain = 0.02) {
  // korte vinyl-tik
  const n = Math.floor(0.004 * SR);
  for (let i = 0; i < n; i++) {
    const idx = t + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += (Math.random() * 2 - 1) * gain;
  }
}

// Am7 – Fmaj7 – Cmaj7 – G7 (warme, jazzy lo-fi-progressie)
const PROG = [
  { root: 57, chord: [0, 3, 7, 10] }, // Am7
  { root: 53, chord: [0, 4, 7, 11] }, // Fmaj7
  { root: 60, chord: [0, 4, 7, 11] }, // Cmaj7
  { root: 55, chord: [0, 4, 7, 10] } // G7
];
// Rustige Rhodes-melodie per maat (16 stappen; null = stilte; halve tonen t.o.v. root+24)
const MELO = [
  [0, null, null, 7, null, 5, null, null, 3, null, null, 7, null, null, 5, null],
  [7, null, null, 5, null, null, 4, null, 3, null, null, null, 5, null, null, null],
  [12, null, null, 7, null, 5, null, 7, null, null, 5, null, 3, null, null, null],
  [7, null, 5, null, 4, null, null, 3, null, null, 2, null, 0, null, null, null]
];

function renderLoop({ bars = 8, bpm = 78, drums = true, melody = true }) {
  const spb = (SR * 60) / bpm; // samples per beat
  const stepN = spb / 4; // 16e noot
  const barN = Math.round(spb * 4);
  const loopLen = barN * bars;
  const xf = Math.floor(0.28 * SR);
  const buf = new Float32Array(loopLen + xf + Math.floor(0.8 * SR));
  const swing = stepN * 0.16;

  for (let bar = 0; bar < bars + 1; bar++) {
    // (bar == bars) = de extra "kop van de volgende loop" voor de crossfade-staart
    const b = PROG[bar % PROG.length];
    const mel = MELO[bar % MELO.length];
    const bs = Math.round(bar * barN);
    // pad + bas per maat
    pad(buf, bs, b.chord.map((c) => midi(b.root + 12 + c)), (barN / SR) * 0.98, 0.05);
    bass(buf, bs, midi(b.root - 12), (barN / SR) * 0.5, 0.3);
    bass(buf, bs + Math.round(barN * 0.5), midi(b.root - 12), (barN / SR) * 0.45, 0.26);
    for (let s = 0; s < 16; s++) {
      const t = Math.round(bs + s * stepN + (s % 2 ? swing : 0));
      if (drums) {
        if (s === 0 || s === 10) kick(buf, t, s === 0 ? 0.85 : 0.6);
        if (s === 4 || s === 12) rim(buf, t, 0.2);
        if (s % 2 === 1) hat(buf, t, s % 4 === 3 ? 0.07 : 0.045);
      }
      if (Math.random() < (drums ? 0.18 : 0.1)) crackle(buf, t, 0.016);
      if (melody && mel[s] != null) epiano(buf, t, midi(b.root + 24 + mel[s]), drums ? 0.45 : 0.9, drums ? 0.16 : 0.13);
    }
  }

  // --- master: one-pole lowpass (tape-warmte) + zachte clip + normaliseren ---
  const a = 0.30; // ~ zachte lowpass
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] = Math.tanh(y * 1.25);
  }
  // naadloze loop: staart (loopLen..loopLen+xf) over de kop heen mixen
  const out = new Float32Array(loopLen);
  for (let i = 0; i < loopLen; i++) {
    if (i < xf) {
      const k = i / xf; // 0→1
      out[i] = buf[i] * k + buf[loopLen + i] * (1 - k);
    } else out[i] = buf[i];
  }
  // normaliseer naar piek ~0.9
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
  return buf.length;
}

mkdirSync(OUT, { recursive: true });
const lofi = renderLoop({ bars: 8, bpm: 78, drums: true, melody: true });
const ambient = renderLoop({ bars: 8, bpm: 66, drums: false, melody: true });
const s1 = writeWav(join(OUT, 'lofi.wav'), lofi);
const s2 = writeWav(join(OUT, 'ambient.wav'), ambient);
console.log(`lofi.wav: ${(s1 / 1024 / 1024).toFixed(2)} MB · ambient.wav: ${(s2 / 1024 / 1024).toFixed(2)} MB`);
