// A rigged Chog: the shared skinned geometry, a 12-bone skeleton and a face-swappable material.
import {
  Group,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Float32BufferAttribute,
} from 'three';
import type { Bone, BufferGeometry, Material, Mesh, Object3D } from 'three';
import { chogMaterial } from './chog-material';
import type { ChogLook, ChogUniforms } from './chog-material';
import type { FaceName, Faces } from './faces';
import { BONES, POSES } from './poses';
import type { BoneName, PoseName, Pose } from './poses';
import { computeSkinWeights } from './skin-weights';
import { buildSkeleton } from './skeleton';
import { shapeFighter, FIGHTER_SHAPE } from './fighter-shape';

type Axes = [number, number, number];
type MutablePose = Record<BoneName, Axes>;

export interface Chog {
  g: Group;
  body: Group;
  mesh: SkinnedMesh;
  B: Record<BoneName, Bone>;
  u: ChogUniforms;
  name: string;
  hp: number;
  cur: MutablePose;
  vel: MutablePose;
  target: Pose;
  k: number;
  walking: number;
  phase: number;
  bob: number;
  hat?: Object3D;
  gum?: Mesh;
  setPose(name: PoseName, k?: number): void;
  face(name: FaceName): void;
}

export interface ChogOptions extends ChogLook {
  name?: string;
  scale?: number;
  fighter?: boolean;
}

const skinnedGeometry = new WeakMap<BufferGeometry, BufferGeometry>();
const fighterGeometry = new WeakMap<BufferGeometry, BufferGeometry>();

/** The Chog geometry with skin weights added; computed once per source geometry and shared. */
function chogGeometry(src: BufferGeometry, fighter: boolean): BufferGeometry {
  const cache = fighter ? fighterGeometry : skinnedGeometry;
  const cached = cache.get(src);
  if (cached) return cached;
  const g = src.clone();
  const { indices, weights } = computeSkinWeights(g.getAttribute('position'));
  g.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4));
  g.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  if (fighter) shapeFighter(g);
  else g.setAttribute('appearancePosition', g.getAttribute('position'));
  cache.set(src, g);
  return g;
}

const clonePose = (p: Pose): MutablePose =>
  Object.fromEntries(BONES.map((b) => [b, [...p[b]] as Axes])) as MutablePose;

const zeroPose = (): MutablePose =>
  Object.fromEntries(BONES.map((b) => [b, [0, 0, 0] as Axes])) as MutablePose;

export function singleMaterial(mesh: Mesh): Material {
  if (Array.isArray(mesh.material)) throw new Error('Expected a mesh with a single material');
  return mesh.material;
}

export function makeChog(base: Mesh, faces: Faces, o: ChogOptions): Chog {
  const geo = chogGeometry(base.geometry, o.fighter ?? false);
  const { material, u } = chogMaterial(singleMaterial(base), faces, o);
  const { root, B, bones } = buildSkeleton(o.fighter);
  const mesh = new SkinnedMesh(geo, material);
  mesh.add(root);
  mesh.bind(new Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const body = new Group();
  body.add(mesh);
  if (o.fighter) body.position.y = FIGHTER_SHAPE.lift;
  const g = new Group();
  g.add(body);
  g.scale.setScalar(o.scale ?? 1);
  return {
    g,
    body,
    mesh,
    B,
    u,
    name: o.name ?? '',
    hp: 100,
    cur: clonePose(POSES.idle),
    vel: zeroPose(),
    target: POSES.idle,
    k: 10,
    walking: 0,
    phase: Math.random() * 6,
    bob: 1,
    setPose(name, k = 10) {
      this.target = POSES[name];
      this.k = k;
    },
    face(name) {
      this.u.faceMap.value = faces[name];
    },
  };
}
