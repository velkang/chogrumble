// A bobbing pink arrow over the player's Chog, plus a ring at its feet.
import { AdditiveBlending, ConeGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';

const PINK = 0xff4fb0;

export function makeYouMarker(): Group {
  const g = new Group();
  g.name = 'you';
  const arrow = new Mesh(new ConeGeometry(0.11, 0.22, 4).rotateX(Math.PI), new MeshBasicMaterial({ color: PINK }));
  arrow.name = 'arrow';
  arrow.position.y = 1.4;
  const ring = new Mesh(
    new RingGeometry(0.42, 0.5, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }),
  );
  ring.position.y = 0.025;
  g.add(arrow, ring);
  return g;
}

/** Bobs and spins the arrow; call every frame with the visual clock. */
export function animateYouMarker(marker: Group, time: number): void {
  const arrow = marker.getObjectByName('arrow');
  if (!arrow) return;
  arrow.position.y = 1.4 + Math.sin(time * 4) * 0.06;
  arrow.rotation.y = time * 2;
}

export function disposeYouMarker(marker: Group): void {
  marker.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (m.material as MeshBasicMaterial).dispose();
  });
}
