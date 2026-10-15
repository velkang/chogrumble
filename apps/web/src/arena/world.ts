// Builds the arena in a fixed order: sack, rope, floor, hazards, lights, the giant and its paw.
// Fighters are created per match by the director.
import { AdditiveBlending, Group, MeshBasicMaterial } from 'three';
import type { SpotLight } from 'three';
import type { Mesh, Points, Scene, Vector3 } from 'three';
import type { Models } from '../engine/assets';
import type { SharedTextures } from '../engine/textures';
import { makeChog } from '../chog/chog';
import type { Chog } from '../chog/chog';
import { gumBubble, hatOn } from '../chog/accessories';
import type { Faces } from '../chog/faces';
import { RIM_Y } from './constants';
import { addBlush, addFloor } from './floor';
import { addGumPuddle, addHeartPads, addPlatform } from './hazards';
import type { HeartPad, Platform } from './hazards';
import { addLights, addMotes } from './lights';
import { makePaw } from './paw';
import type { Paw } from './paw';
import { addRope, addSack } from './sack';
import type { Rim } from './sack';

export interface Giant extends Chog {
  pivot: Group;
}

export interface World {
  rim: Rim;
  platform: Platform;
  gumBlob: Mesh;
  heartPads: HeartPad[];
  motes: Points;
  giant: Giant;
  rope: Group;
  /** The main shadow-casting light. */
  sun: SpotLight;
  paw: Paw;
  beamMat: MeshBasicMaterial;
  heartBeamMat: MeshBasicMaterial;
}

const GIANT_SCALE = 30;

/** The giant: the same Chog rig, scaled up and leaning over the opening. */
function addGiant(scene: Scene, models: Models, faces: Faces, rimCenter: Vector3, light: boolean): Giant {
  const chog = makeChog(light ? models.chogLod : models.chog, faces, { scale: GIANT_SCALE, face: 'hearts' });
  hatOn(chog, 'bucket', models, light);
  gumBubble(chog, 0.3);
  const pivot = new Group();
  chog.g.position.set(0, -0.72 * GIANT_SCALE, -0.05 * GIANT_SCALE);
  pivot.add(chog.g);
  pivot.position.set(rimCenter.x, RIM_Y + 11.5, rimCenter.z - 1.5);
  pivot.rotation.x = 1.12;
  scene.add(pivot);
  const giant: Giant = Object.assign(chog, { pivot });
  giant.setPose('peer');
  giant.bob = 0;
  return giant;
}

/** `light` builds the scenery with the decimated models and a thinner rope, for low quality. */
export function buildWorld(scene: Scene, models: Models, faces: Faces, tex: SharedTextures, light = false): World {
  const rim = addSack(scene, models, tex.weaveGrey);
  const rope = addRope(scene, rim, light);
  addFloor(scene);
  addBlush(scene);
  const platform = addPlatform(scene, models, light);
  const gumBlob = addGumPuddle(scene);
  const heartPads = addHeartPads(scene);
  const sun = addLights(scene);
  const motes = addMotes(scene, tex.glow);
  const giant = addGiant(scene, models, faces, rim.center, light);
  const paw = makePaw(tex.weaveGrey);
  scene.add(paw.g);
  const beamMat = new MeshBasicMaterial({
    color: 0xff3cf0,
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const heartBeamMat = new MeshBasicMaterial({
    color: 0xff3050,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  return { rim, rope, platform, gumBlob, heartPads, motes, giant, paw, beamMat, heartBeamMat, sun };
}
