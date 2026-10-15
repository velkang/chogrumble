// A soft dark disc under a Chog: the cheap stand-in for real shadows on low quality.
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Texture } from 'three';
import { canvasTex } from '../engine/textures';

let shared: { geometry: PlaneGeometry; material: MeshBasicMaterial } | null = null;

function blobTexture(): Texture {
  return canvasTex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
}

/** A blob shadow sized for a Chog, in the Chog's own (scaled) space. */
export function makeBlobShadow(): Mesh {
  if (!shared) {
    shared = {
      geometry: new PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2),
      material: new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }),
    };
  }
  const blob = new Mesh(shared.geometry, shared.material);
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  return blob;
}
