// Game sounds and a light music loop, all synthesized: no audio files to load or license.
import { burst, tone } from './synth';
import type { Voice } from './synth';

export interface Sound {
  /** Browsers only allow audio after a tap or click; call from an input handler. */
  unlock(): void;
  setMuted(muted: boolean): void;
  muted(): boolean;
  hit(big: boolean): void;
  whoosh(): void;
  block(): void;
  zap(): void;
  splat(): void;
  knockOut(): void;
  round(): void;
  rumble(): void;
  fanfare(): void;
  /** Starts or stops the music loop. */
  music(on: boolean): void;
}

const MUTE_KEY = 'chog-rumble:muted';
const BPM = 124;
const BASS = [55, 55, 65.4, 49] as const;
const ARP = [220, 277.2, 329.6, 440, 329.6, 277.2, 246.9, 329.6] as const;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // private mode or blocked storage: the setting just won't stick
  }
}

export function createSound(): Sound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let isMuted = readMuted();
  let musicTimer: number | null = null;
  let step = 0;
  let nextNoteAt = 0;

  const voice = (): Voice | null => (ctx && master && !isMuted ? { ctx, out: master } : null);
  const play = (fn: (v: Voice) => void) => {
    const v = voice();
    if (v) fn(v);
  };

  const scheduleMusic = () => {
    const v = voice();
    if (!v) return;
    const eighth = 60 / BPM / 2;
    while (nextNoteAt < v.ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 8) % BASS.length;
      if (step % 4 === 0) tone(v, { freq: 120, to: 45, type: 'sine', at: nextNoteAt, dur: 0.16, gain: 0.32 });
      if (step % 4 === 2) burst(v, { type: 'highpass', freq: 5000, at: nextNoteAt, dur: 0.04, gain: 0.05 });
      if (step % 2 === 0) tone(v, { freq: BASS[bar]!, type: 'triangle', at: nextNoteAt, dur: eighth * 1.6, gain: 0.12 });
      tone(v, { freq: ARP[step % ARP.length]! * (bar === 3 ? 0.89 : 1), type: 'square', at: nextNoteAt, dur: eighth * 0.7, gain: 0.025 });
      nextNoteAt += eighth;
      step++;
    }
  };

  return {
    unlock() {
      if (!ctx) {
        const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = 0.7;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    setMuted(m) {
      isMuted = m;
      saveMuted(m);
      if (master) master.gain.value = m ? 0 : 0.7;
    },
    muted: () => isMuted,
    hit: (big) =>
      play((v) => {
        tone(v, { freq: big ? 150 : 190, to: 50, type: 'sine', dur: big ? 0.22 : 0.14, gain: big ? 0.9 : 0.6 });
        burst(v, { type: 'lowpass', freq: 2200, to: 300, dur: 0.12, gain: big ? 0.5 : 0.35 });
      }),
    whoosh: () => play((v) => burst(v, { type: 'bandpass', freq: 600, to: 2400, q: 2, attack: 0.04, dur: 0.16, gain: 0.25 })),
    block: () =>
      play((v) => {
        tone(v, { freq: 520, to: 380, type: 'square', dur: 0.08, gain: 0.12 });
        burst(v, { type: 'highpass', freq: 2500, dur: 0.06, gain: 0.2 });
      }),
    zap: () => play((v) => tone(v, { freq: 1400, to: 200, type: 'sawtooth', dur: 0.35, gain: 0.12 })),
    splat: () => play((v) => burst(v, { type: 'lowpass', freq: 900, to: 120, q: 4, dur: 0.3, gain: 0.5 })),
    knockOut: () =>
      play((v) => {
        tone(v, { freq: 420, to: 90, type: 'triangle', dur: 0.6, gain: 0.35 });
        burst(v, { type: 'bandpass', freq: 900, q: 0.6, attack: 0.15, dur: 1.4, gain: 0.35 });
      }),
    round: () =>
      play((v) => {
        for (let i = 0; i < 10; i++) tone(v, { freq: 110, to: 70, at: v.ctx.currentTime + i * 0.05, dur: 0.06, gain: 0.25 + i * 0.03 });
        tone(v, { freq: 330, type: 'square', at: v.ctx.currentTime + 0.55, dur: 0.3, gain: 0.12 });
      }),
    rumble: () => play((v) => burst(v, { type: 'lowpass', freq: 180, q: 0.7, attack: 0.2, dur: 1.2, gain: 0.6 })),
    fanfare: () =>
      play((v) => {
        [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(v, { freq: f, type: 'square', at: v.ctx.currentTime + i * 0.14, dur: 0.35, gain: 0.1 }));
        burst(v, { type: 'bandpass', freq: 1000, q: 0.5, attack: 0.2, dur: 2, gain: 0.4 });
      }),
    music(on) {
      if (musicTimer !== null) window.clearInterval(musicTimer);
      musicTimer = null;
      if (!on || !ctx) return;
      nextNoteAt = ctx.currentTime + 0.05;
      musicTimer = window.setInterval(scheduleMusic, 60);
    },
  };
}
