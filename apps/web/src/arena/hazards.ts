// Floor hazards built from the giant's traits: bucket-hat platform, gum puddle, heart pads.
import {
  Box3,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Raycaster,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Scene } from 'three';
import type { Models } from '../engine/assets';
import { BUCKET_UP } from '../chog/accessories';

export interface Platform {
  group: Group;
  /** Height of the standing spot on top of the hat. */
  topY: number;
}

export interface HeartPad {
  g: Group;
  pm: MeshPhysicalMaterial;
  light: PointLight;
  pos: Vector3;
}

/** The bucket hat stood upright and scaled up into a platform. */
export function addPlatform(scene: Scene, models: Models): Platform {
  const group = new Group();
  const hatMesh = new Mesh(models.bucket.geometry, models.bucket.material);
  hatMesh.castShadow = hatMesh.receiveShadow = true;
  hatMesh.quaternion.copy(new Quaternion().setFromUnitVectors(BUCKET_UP, new Vector3(0, 1, 0)));
  const inner = new Group();
  inner.add(hatMesh);
  const bb = new Box3().setFromObject(inner);
  hatMesh.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  inner.scale.set(5.6, 2.4, 5.6);
  group.add(inner);
  group.position.set(-3.4, 0, -2.6);
  scene.add(group);
  group.updateMatrixWorld(true);
  const ray = new Raycaster(
    new Vector3(group.position.x + 0.6, 20, group.position.z + 0.6),
    new Vector3(0, -1, 0),
  );
  const hit = ray.intersectObject(hatMesh)[0];
  return { group, topY: hit ? hit.point.y - 0.05 : 1.6 };
}

/** A wobbly-edged pink puddle; fighters knocked into it get stuck. */
export function addGumPuddle(scene: Scene): Mesh {
  const gumMat = new MeshPhysicalMaterial({
    color: 0xff74b8,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    sheen: 0.4,
  });
  const blob = new Mesh(new SphereGeometry(1, 48, 24), gumMat);
  const p = blob.geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const r = 1 + 0.18 * Math.sin(a * 5) + 0.08 * Math.sin(a * 9);
    p.setXYZ(i, x * r, p.getY(i), z * r);
  }
  blob.geometry.computeVertexNormals();
  blob.scale.set(1.9, 0.14, 1.4);
  blob.position.set(2.4, 0.06, 2.4);
  blob.receiveShadow = true;
  scene.add(blob);
  return blob;
}

function heartShape(): Shape {
  const hs = new Shape();
  hs.moveTo(0, -1);
  hs.bezierCurveTo(-2, 0.4, -1.2, 1.9, 0, 0.9);
  hs.bezierCurveTo(1.2, 1.9, 2, 0.4, 0, -1);
  return hs;
}

const PAD_SPOTS = [
  [3.8, -2.8, 0.8, -0.4],
  [5.8, 0.6, 0.72, 0.3],
] as const;

/** Glowing heart pads; the giant's heart beams launch whoever stands on one. */
export function addHeartPads(scene: Scene): HeartPad[] {
  const hs = heartShape();
  const padGeo = new ExtrudeGeometry(hs, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 4,
    curveSegments: 24,
  });
  const baseGeo = new ExtrudeGeometry(hs, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.38,
    bevelSegments: 3,
    curveSegments: 24,
  });
  return PAD_SPOTS.map(([x, z, s, ry]) => {
    const g = new Group();
    const pm = new MeshPhysicalMaterial({
      color: 0xff4a5c,
      emissive: 0xff2236,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      clearcoat: 1,
      transmission: 0.0,
    });
    const pad = new Mesh(padGeo, pm);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.14;
    pad.castShadow = true;
    const base = new Mesh(baseGeo, new MeshStandardMaterial({ color: 0x5a2f80, roughness: 0.9 }));
    base.rotation.x = -Math.PI / 2;
    g.add(base, pad);
    g.scale.setScalar(s);
    g.rotation.y = ry;
    g.position.set(x, 0.08, z);
    const light = new PointLight(0xff3050, 6, 7, 2);
    light.position.set(0, 1, 0);
    g.add(light);
    scene.add(g);
    return { g, pm, light, pos: new Vector3(x, 0.3, z) };
  });
}
