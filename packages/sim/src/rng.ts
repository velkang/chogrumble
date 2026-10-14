// Seeded RNG for the sim: sfc32 seeded from a 128-bit hash of the seed string.
// Integer-only, so every JS engine produces the same sequence.

export interface Rng {
  /** Next unsigned 32-bit integer. */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Integer in [lo, hi], inclusive. */
  range(lo: number, hi: number): number;
  /** True with probability permille / 1000. */
  chance(permille: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Picks by integer weight; zero weights are never picked. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
}

const U32 = 4294967296;

/** cyrb128: hashes a string into four 32-bit words. */
function hashSeed(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function sfc32(seed: [number, number, number, number]): () => number {
  let [a, b, c, d] = seed;
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    return t;
  };
}

export function createRng(seed: string): Rng {
  const next = sfc32(hashSeed(seed));
  // discard the first outputs; sfc32 needs a few rounds to mix a fresh state
  for (let i = 0; i < 12; i++) next();
  const int = (n: number) => Math.floor((next() * n) / U32);
  return {
    next,
    int,
    range: (lo, hi) => lo + int(hi - lo + 1),
    chance: (permille) => int(1000) < permille,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[int(items.length)]!;
    },
    weighted<T>(items: readonly (readonly [T, number])[]): T {
      const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
      if (total <= 0) throw new Error('weighted() needs at least one positive weight');
      let roll = int(total);
      for (const [item, w] of items) {
        if (w <= 0) continue;
        if (roll < w) return item;
        roll -= w;
      }
      throw new Error('unreachable: weighted roll out of range');
    },
  };
}
