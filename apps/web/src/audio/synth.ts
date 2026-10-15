// Tiny WebAudio building blocks: enveloped tones and filtered noise bursts.

export interface Voice {
  ctx: AudioContext;
  out: AudioNode;
}

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function envelope(ctx: AudioContext, at: number, attack: number, decay: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

/** A pitched tone that can slide from `freq` to `to`. */
export function tone(v: Voice, opts: { freq: number; to?: number; type?: OscillatorType; at?: number; dur: number; gain: number }): void {
  const at = opts.at ?? v.ctx.currentTime;
  const osc = v.ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, at);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, at + opts.dur);
  const env = envelope(v.ctx, at, 0.005, opts.dur, opts.gain);
  osc.connect(env).connect(v.out);
  osc.start(at);
  osc.stop(at + opts.dur + 0.05);
}

/** A burst of noise through a filter (thumps, whooshes, crowd). */
export function burst(v: Voice, opts: { type: BiquadFilterType; freq: number; to?: number; q?: number; at?: number; attack?: number; dur: number; gain: number }): void {
  const at = opts.at ?? v.ctx.currentTime;
  const src = v.ctx.createBufferSource();
  src.buffer = noise(v.ctx);
  const filter = v.ctx.createBiquadFilter();
  filter.type = opts.type;
  filter.Q.value = opts.q ?? 1;
  filter.frequency.setValueAtTime(opts.freq, at);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, at + opts.dur);
  const env = envelope(v.ctx, at, opts.attack ?? 0.004, opts.dur, opts.gain);
  src.connect(filter).connect(env).connect(v.out);
  src.start(at, Math.random() * 0.5);
  src.stop(at + (opts.attack ?? 0.004) + opts.dur + 0.05);
}
