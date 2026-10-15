// The match clock runs on real elapsed time. Visual tweens can slow down (hitstop), but the
// match itself must not drift, or viewers watching the same match would fall out of sync.
import { CANCELLED } from './tween';

export interface MatchClock {
  /** Match time in ms. */
  now(): number;
  /** Adds real elapsed seconds and resolves any waits that are due. */
  advance(dtSeconds: number): void;
  /** Resolves when the clock reaches `ms`. */
  waitUntil(ms: number): Promise<void>;
  /** Back to zero; pending waits reject with CANCELLED. */
  reset(): void;
}

interface Waiter {
  at: number;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

export function createMatchClock(): MatchClock {
  let ms = 0;
  let waiters: Waiter[] = [];

  const flush = () => {
    const due = waiters.filter((w) => w.at <= ms).sort((a, b) => a.at - b.at);
    if (due.length === 0) return;
    waiters = waiters.filter((w) => w.at > ms);
    due.forEach((w) => w.resolve());
  };

  return {
    now: () => ms,
    advance(dt) {
      if (!(dt > 0)) return;
      ms += dt * 1000;
      flush();
    },
    waitUntil(at) {
      if (at <= ms) return Promise.resolve();
      return new Promise<void>((resolve, reject) => waiters.push({ at, resolve, reject }));
    },
    reset() {
      const pending = waiters;
      waiters = [];
      ms = 0;
      pending.forEach((w) => w.reject(CANCELLED));
    },
  };
}
