// Builds the duel scenery. Fighters are created per match by the duel presentation.
import { Group } from 'three';
import type { SpotLight } from 'three';
import type { Points, Scene } from 'three';
import type { Models } from '../engine/assets';
import type { SharedTextures } from '../engine/textures';
import { makeChog } from '../chog/chog';
import type { Chog } from '../chog/chog';
import { gumBubble, hatOn } from '../chog/accessories';
import type { Faces } from '../chog/faces';
import { addBlush, addFloor } from './floor';
import { addLights, addMotes } from './lights';
import { addRope, addSack } from './sack';
import type { Rim } from './sack';

export interface Giant extends Chog {
  pivot: Group;
}

export interface World {
  rim: Rim;
  motes: Points;
  giant: Giant;
  rope: Group;
  /** The main shadow-casting light. */
  sun: SpotLight;
}

const GIANT_SCALE = 8;

/** The giant: the same Chog rig, scaled up to watch from behind the fighting lane. */
function addGiant(scene: Scene, models: Models, faces: Faces, light: boolean): Giant {
  const chog = makeChog(light ? models.chogLod : models.chog, faces, { scale: GIANT_SCALE, face: 'hearts' });
  hatOn(chog, 'bucket', models, light);
  gumBubble(chog, 0.3);
  const pivot = new Group();
  pivot.add(chog.g);
  pivot.position.set(0, 0.3, -7.5);
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
  const sun = addLights(scene);
  const motes = addMotes(scene, tex.glow);
  const giant = addGiant(scene, models, faces, light);
  return { rim, rope, motes, giant, sun };
}
