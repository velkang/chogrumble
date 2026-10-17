// Joint-angle presets (Euler YXZ, radians) and the spring that eases bones toward them.

export const BONES = ['hips', 'spine', 'head', 'armL', 'armR', 'legL', 'legR', 'forearmL', 'forearmR', 'shinL', 'shinR'] as const;
export type BoneName = (typeof BONES)[number];
export type Vec3 = readonly [number, number, number];
export type Pose = Readonly<Record<BoneName, Vec3>>;

const z: Vec3 = [0, 0, 0];

const BASE_POSES = {
  // arms rest down by the sides
  idle: { armL: [0, 0, -1.38], armR: [0, 0, 1.38], legL: z, legR: z, spine: z, head: z, hips: z },
  // a tighter boxing guard: fists forward and low, weight on the front foot
  guard: {
    armL: [0, -1.2, -0.7],
    armR: [0, 1.2, 0.7],
    legL: [-0.2, 0, 0.04],
    legR: [0.25, 0, -0.04],
    spine: [0.16, 0, 0],
    head: [0.02, 0, 0],
    hips: z,
  },
  crouch: {
    armL: [0, -1.2, -0.7], armR: [0, 1.2, 0.7],
    legL: [-1.1, 0, 0.2], legR: [-1.1, 0, -0.2],
    spine: [0.12, 0, 0], head: [-0.08, 0, 0], hips: z,
  },
  sweep: {
    armL: [0, -1, -0.6], armR: [0, 1, 0.6],
    legL: [-1.2, 0, 0.2], legR: [-1.35, 0, 0],
    spine: [0.12, 0.15, 0], head: [-0.08, 0, 0], hips: z,
  },
  punchR: {
    armR: [0, 1.55, -0.15],
    armL: [0, -1.2, -0.7],
    spine: [0.04, 0.18, 0],
    head: [0, -0.12, 0],
    legL: [-0.3, 0, 0],
    legR: [0.3, 0, 0],
    hips: z,
  },
  punchL: {
    armL: [0, -1.55, 0.15],
    armR: [0, 1.2, 0.7],
    spine: [0.04, -0.18, 0],
    head: [0, 0.12, 0],
    legL: [0.3, 0, 0],
    legR: [-0.3, 0, 0],
    hips: z,
  },
  kick: {
    legR: [-1.65, 0, 0],
    legL: [0.25, 0, 0],
    spine: [-0.1, 0, 0],
    armL: [0, 0, -0.35],
    armR: [0, 0, 0.35],
    head: [0.08, 0, 0],
    hips: z,
  },
  windR: {
    armR: [0, 0.65, 0.95],
    armL: [0, -1.2, -0.7],
    spine: [0.05, -0.4, 0],
    head: [0.05, 0.15, 0],
    legL: [0.2, 0, 0],
    legR: [-0.2, 0, 0],
    hips: z,
  },
  windL: {
    armL: [0, -0.65, -0.95],
    armR: [0, 1.2, 0.7],
    spine: [0.05, 0.4, 0],
    head: [0.05, -0.15, 0],
    legL: [-0.2, 0, 0],
    legR: [0.2, 0, 0],
    hips: z,
  },
  windK: {
    legR: [-1.1, 0, 0],
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
  // taunts between fights
  point: {
    armR: [0, 0.9, -0.55],
    armL: [0, 0, -1.3],
    spine: [-0.05, -0.25, 0],
    head: [0.05, 0.2, 0.1],
    legL: [0.1, 0, 0],
    legR: [-0.1, 0, 0],
    hips: z,
  },
  drum: {
    armL: [0, -1.35, -1.0],
    armR: [0, 1.35, 1.0],
    spine: [-0.2, 0, 0],
    head: [-0.25, 0, 0],
    legL: [0, 0, 0.15],
    legR: [0, 0, -0.15],
    hips: z,
  },
  flex: {
    armL: [0, -0.3, 0.35],
    armR: [0, 0.3, -0.35],
    spine: [-0.12, 0, 0],
    head: [-0.15, 0, 0],
    legL: [0, 0, 0.18],
    legR: [0, 0, -0.18],
    hips: z,
  },
} as const satisfies Record<string, Omit<Pose, 'forearmL' | 'forearmR' | 'shinL' | 'shinR'>>;

const ALL_POSES = {
  ...BASE_POSES,
  airPunchR: { ...BASE_POSES.punchR, legL: [-0.65, 0, 0] as Vec3, legR: [-0.3, 0, 0] as Vec3 },
  airPunchL: { ...BASE_POSES.punchL, legL: [-0.3, 0, 0] as Vec3, legR: [-0.65, 0, 0] as Vec3 },
  airKick: { ...BASE_POSES.kick, legR: [-1.9, 0, 0] as Vec3, legL: [-0.9, 0, 0.15] as Vec3 },
};
type Joints = Pick<Pose, 'forearmL' | 'forearmR' | 'shinL' | 'shinR'>;
const JOINTS: Partial<Record<keyof typeof ALL_POSES, Partial<Joints>>> = {
  guard: { forearmL: [0, 0, 1.7], forearmR: [0, 0, -1.7], shinL: [0.25, 0, 0], shinR: [0.3, 0, 0] },
  crouch: { forearmL: [0, -1.3, 0], forearmR: [0, 1.3, 0], shinL: [1.3, 0, 0], shinR: [1.3, 0, 0] },
  sweep: { forearmL: [0, -1.1, 0], forearmR: [0, 1.1, 0], shinL: [1.5, 0, 0], shinR: [0.05, 0, 0] },
  punchR: { forearmL: [0, 0, 1.7], forearmR: [0, 0.05, 0], shinL: [0.15, 0, 0], shinR: [0.25, 0, 0] },
  punchL: { forearmL: [0, -0.05, 0], forearmR: [0, 0, -1.7], shinL: [0.25, 0, 0], shinR: [0.15, 0, 0] },
  windR: { forearmL: [0, 0, 1.7], forearmR: [0, 0.3, -2.1], shinR: [0.3, 0, 0] },
  windL: { forearmL: [0, -0.3, 2.1], forearmR: [0, 0, -1.7], shinL: [0.3, 0, 0] },
  windK: { forearmL: [0, 0, 1.7], forearmR: [0, 0, -1.7], shinL: [0.15, 0, 0], shinR: [1.9, 0, 0] },
  kick: { forearmL: [0, -1, 0], forearmR: [0, 1.2, 0], shinL: [0.2, 0, 0], shinR: [0.05, 0, 0] },
  flail: { forearmL: [0, -0.7, 0], forearmR: [0, 0.7, 0], shinL: [0.8, 0, 0], shinR: [1.2, 0, 0] },
  airPunchR: { forearmL: [0, 0, 1.7], forearmR: [0, 0.05, 0], shinL: [1.1, 0, 0], shinR: [0.8, 0, 0] },
  airPunchL: { forearmL: [0, -0.05, 0], forearmR: [0, 0, -1.7], shinL: [0.8, 0, 0], shinR: [1.1, 0, 0] },
  airKick: { forearmL: [0, -1, 0], forearmR: [0, 1.2, 0], shinL: [1.3, 0, 0], shinR: [0.05, 0, 0] },
  victory: { forearmL: [0, 0, 0.7], forearmR: [0, 0, -0.7] },
};
export const POSES = Object.fromEntries(Object.entries(ALL_POSES).map(([name, pose]) => [name, {
  forearmL: z, forearmR: z, shinL: z, shinR: z, ...pose, ...JOINTS[name as keyof typeof ALL_POSES],
}])) as Record<keyof typeof ALL_POSES, Pose>;

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
