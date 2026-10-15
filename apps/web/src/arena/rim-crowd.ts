// Spectator Chogs peeking over the rim of the sack (their NFT portraits on billboards). They bob,
// and jump up and cheer when someone gets plucked.
import { Group, Sprite, SpriteMaterial, SRGBColorSpace, TextureLoader } from 'three';
import type { Scene, Vector3 } from 'three';
import { RIM_Y } from './constants';
import { canvasTex } from '../engine/textures';

const SUPPLY = 1969;

export interface RimCrowd {
  /** Bobbing; call every frame with the visual clock. */
  update(time: number): void;
  /** Everyone jumps for a moment. */
  cheer(time: number): void;
}

export function addRimCrowd(scene: Scene, rimCenter: Vector3, rimRadius: number, count: number, baseUrl: string): RimCrowd {
  const loader = new TextureLoader();
  const group = new Group();
  // round faces instead of square cards
  const round = canvasTex(64, 64, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(32, 32, 30, 0, Math.PI * 2);
    c.fill();
  });
  const fans = Array.from({ length: count }, (_, i) => {
    const token = 1 + Math.floor(Math.random() * SUPPLY);
    const map = loader.load(`${baseUrl}portraits/${token}.webp`);
    map.colorSpace = SRGBColorSpace;
    const s = new Sprite(new SpriteMaterial({ map, alphaMap: round, transparent: true, fog: false }));
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const r = rimRadius * 0.92;
    s.position.set(rimCenter.x + Math.cos(a) * r, RIM_Y + 0.6, rimCenter.z + Math.sin(a) * r);
    s.scale.setScalar(2.0);
    group.add(s);
    return { s, phase: Math.random() * 6, baseY: s.position.y };
  });
  scene.add(group);
  let cheerAt = -Infinity;
  return {
    update(time) {
      const lift = Math.max(0, 1 - (time - cheerAt) / 1.2);
      for (const f of fans) {
        const hop = Math.abs(Math.sin(time * 9 + f.phase)) * 0.9 * lift;
        f.s.position.y = f.baseY + Math.sin(time * 1.3 + f.phase) * 0.15 + hop;
      }
    },
    cheer(time) {
      cheerAt = time;
    },
  };
}
