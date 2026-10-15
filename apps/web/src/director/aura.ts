// An aura: a soft coloured glow ring on the floor around a Chog.
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Texture } from 'three';
import { canvasTex } from '../engine/textures';

let ringTexture: Texture | null = null;
let ringGeometry: PlaneGeometry | null = null;

function texture(): Texture {
  ringTexture ??= canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 18, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  return ringTexture;
}

/** A glow ring in the Chog's own (scaled) space. */
export function makeAura(color: number): Mesh {
  ringGeometry ??= new PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2);
  const m = new Mesh(
    ringGeometry,
    new MeshBasicMaterial({ map: texture(), color: new Color(color), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }),
  );
  m.position.y = 0.02;
  m.renderOrder = 1;
  m.name = 'aura';
  return m;
}
