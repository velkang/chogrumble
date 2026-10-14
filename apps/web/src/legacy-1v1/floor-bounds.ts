/** Walkable floor ellipse inside the sack (world units). */
export const FLOOR = { cx: 1.0, cz: 0.0, rx: 7.2, rz: 5.6 } as const;

/** Radius around the bucket-hat platform that fighters can't walk into. */
export const HAT_CLEARANCE = 2.9;

/** Keeps a floor point inside the ellipse and outside the bucket-hat platform. */
export function clampFloor(
  x: number,
  z: number,
  hat: { readonly x: number; readonly z: number },
): [number, number] {
  let cx = x;
  let cz = z;
  const dx = (cx - FLOOR.cx) / FLOOR.rx;
  const dz = (cz - FLOOR.cz) / FLOOR.rz;
  const r = Math.hypot(dx, dz);
  if (r > 1) {
    cx = FLOOR.cx + (dx / r) * FLOOR.rx;
    cz = FLOOR.cz + (dz / r) * FLOOR.rz;
  }
  const hx = cx - hat.x;
  const hz = cz - hat.z;
  const hr = Math.hypot(hx, hz);
  if (hr < HAT_CLEARANCE) {
    cx = hat.x + (hx / (hr || 1)) * HAT_CLEARANCE;
    cz = hat.z + (hz / (hr || 1)) * HAT_CLEARANCE;
  }
  return [cx, cz];
}
