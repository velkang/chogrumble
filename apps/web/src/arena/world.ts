// Builds the whole arena in a fixed order: sack, rope, floor, hazards, lights, the giant, fighters, paw.
import { AdditiveBlending, Group, MeshBasicMaterial } from 'three';
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

export interface Fighter extends Chog {
  specials: string[];
  free: boolean;
  stuck: number;
  circleDir: number;
  nextMove: string | null;
  portrait: string;
}

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
  fighters: [Fighter, Fighter];
  paw: Paw;
  beamMat: MeshBasicMaterial;
  heartBeamMat: MeshBasicMaterial;
}

const GIANT_SCALE = 30;

/** The giant: the same Chog rig, scaled up and leaning over the opening. */
function addGiant(scene: Scene, models: Models, faces: Faces, rimCenter: Vector3): Giant {
  const chog = makeChog(models.chog, faces, { scale: GIANT_SCALE, face: 'hearts' });
  hatOn(chog, 'bucket', models);
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

function fighter(chog: Chog, specials: string[]): Fighter {
  return Object.assign(chog, {
    specials,
    free: false,
    stuck: 0,
    circleDir: 1,
    nextMove: null,
    portrait: '',
  });
}

function addFighters(scene: Scene, models: Models, faces: Faces): [Fighter, Fighter] {
  const a = fighter(
    makeChog(models.chog, faces, {
      name: 'TISM Chog',
      scale: 1.9,
      face: 'normal',
      fur: 0x2c2632,
      skin: 0x8a5436,
      shirt: 0xff8a1e,
    }),
    ['laser'],
  );
  hatOn(a, 'cap', models);
  const b = fighter(
    makeChog(models.chog, faces, { name: 'Gum Chog', scale: 1.9, face: 'normal', shirt: 0xe84fb3 }),
    ['bubble'],
  );
  hatOn(b, 'bucket', models);
  gumBubble(b, 0);
  scene.add(a.g, b.g);
  return [a, b];
}

export function buildWorld(scene: Scene, models: Models, faces: Faces, tex: SharedTextures): World {
  const rim = addSack(scene, models, tex.weaveGrey);
  addRope(scene, rim);
  addFloor(scene);
  addBlush(scene);
  const platform = addPlatform(scene, models);
  const gumBlob = addGumPuddle(scene);
  const heartPads = addHeartPads(scene);
  addLights(scene);
  const motes = addMotes(scene, tex.glow);
  const giant = addGiant(scene, models, faces, rim.center);
  const fighters = addFighters(scene, models, faces);
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
  return { rim, platform, gumBlob, heartPads, motes, giant, fighters, paw, beamMat, heartBeamMat };
}
