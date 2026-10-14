// Hit sparks, dust puffs, sweat drops, flying teeth, beams, screen shake and hitstop.
import {
  AdditiveBlending,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Material, Scene, Texture } from 'three';
import type { SharedTextures } from '../engine/textures';
import { ease } from '../engine/tween';
import type { Tweens } from '../engine/tween';

export interface FxState {
  /** Seconds of slowed time left after a hit. */
  hitstop: number;
  shakeAmt: number;
}

export interface Fx {
  state: FxState;
  puff(pos: Vector3, n?: number, size?: number): void;
  impact(pos: Vector3, big?: boolean): void;
  shake(amount: number): void;
  tooth(pos: Vector3): Promise<void>;
  beam(from: Vector3, to: Vector3, radius: number, mat: Material): Group;
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFx(scene: Scene, tw: Tweens, tex: SharedTextures): Fx {
  const state: FxState = { hitstop: 0, shakeAmt: 0 };
  const calm = reducedMotion();
  const remove = (o: Sprite | Mesh) => () => scene.remove(o);

  const sprite = (map: Texture, pos: Vector3, size: number, add = false): Sprite => {
    const s = new Sprite(
      new SpriteMaterial({
        map,
        transparent: true,
        depthWrite: false,
        blending: add ? AdditiveBlending : NormalBlending,
        fog: false,
      }),
    );
    s.position.copy(pos);
    s.scale.setScalar(size);
    s.renderOrder = 10;
    scene.add(s);
    return s;
  };

  const shake = (a: number) => {
    if (!calm) state.shakeAmt = Math.max(state.shakeAmt, a);
  };

  const puff = (pos: Vector3, n = 10, size = 1.4) => {
    for (let i = 0; i < n; i++) {
      const s = sprite(
        tex.dust,
        pos.clone().add(new Vector3((Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6)),
        size * 0.5,
      );
      const v = new Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 3,
      );
      const p0 = s.position.clone();
      tw.tween(
        0.9 + Math.random() * 0.4,
        (e, p) => {
          s.position.copy(p0).addScaledVector(v, e);
          s.scale.setScalar(size * (0.5 + e));
          s.material.opacity = 1 - p;
        },
        ease.out,
      ).then(remove(s), remove(s));
    }
  };

  const sweat = (pos: Vector3) => {
    const d = sprite(tex.drop, pos.clone(), 0.45);
    const v = new Vector3(
      (Math.random() - 0.5) * 4,
      2 + Math.random() * 2,
      (Math.random() - 0.5) * 2 + 1,
    );
    const p0 = pos.clone();
    tw.tween(
      0.8,
      (_e, p) => {
        d.position
          .copy(p0)
          .addScaledVector(v, p)
          .add(new Vector3(0, -6 * p * p, 0));
        d.material.opacity = 1 - p;
      },
      ease.lin,
    ).then(remove(d), remove(d));
  };

  const impact = (pos: Vector3, big = false) => {
    state.hitstop = big ? 0.09 : 0.05;
    const s = sprite(tex.star, pos, 0.1);
    tw.tween(
      0.35,
      (e, p) => {
        s.scale.setScalar((big ? 3.4 : 2.4) * (0.3 + e));
        s.material.rotation = p * 0.6;
        s.material.opacity = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      },
      ease.out,
    ).then(remove(s), remove(s));
    for (let i = 0; i < 6; i++) sweat(pos);
    shake(big ? 0.5 : 0.25);
  };

  const tooth = (pos: Vector3) => {
    const t = new Mesh(
      new CapsuleGeometry(0.09, 0.14, 4, 8),
      new MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    );
    t.position.copy(pos);
    scene.add(t);
    t.castShadow = true;
    const v = new Vector3(2.5, 5, 2);
    return tw.tween(
      1.3,
      (_e, p) => {
        t.position
          .copy(pos)
          .addScaledVector(v, p)
          .add(new Vector3(0, -9 * p * p, 0));
        t.position.y = Math.max(0.15, t.position.y);
        t.rotation.z = p * 14;
      },
      ease.lin,
    );
  };

  const beam = (from: Vector3, to: Vector3, radius: number, mat: Material) => {
    const len = from.distanceTo(to);
    const m = new Mesh(new CylinderGeometry(radius, radius, 1, 12, 1, true), mat);
    const core = new Mesh(
      new CylinderGeometry(radius * 0.35, radius * 0.35, 1, 8, 1, true),
      new MeshBasicMaterial({ color: 0xffffff, fog: false }),
    );
    const g = new Group();
    g.add(m, core);
    g.position.copy(from).lerp(to, 0.5);
    g.scale.set(1, len, 1);
    g.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
    g.renderOrder = 8;
    scene.add(g);
    return g;
  };

  return { state, puff, impact, shake, tooth, beam };
}
