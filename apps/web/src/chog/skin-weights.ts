// The Chog model ships as a static T-pose, so bone weights are derived from where each
// vertex sits in model space (units: the model is ~1 tall, feet at y = 0, facing +z).

export const BONE_INDEX = {
  root: 0,
  hips: 1,
  spine: 2,
  head: 3,
  armL: 4, // +x side
  armR: 5, // -x side
  legL: 6, // +x side
  legR: 7, // -x side
} as const;

const BONE_COUNT = 8;
const INFLUENCES = 4;

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Raw (unnormalized) weight for each of the 8 bones at a model-space vertex. */
export function vertexWeights(x: number, y: number): number[] {
  const ax = Math.abs(x);
  const w = new Array<number>(BONE_COUNT).fill(0);
  const arm =
    smoothstep(0.215, 0.29, ax) * smoothstep(0.33, 0.38, y) * (1 - smoothstep(0.58, 0.62, y));
  const leg = (1 - smoothstep(0.09, 0.17, y)) * (1 - arm);
  const head = smoothstep(0.53, 0.61, y) * (1 - arm);
  const body = Math.max(0, 1 - arm - leg - head);
  const spine = smoothstep(0.2, 0.42, y);
  const side = smoothstep(-0.035, 0.035, x);
  w[BONE_INDEX.spine] = body * spine;
  w[BONE_INDEX.hips] = body * (1 - spine);
  w[BONE_INDEX.head] = head;
  w[BONE_INDEX.armL] = x > 0 ? arm : 0;
  w[BONE_INDEX.armR] = x > 0 ? 0 : arm;
  w[BONE_INDEX.legL] = leg * side;
  w[BONE_INDEX.legR] = leg * (1 - side);
  return w;
}

interface Positions {
  count: number;
  getX(i: number): number;
  getY(i: number): number;
}

/** Top-4 bone influences per vertex, strongest first, weights summing to 1. */
export function computeSkinWeights(pos: Positions): {
  indices: Uint16Array;
  weights: Float32Array;
} {
  const indices = new Uint16Array(pos.count * INFLUENCES);
  const weights = new Float32Array(pos.count * INFLUENCES);
  for (let i = 0; i < pos.count; i++) {
    const top = vertexWeights(pos.getX(i), pos.getY(i))
      .map((v, k) => [v, k] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, INFLUENCES);
    const sum = top.reduce((s, [v]) => s + v, 0) || 1;
    top.forEach(([v, k], j) => {
      indices[i * INFLUENCES + j] = k;
      weights[i * INFLUENCES + j] = v / sum;
    });
  }
  return { indices, weights };
}
