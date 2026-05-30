// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';
import * as audio from './audio.js';

// --- Mini-mock van de Web Audio API om te bewijzen dat de graaf echt wordt aangestuurd ---
let oscCount = 0;
let startCount = 0;
let resumeCount = 0;
const fakeParam = () => ({
  value: 0,
  setValueAtTime() { return this; },
  linearRampToValueAtTime() { return this; },
  exponentialRampToValueAtTime() { return this; },
  cancelScheduledValues() { return this; }
});
class FakeAC {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'suspended';
    this.destination = {};
  }
  resume() { resumeCount++; this.state = 'running'; return Promise.resolve(); }
  createGain() { return { gain: fakeParam(), connect() {} }; }
  createOscillator() {
    oscCount++;
    return { type: 'square', frequency: fakeParam(), detune: fakeParam(), connect() {}, start() { startCount++; }, stop() {} };
  }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: 'lowpass', frequency: fakeParam(), connect() {} }; }
  createBuffer(_ch, len) { return { getChannelData: () => new Float32Array(len) }; }
}

describe('audio-engine', () => {
  it('midiToFreq klopt', () => {
    expect(audio.midiToFreq(69)).toBeCloseTo(440, 5);
    expect(audio.midiToFreq(57)).toBeCloseTo(220, 5);
    expect(audio.midiToFreq(81)).toBeCloseTo(880, 5);
  });

  it('is import-veilig en gooit niets zonder Web Audio (jsdom)', () => {
    expect(() => {
      audio.setSfxEnabled(true);
      audio.setMusicEnabled(true);
      audio.unlock();
      audio.correct(0);
      audio.correct(7);
      audio.wrong();
      audio.partial();
      audio.fanfare();
      audio.comboFlair(5);
      audio.levelUp();
      audio.tap();
      audio.startMusic('stadium');
      audio.setTrack('menu');
      audio.nextTrack();
      audio.pickSession(false);
      audio.pickSession(true);
      audio.setContext('session');
      audio.setContext('home');
      audio.stopMusic();
      audio.setMusicEnabled(false);
    }).not.toThrow();
  });

  it('biedt meerdere muzieknummers', () => {
    expect(audio.trackList.length).toBeGreaterThanOrEqual(5);
    expect(audio.trackList.every((t) => t.id && t.name)).toBe(true);
  });

  it('houdt de muziekstatus bij', () => {
    audio.setMusicEnabled(true);
    expect(audio.isMusicOn()).toBe(true);
    audio.setMusicEnabled(false);
    expect(audio.isMusicOn()).toBe(false);
  });

  it('stuurt de audiograaf echt aan met een (mock) AudioContext', async () => {
    vi.resetModules();
    window.AudioContext = FakeAC;
    const a = await import('./audio.js');

    a.setSfxEnabled(true);
    a.setMusicEnabled(false); // muziek uit, zodat unlock 'm niet meteen start
    a.unlock(); // ontgrendelt + maakt de context
    expect(resumeCount).toBeGreaterThan(0);

    const beforeSfx = oscCount;
    a.correct(3); // stijgend arpeggio → meerdere oscillatoren, gestart
    expect(oscCount).toBeGreaterThan(beforeSfx);
    expect(startCount).toBeGreaterThan(0);

    const beforeMusic = oscCount;
    a.setMusicEnabled(true); // context bestaat → sequencer schedulet stappen
    expect(oscCount).toBeGreaterThan(beforeMusic);
    expect(get(a.nowPlaying)).toBeTruthy(); // UI weet welk nummer speelt

    const before = get(a.nowPlaying);
    a.nextTrack(); // jukebox: volgend nummer
    expect(get(a.nowPlaying)).not.toBe(before);

    a.stopMusic(); // ruimt de lookahead-timer op (geen lek)

    delete window.AudioContext;
  });
});
