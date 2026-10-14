// Warm sun pouring through the opening, purple fill inside, floating dust motes.
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  HemisphereLight,
  PointLight,
  Points,
  PointsMaterial,
  SpotLight,
} from 'three';
import type { Scene, Texture } from 'three';
import { RIM_Y } from './constants';

export function addLights(scene: Scene): void {
  scene.add(new HemisphereLight(0xffd8c0, 0x4a2060, 1.3));
  const sun = new SpotLight(0xffd6a0, 900, 80, 0.55, 0.6, 1.6);
  sun.position.set(3, RIM_Y + 26, 6);
  sun.target.position.set(-1, 0, -0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 70;
  scene.add(sun, sun.target);
  const fill = new PointLight(0xc070ff, 60, 40, 1.6);
  fill.position.set(0, 6, 9);
  scene.add(fill);
  const rimLight = new PointLight(0xff8ad0, 40, 30, 1.6);
  rimLight.position.set(-9, 5, -4);
  scene.add(rimLight);
}

const MOTE_COUNT = 300;

export function addMotes(scene: Scene, glow: Texture): Points {
  const geometry = new BufferGeometry();
  const xyz = Array.from({ length: MOTE_COUNT * 3 }, (_, i) =>
    i % 3 === 1 ? Math.random() * RIM_Y : (Math.random() - 0.5) * 18,
  );
  const motes = new Points(
    geometry.setAttribute('position', new Float32BufferAttribute(xyz, 3)),
    new PointsMaterial({
      map: glow,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  scene.add(motes);
  return motes;
}
