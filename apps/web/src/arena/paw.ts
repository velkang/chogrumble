// The giant's paw that reaches into the sack to flick fighters and pluck the loser.
import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { Texture } from 'three';
import { RIM_Y } from './constants';

export interface Paw {
  g: Group;
  /** Curls the fingers and thumb: 0 open, 1 closed. */
  grip(v: number): void;
}

function finger(i: number, furMat: MeshStandardMaterial): Group {
  const fg = new Group();
  const a = (i - 1.5) * 0.42;
  fg.position.set(Math.sin(a) * 1.9, 1.0, Math.cos(a) * 1.4 - 0.4);
  const fm = new Mesh(new CapsuleGeometry(0.62, 1.3, 8, 16), furMat);
  fm.position.y = -0.9;
  fm.castShadow = true;
  const bean = new Mesh(
    new SphereGeometry(0.36, 16, 12),
    new MeshStandardMaterial({ color: 0xff8fb4, roughness: 0.6 }),
  );
  bean.position.set(0, -1.6, 0.42);
  fg.add(fm, bean);
  fg.rotation.x = -0.5;
  fg.rotation.z = -a * 0.4;
  return fg;
}

export function makePaw(bump: Texture): Paw {
  const g = new Group();
  const furMat = new MeshStandardMaterial({
    color: 0xf2dfbf,
    roughness: 1,
    bumpMap: bump,
    bumpScale: 0.6,
  });
  const pinkFur = new MeshStandardMaterial({
    color: 0xf07aa8,
    roughness: 1,
    bumpMap: bump,
    bumpScale: 0.6,
  });
  const arm = new Mesh(new CylinderGeometry(2.2, 2.8, 26, 24), pinkFur);
  arm.position.y = 15;
  arm.castShadow = true;
  const palm = new Mesh(new SphereGeometry(2.4, 32, 20), furMat);
  palm.scale.set(1.1, 0.9, 1);
  palm.position.y = 2.2;
  palm.castShadow = true;
  const fingers = [0, 1, 2, 3].map((i) => {
    const fg = finger(i, furMat);
    g.add(fg);
    return fg;
  });
  const thumb = new Group();
  thumb.position.set(0, 1.2, -1.6);
  const tm = new Mesh(new CapsuleGeometry(0.7, 1.2, 8, 16), furMat);
  tm.position.y = -0.9;
  tm.castShadow = true;
  thumb.add(tm);
  thumb.rotation.x = 0.6;
  g.add(thumb);
  g.add(arm, palm);
  g.scale.setScalar(0.62);
  g.position.set(0, RIM_Y + 30, 0);
  g.visible = false;
  return {
    g,
    grip(v) {
      fingers.forEach((f) => (f.rotation.x = -0.5 + v * 1.1));
      thumb.rotation.x = 0.6 - v * 1.0;
    },
  };
}
