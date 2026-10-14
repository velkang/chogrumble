import { Vector3 } from 'three';
import type { Chog } from './chog';

/** World position of an eye (side -1 or 1), for laser and heart beams. */
export function eyeWorld(f: Chog, side: number): Vector3 {
  f.g.updateMatrixWorld(true);
  return f.B.head.localToWorld(new Vector3(0.085 * side, 0.155, 0.27));
}

/** World position just in front of the head, `up` units above the head bone. */
export function headWorld(f: Chog, up = 0.1): Vector3 {
  f.g.updateMatrixWorld(true);
  return f.B.head.localToWorld(new Vector3(0, up, 0.1));
}
