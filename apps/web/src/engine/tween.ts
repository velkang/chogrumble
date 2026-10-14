// Sim-clock tweens. Everything animated in the scene runs through here, so the whole
// game can be paused, slowed (hitstop) or frame-stepped for capture.

export type Ease = (t: number) => number;
export type TweenFn = (eased: number, progress: number) => void;

/** Rejection value for tweens dropped by cancelAll(). */
export const CANCELLED = 'cancel';

export const ease = {
  lin: (t: number) => t,
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  in: (t: number) => t * t * t,
} as const satisfies Record<string, Ease>;

interface Active {
  t0: number;
  dur: number;
  fn: TweenFn;
  e: Ease;
  res: () => void;
  rej: (reason: unknown) => void;
  token: number;
}

export interface Tweens {
  /** Current sim time in seconds. */
  now(): number;
  /** Changes every cancelAll(), so long-running scripts can tell they were superseded. */
  token(): number;
  tween(dur: number, fn: TweenFn, e?: Ease): Promise<void>;
  wait(dur: number): Promise<void>;
  /** Moves sim time forward and steps every running tween. */
  advance(dt: number): void;
  /** Drops every running tween; their promises reject with CANCELLED. */
  cancelAll(): void;
}

export function createTweens(): Tweens {
  let time = 0;
  let run = 0;
  const active: Active[] = [];

  const tween = (dur: number, fn: TweenFn, e: Ease = ease.inOut) => {
    const token = run;
    return new Promise<void>((res, rej) => active.push({ t0: time, dur, fn, e, res, rej, token }));
  };

  const step = () => {
    for (let i = active.length - 1; i >= 0; i--) {
      const tw = active[i]!;
      if (tw.token !== run) {
        active.splice(i, 1);
        tw.rej(CANCELLED);
        continue;
      }
      const p = Math.min(1, (time - tw.t0) / tw.dur);
      tw.fn(tw.e(p), p);
      if (p >= 1) {
        active.splice(i, 1);
        tw.res();
      }
    }
  };

  return {
    now: () => time,
    token: () => run,
    tween,
    wait: (dur) => tween(dur, () => {}),
    advance(dt) {
      time += dt;
      step();
    },
    cancelAll() {
      run++;
    },
  };
}
