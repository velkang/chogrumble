import { Vector3 } from 'three';
import { ARENA_SCALE } from '../arena/constants';

/** The camera stays inside this ellipse on the open side of the sack. */
export const CAMERA_BOUNDS = { cx: 1.0 * ARENA_SCALE, rx: 6.4 * ARENA_SCALE, rz: 6.9 * ARENA_SCALE } as const;

/** View direction: side-on for a pair, from the open (+z) side for a group. */
function viewDirection(points: readonly Vector3[], centre: Vector3): Vector3 {
  const n = new Vector3(0, 0, 1);
  if (points.length === 2) {
    const [a, b] = points as [Vector3, Vector3];
    n.set(-(b.z - a.z), 0, b.x - a.x);
    if (n.lengthSq() < 1e-4) n.set(0, 0, 1);
    n.normalize();
    if (n.z < 0) n.negate();
    return n.lerp(new Vector3(0, 0, 1), 0.35).normalize();
  }
  return n.set(centre.x * 0.08, 0, 1).normalize();
}

/** Camera position and look target that frame every point. */
export function frameGroup(points: readonly Vector3[]): { pos: Vector3; look: Vector3 } {
  if (points.length === 0) throw new Error('frameGroup needs at least one point');
  const centre = points.reduce((s, p) => s.add(p), new Vector3()).divideScalar(points.length);
  const spread = Math.min(9, Math.max(...points.map((p) => Math.hypot(p.x - centre.x, p.z - centre.z))) * 2);
  const y = Math.max(...points.map((p) => p.y)) * 0.6;
  const n = viewDirection(points, centre);
  // far and high enough to look over bystanders in a full sack
  const dist = 5.4 + spread * 0.6;
  let px = centre.x + n.x * dist;
  let pz = centre.z + n.z * dist;
  const ex = (px - CAMERA_BOUNDS.cx) / CAMERA_BOUNDS.rx;
  const ez = pz / CAMERA_BOUNDS.rz;
  const er = Math.hypot(ex, ez);
  if (er > 1) {
    px = CAMERA_BOUNDS.cx + (ex / er) * CAMERA_BOUNDS.rx;
    pz = (ez / er) * CAMERA_BOUNDS.rz;
  }
  return {
    pos: new Vector3(px, 3.4 + spread * 0.22 + y * 0.5, pz),
    look: new Vector3(centre.x, 1.3 + y * 0.8, centre.z),
  };
}
