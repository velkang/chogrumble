import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildSkeleton } from './skeleton';
import { BONE_INDEX, computeSkinWeights } from './skin-weights';
import { BONES, POSES } from './poses';
import { fighterVertex } from './fighter-shape';

describe('articulated skeleton', () => {
  it('keeps skin indices and the 12-bone hierarchy in agreement', () => {
    const { root, B, bones } = buildSkeleton();
    expect(bones).toHaveLength(12);
    for (const [name, index] of Object.entries(BONE_INDEX)) expect(bones[index]!.name).toBe(name);
    expect(B.forearmL.parent).toBe(B.armL); expect(B.forearmR.parent).toBe(B.armR);
    expect(B.shinL.parent).toBe(B.legL); expect(B.shinR.parent).toBe(B.legR);
    expect(B.head.parent).toBe(B.spine); expect(B.hips.parent).toBe(root);
  });
  it('bending elbows/knees leaves head and shoulder attachments unchanged', () => {
    const { root, B } = buildSkeleton(); root.updateMatrixWorld(true);
    const head = B.head.getWorldPosition(new Vector3());
    const shoulder = B.armR.getWorldPosition(new Vector3());
    B.forearmR.rotation.y = 1.5; B.shinL.rotation.x = 1.4; root.updateMatrixWorld(true);
    expect(B.head.getWorldPosition(new Vector3())).toEqual(head);
    expect(B.armR.getWorldPosition(new Vector3())).toEqual(shoulder);
    expect(head.toArray()).toEqual([0, 0.56, 0.02]);
  });
  it('all poses supply finite rotations for all joints; the spectator keeps straight lower limbs', () => {
    for (const pose of Object.values(POSES)) for (const bone of BONES) expect(pose[bone].every(Number.isFinite)).toBe(true);
    for (const bone of ['forearmL', 'forearmR', 'shinL', 'shinR'] as const) expect(POSES.peer[bone]).toEqual([0, 0, 0]);
  });
  it('normalizes four bounded influences across both full-detail and LOD vertex regions', () => {
    // Sweep bind-space vertex regions at two sampling densities (the same weights serve both meshes).
    for (const stride of [0.025, 0.08]) {
      const points: [number, number][] = [];
      for (let x = -0.49; x <= 0.49; x += stride) for (let y = 0; y <= 0.98; y += stride) points.push([x, y]);
      const { indices, weights } = computeSkinWeights({ count: points.length, getX: (i) => points[i]![0], getY: (i) => points[i]![1] });
      for (let i = 0; i < points.length; i++) {
        expect([...weights.slice(i * 4, i * 4 + 4)].reduce((sum, v) => sum + v, 0)).toBeCloseTo(1, 5);
        for (const index of indices.slice(i * 4, i * 4 + 4)) expect(index).toBeLessThan(12);
      }
    }
  });
});

// Decode the shipped compressed positions directly, without DOM/image loading or modified assets.
import { readFile } from 'node:fs/promises';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
it.each(['chog', 'chog-lod'])('weights the actual %s mesh without invalid influences', async (name) => {
  await MeshoptDecoder.ready;
  const glb = await readFile(new URL(`../../public/models/${name}.glb`, import.meta.url));
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength)) as {
    meshes: { primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { bufferView: number; byteOffset?: number; count: number }[];
    bufferViews: { extensions: { EXT_meshopt_compression: { byteOffset: number; byteLength: number; byteStride: number; count: number; mode: 'ATTRIBUTES'; filter?: 'NONE' } } }[];
    nodes: { scale: number[]; translation: number[] }[];
  };
  const accessor = gltf.accessors[gltf.meshes[0]!.primitives[0]!.attributes.POSITION]!;
  const compression = gltf.bufferViews[accessor.bufferView]!.extensions.EXT_meshopt_compression;
  const binary = glb.subarray(28 + jsonLength);
  const decoded = new Uint8Array(compression.count * compression.byteStride);
  MeshoptDecoder.decodeGltfBuffer(decoded, compression.count, compression.byteStride, binary.subarray(compression.byteOffset, compression.byteOffset + compression.byteLength), compression.mode, compression.filter);
  const view = new DataView(decoded.buffer);
  const node = gltf.nodes[0]!;
  const component = (i: number, axis: number) => view.getInt16(i * compression.byteStride + (accessor.byteOffset ?? 0) + axis * 2, true) / 32767 * node.scale[axis]! + node.translation[axis]!;
  const positions = { count: accessor.count, getX: (i: number) => component(i, 0), getY: (i: number) => component(i, 1) };
  const { indices, weights } = computeSkinWeights(positions);
  let error = 0; const represented = new Set<number>();
  for (let i = 0; i < accessor.count; i++) {
    let sum = 0;
    for (let j = 0; j < 4; j++) { sum += weights[i * 4 + j]!; if (weights[i * 4 + j]! > 0.5) represented.add(indices[i * 4 + j]!); }
    error = Math.max(error, Math.abs(1 - sum));
  }
  expect(error).toBeLessThan(1e-6);
  expect(indices.reduce((max, value) => Math.max(max, value), 0)).toBeLessThan(12);
  for (const bone of ['forearmL', 'forearmR', 'shinL', 'shinR', 'head', 'spine'] as const) expect(represented.has(BONE_INDEX[bone])).toBe(true);
  // Exercise the actual full-detail/LOD surfaces, not just the joint endpoints.
  let extendedArms = 0; let extendedLegs = 0;
  for (let i = 0; i < accessor.count; i++) {
    const original: [number, number, number] = [component(i, 0), component(i, 1), component(i, 2)];
    const shaped = fighterVertex(...original);
    expect(shaped.every(Number.isFinite)).toBe(true);
    if (original[1] > 0.62 || (Math.abs(original[0]) < 0.2 && original[1] > 0.17)) expect(shaped).toEqual(original);
    if (Math.abs(shaped[0]) > 0.65) extendedArms++;
    if (shaped[1] < -0.15) extendedLegs++;
  }
  expect(extendedArms).toBeGreaterThan(40);
  expect(extendedLegs).toBeGreaterThan(40);
});
