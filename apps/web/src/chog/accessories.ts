// Hats and gum bubbles, parented to the head bone.
import { Group, Mesh, MeshPhysicalMaterial, SphereGeometry, Vector3 } from 'three';
import type { Models } from '../engine/assets';
import type { Chog } from './chog';

export type HatKind = 'cap' | 'bucket';

/** Turns the tilted bucket-hat model upright. */
export const BUCKET_UP = new Vector3(-0.364, 0.861, -0.356).normalize();

export function hatOn(f: Chog, kind: HatKind, models: Models): Group {
  const src = kind === 'cap' ? models.cap : models.bucket;
  const h = new Mesh(src.geometry, src.material);
  h.castShadow = true;
  const holder = new Group();
  holder.add(h);
  // fitted from measured profiles: the crown's inner band sits just above the eyes, around the head's widest point
  if (kind === 'cap') {
    h.position.set(0, -0.16, 0.11);
    holder.scale.setScalar(0.76);
    holder.position.set(0, 0.265, 0.01);
    holder.rotation.x = -0.1;
  } else {
    h.quaternion.setFromUnitVectors(BUCKET_UP, new Vector3(0, 1, 0));
    h.position.set(-0.08, -0.28, -0.08);
    holder.scale.setScalar(0.75);
    holder.position.set(0, 0.285, 0.02);
    holder.rotation.x = -0.14;
  }
  f.B.head.add(holder);
  f.hat = holder;
  return holder;
}

/** Inflates (or hides, at 0) the Chog's gum bubble in front of its mouth. */
export function setGum(f: Chog, s: number): void {
  const g = f.gum;
  if (!g) return;
  g.scale.setScalar(Math.max(0.0001, s));
  g.position.set(0.02, 0.06, 0.3 + 0.085 * s);
}

export function gumBubble(f: Chog, s: number): Mesh {
  const m = new Mesh(
    new SphereGeometry(0.1, 32, 16),
    new MeshPhysicalMaterial({
      color: 0xff7ec4,
      roughness: 0.1,
      clearcoat: 1,
      transparent: true,
      opacity: 0.92,
      emissive: 0x551133,
      emissiveIntensity: 0.5,
    }),
  );
  m.position.set(0.02, 0.06, 0.32);
  m.scale.setScalar(s || 0.0001);
  m.castShadow = true;
  f.B.head.add(m);
  f.gum = m;
  return m;
}
