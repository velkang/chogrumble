// Joint-angle presets (Euler YXZ, radians) and the spring that eases bones toward them.

export const BONES = ['hips', 'spine', 'head', 'armL', 'armR', 'legL', 'legR'] as const;
export type BoneName = (typeof BONES)[number];
export type Vec3 = readonly [number, number, number];
export type Pose = Readonly<Record<BoneName, Vec3>>;

const z: Vec3 = [0, 0, 0];

export const POSES = {
  idle: { armL: [0, 0, -1.15], armR: [0, 0, 1.15], legL: z, legR: z, spine: z, head: z, hips: z },
  guard: {
    armL: [0, -1.0, -0.55],
    armR: [0, 1.0, 0.55],
    legL: [-0.15, 0, 0],
    legR: [0.2, 0, 0],
    spine: [0.12, 0, 0],
    head: [0.05, 0, 0],
    hips: z,
  },
  punchR: {
    armR: [0, 1.5, 0.1],
    armL: [0, -0.9, -0.6],
    spine: [0.18, 0.45, 0],
    head: [0.05, -0.2, 0],
    legL: [-0.3, 0, 0],
    legR: [0.3, 0, 0],
    hips: z,
  },
  punchL: {
    armL: [0, -1.5, -0.1],
    armR: [0, 0.9, 0.6],
    spine: [0.18, -0.45, 0],
    head: [0.05, 0.2, 0],
    legL: [0.3, 0, 0],
    legR: [-0.3, 0, 0],
    hips: z,
  },
  kick: {
    legR: [-1.65, 0, 0],
    legL: [0.25, 0, 0],
    spine: [-0.3, 0, 0],
    armL: [0, 0, -0.35],
    armR: [0, 0, 0.35],
    head: [0.25, 0, 0],
    hips: z,
  },
  windR: {
    armR: [0, -0.5, 0.95],
    armL: [0, -0.9, -0.6],
    spine: [0.05, -0.4, 0],
    head: [0.05, 0.15, 0],
    legL: [0.2, 0, 0],
    legR: [-0.2, 0, 0],
    hips: z,
  },
  windL: {
    armL: [0, 0.5, -0.95],
    armR: [0, 0.9, 0.6],
    spine: [0.05, 0.4, 0],
    head: [0.05, -0.15, 0],
    legL: [-0.2, 0, 0],
    legR: [0.2, 0, 0],
    hips: z,
  },
  windK: {
    legR: [0.55, 0, 0],
    legL: [-0.1, 0, 0],
    spine: [0.2, 0, 0],
    armL: [0, 0, -0.6],
    armR: [0, 0, 0.6],
    head: [0.1, 0, 0],
    hips: z,
  },
  hurt: {
    spine: [-0.45, 0, 0.15],
    head: [-0.35, 0, 0.25],
    armL: [0, 0, -0.25],
    armR: [0, 0, 0.25],
    legL: [-0.25, 0, 0],
    legR: [0.25, 0, 0],
    hips: z,
  },
  nuts: {
    spine: [0.65, 0, 0],
    head: [0.3, 0, 0],
    armL: [0, -1.2, -1.3],
    armR: [0, 1.2, 1.3],
    legL: [0, 0, 0.35],
    legR: [0, 0, -0.35],
    hips: z,
  },
  flail: {
    armL: [0, 0, 0.9],
    armR: [0, 0, -0.9],
    legL: [-0.5, 0, 0],
    legR: [0.4, 0, 0],
    spine: [-0.15, 0, 0],
    head: [-0.3, 0, 0],
    hips: z,
  },
  victory: {
    armL: [0, 0, 1.0],
    armR: [0, 0, -1.0],
    legL: [0, 0, 0.12],
    legR: [0, 0, -0.12],
    spine: [-0.15, 0, 0],
    head: [-0.3, 0, 0],
    hips: z,
  },
  limp: {
    armL: [0, 0, -1.45],
    armR: [0, 0, 1.45],
    legL: [0.1, 0, 0.1],
    legR: [-0.15, 0, -0.1],
    spine: [0.25, 0, 0.2],
    head: [0.5, 0, 0.35],
    hips: z,
  },
  blow: {
    armL: [0, -0.7, -0.9],
    armR: [0, 0.7, 0.9],
    spine: [-0.1, 0, 0],
    head: [-0.25, 0, 0],
    legL: z,
    legR: z,
    hips: z,
  },
  laser: {
    armL: [0, 0.6, -1.0],
    armR: [0, -0.6, 1.0],
    spine: [-0.1, 0, 0],
    head: [0.12, 0, 0],
    legL: [0, 0, 0.15],
    legR: [0, 0, -0.15],
    hips: z,
  },
  peer: { armL: [0, 0, -1.2], armR: [0, 0, 1.2], legL: z, legR: z, spine: z, head: z, hips: z },
} as const satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

/** Spring stiffness and damping for a pose's speed `k` (about 0.62 of critical damping). */
export function springGains(k: number): { K: number; D: number } {
  const K = (k * 1.3) ** 2;
  return { K, D: 2 * Math.sqrt(K) * 0.62 };
}

const SUBSTEP = 0.008;
const SNAP_DT = 0.5;

/** One axis of the bone spring: returns the new [angle, velocity]. Long frames snap to the target. */
export function springAxis(
  c: number,
  v: number,
  target: number,
  K: number,
  D: number,
  dt: number,
): [number, number] {
  if (dt >= SNAP_DT) return [target, 0];
  const n = Math.max(1, Math.ceil(dt / SUBSTEP));
  const h = dt / n;
  let angle = c;
  let vel = v;
  for (let k = 0; k < n; k++) {
    vel += (K * (target - angle) - D * vel) * h;
    angle += vel * h;
  }
  return [angle, vel];
}
