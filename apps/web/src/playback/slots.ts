// Turns the sim's abstract zones into floor spots: nobody overlaps, everyone stays on the
// (shrinking) floor, and Chogs keep their spot between events when it is still valid.
import type { Zone } from '@chog/sim';
import { FLOOR, HAT_CLEARANCE } from './layout';
import { ARENA_SCALE } from '../arena/constants';

export const MIN_SPACING = 1.9;
/** If the floor is too crowded, spacing relaxes by this factor per try. */
const RELAX = 0.85;
const RELAX_TRIES = 4;
/** Centre of the bucket-hat platform, and its standing spot on top. */
export const PLATFORM = { x: -3.4 * ARENA_SCALE, z: -2.6 * ARENA_SCALE } as const;
export const HAT = { x: PLATFORM.x + 0.6, z: PLATFORM.z + 0.6 } as const;
const GUM = { x: 2.4 * ARENA_SCALE, z: 2.4 * ARENA_SCALE } as const;
const PADS = [
  { x: 3.8 * ARENA_SCALE, z: -2.8 * ARENA_SCALE },
  { x: 5.8 * ARENA_SCALE, z: 0.6 * ARENA_SCALE },
] as const;
/** Where Chogs who wanted the hat (but it's taken) wait. */
const HAT_FOOT = { x: -0.6 * ARENA_SCALE, z: -0.4 * ARENA_SCALE } as const;
const SHRINK_PER_ROUND = 0.07;
/** How far from its zone's anchor a kept spot may drift. */
const ZONE_RADIUS = 2.6;

export interface Slot {
  x: number;
  z: number;
  onHat: boolean;
}
export type Slots = Readonly<Record<string, Slot>>;

export function floorAt(round: number): { cx: number; cz: number; rx: number; rz: number } {
  const k = 1 - SHRINK_PER_ROUND * round;
  return { cx: FLOOR.cx, cz: FLOOR.cz, rx: FLOOR.rx * k, rz: FLOOR.rz * k };
}

const ellipse = (round: number, x: number, z: number) => {
  const f = floorAt(round);
  return Math.hypot((x - f.cx) / f.rx, (z - f.cz) / f.rz);
};

function anchorFor(zone: Zone, round: number, index: number, count: number, id: string): { x: number; z: number } {
  const f = floorAt(round);
  if (zone === 'rim') {
    const a = (index / Math.max(1, count)) * Math.PI * 2;
    return { x: f.cx + Math.cos(a) * f.rx * 0.86, z: f.cz + Math.sin(a) * f.rz * 0.86 };
  }
  if (zone === 'gum') return GUM;
  if (zone === 'pad') return PADS[id.length % PADS.length]!;
  if (zone === 'hat') return HAT_FOOT;
  return { x: f.cx, z: f.cz + 0.5 };
}

function free(round: number, placed: readonly Slot[], x: number, z: number, spacing = MIN_SPACING): boolean {
  if (ellipse(round, x, z) > 0.95) return false;
  if (Math.hypot(x - PLATFORM.x, z - PLATFORM.z) < HAT_CLEARANCE) return false;
  return placed.every((p) => p.onHat || Math.hypot(p.x - x, p.z - z) >= spacing);
}

/** Spirals out from the anchor until it finds a free spot, relaxing spacing if the floor is full. */
function search(round: number, placed: readonly Slot[], anchor: { x: number; z: number }): Slot {
  for (let tryNo = 0; tryNo <= RELAX_TRIES; tryNo++) {
    const spacing = MIN_SPACING * RELAX ** tryNo;
    for (let ring = 0; ring < 40; ring++) {
      const r = ring * 0.4;
      const steps = Math.max(1, ring * 8);
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const x = anchor.x + Math.cos(a) * r;
        const z = anchor.z + Math.sin(a) * r;
        if (free(round, placed, x, z, spacing)) return { x, z, onHat: false };
      }
    }
  }
  // the floor is packed: stand at the anchor rather than fail the match
  return { x: anchor.x, z: anchor.z, onHat: false };
}

function keepable(round: number, placed: readonly Slot[], prev: Slot | undefined, zone: Zone, anchor: { x: number; z: number }): boolean {
  if (!prev || prev.onHat || zone === 'hat') return false;
  if (zone !== 'floor' && Math.hypot(prev.x - anchor.x, prev.z - anchor.z) > ZONE_RADIUS) return false;
  return free(round, placed, prev.x, prev.z);
}

export function allocateSlots(zones: Readonly<Record<string, Zone>>, round: number, prev?: Slots): Slots {
  const ids = Object.keys(zones).sort();
  const placed: Slot[] = [];
  const out: Record<string, Slot> = {};
  const anchors = new Map(ids.map((id, i) => [id, anchorFor(zones[id]!, round, i, ids.length, id)]));
  // first pass: keep valid spots so Chogs don't shuffle around between events
  for (const id of ids) {
    const p = prev?.[id];
    if (keepable(round, placed, p, zones[id]!, anchors.get(id)!)) {
      out[id] = p!;
      placed.push(p!);
    }
  }
  let hatTaken = false;
  for (const id of ids) {
    if (out[id]) continue;
    const slot =
      zones[id] === 'hat' && !hatTaken ? { x: HAT.x, z: HAT.z, onHat: true } : search(round, placed, anchors.get(id)!);
    if (slot.onHat) hatTaken = true;
    out[id] = slot;
    placed.push(slot);
  }
  return out;
}
