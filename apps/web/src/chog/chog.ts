// A rigged Chog: the shared skinned geometry, an 8-bone skeleton and a face-swappable material.
import {
  Bone,
  Group,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Float32BufferAttribute,
} from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { chogMaterial } from './chog-material';
import type { ChogLook, ChogUniforms } from './chog-material';
import type { FaceName, Faces } from './faces';
import { BONES, POSES } from './poses';
import type { BoneName, PoseName, Pose } from './poses';
import { computeSkinWeights } from './skin-weights';

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
}

const skinnedGeometry = new WeakMap<BufferGeometry, BufferGeometry>();

/** The Chog geometry with skin weights added; computed once per source geometry and shared. */
function chogGeometry(src: BufferGeometry): BufferGeometry {
  const cached = skinnedGeometry.get(src);
  if (cached) return cached;
  const g = src.clone();
  const { indices, weights } = computeSkinWeights(g.getAttribute('position'));
  g.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4));
  g.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  skinnedGeometry.set(src, g);
  return g;
}

const BONE_OFFSETS: Record<BoneName, readonly [BoneName | 'root', number, number, number]> = {
  hips: ['root', 0, 0.14, 0],
  spine: ['hips', 0, 0.2, 0],
  head: ['spine', 0, 0.22, 0.02],
  armL: ['spine', 0.24, 0.13, 0],
  armR: ['spine', -0.24, 0.13, 0],
  legL: ['hips', 0.09, -0.01, 0],
  legR: ['hips', -0.09, -0.01, 0],
};

function buildSkeleton(): { root: Bone; B: Record<BoneName, Bone>; bones: Bone[] } {
  const root = new Bone();
  const B = {} as Record<BoneName, Bone>;
  for (const name of BONES) {
    const [parent, x, y, z] = BONE_OFFSETS[name];
    const bone = new Bone();
    bone.position.set(x, y, z);
    (parent === 'root' ? root : B[parent]).add(bone);
    B[name] = bone;
  }
  // skin index order matches skin-weights.ts BONE_INDEX
  const bones = [root, B.hips, B.spine, B.head, B.armL, B.armR, B.legL, B.legR];
  return { root, B, bones };
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
  const geo = chogGeometry(base.geometry);
  const { material, u } = chogMaterial(singleMaterial(base), faces, o);
  const { root, B, bones } = buildSkeleton();
  const mesh = new SkinnedMesh(geo, material);
  mesh.add(root);
  mesh.bind(new Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const body = new Group();
  body.add(mesh);
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
