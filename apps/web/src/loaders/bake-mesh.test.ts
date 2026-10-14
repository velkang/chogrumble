import { describe, expect, it } from 'vitest';
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { bakeFirstMesh, toFloatGeometry } from './bake-mesh';

// meshopt output stores positions as normalized int16 and puts the dequantization scale on the node
function quantizedTriangle(): BufferGeometry {
  const g = new BufferGeometry();
  const pos = new Int16Array([32767, 0, 0, 0, 32767, 0, 0, 0, -32767]);
  g.setAttribute('position', new BufferAttribute(pos, 3, true));
  const nrm = new Int8Array([0, 127, 0, 0, 127, 0, 0, 127, 0]);
  g.setAttribute('normal', new BufferAttribute(nrm, 3, true));
  return g;
}

describe('toFloatGeometry', () => {
  it('dequantizes normalized integer attributes into float32', () => {
    const out = toFloatGeometry(quantizedTriangle());
    const p = out.getAttribute('position');
    expect(p.array).toBeInstanceOf(Float32Array);
    expect(p.normalized).toBe(false);
    expect(p.getX(0)).toBeCloseTo(1, 4);
    expect(p.getY(1)).toBeCloseTo(1, 4);
    expect(p.getZ(2)).toBeCloseTo(-1, 4);
    expect(out.getAttribute('normal').getY(0)).toBeCloseTo(1, 4);
  });

  it('flattens interleaved attributes', () => {
    const g = new BufferGeometry();
    const buf = new InterleavedBuffer(new Float32Array([1, 2, 3, 0.5, 0.25, 4, 5, 6, 0.75, 1]), 5);
    g.setAttribute('position', new InterleavedBufferAttribute(buf, 3, 0));
    g.setAttribute('uv', new InterleavedBufferAttribute(buf, 2, 3));
    const out = toFloatGeometry(g);
    expect(out.getAttribute('position')).toBeInstanceOf(BufferAttribute);
    expect(Array.from(out.getAttribute('position').array)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Array.from(out.getAttribute('uv').array)).toEqual([0.5, 0.25, 0.75, 1]);
  });

  it('keeps the index and leaves the source geometry untouched', () => {
    const src = quantizedTriangle();
    src.setIndex([0, 1, 2]);
    const out = toFloatGeometry(src);
    expect(Array.from(out.getIndex()?.array ?? [])).toEqual([0, 1, 2]);
    expect(src.getAttribute('position').array).toBeInstanceOf(Int16Array);
    expect(out).not.toBe(src);
  });
});

describe('bakeFirstMesh', () => {
  function sceneWithScaledMesh() {
    const root = new Group();
    const parent = new Group();
    parent.position.set(10, 0, 0);
    const mesh = new Mesh(quantizedTriangle(), new MeshBasicMaterial());
    mesh.scale.setScalar(2);
    parent.add(mesh);
    root.add(parent);
    return { root, mesh };
  }

  it('bakes the world transform into float positions and returns an identity-transform mesh', () => {
    const { root } = sceneWithScaledMesh();
    const baked = bakeFirstMesh(root);
    const p = baked.geometry.getAttribute('position');
    expect(p.getX(0)).toBeCloseTo(12, 3);
    expect(p.getY(1)).toBeCloseTo(2, 3);
    expect(p.getX(1)).toBeCloseTo(10, 3);
    expect(baked.position.toArray()).toEqual([0, 0, 0]);
    expect(baked.scale.toArray()).toEqual([1, 1, 1]);
  });

  it('keeps normals unit length after baking a scale', () => {
    const baked = bakeFirstMesh(sceneWithScaledMesh().root);
    const n = baked.geometry.getAttribute('normal');
    expect(Math.hypot(n.getX(0), n.getY(0), n.getZ(0))).toBeCloseTo(1, 4);
  });

  it('reuses the material but does not modify the source mesh', () => {
    const { root, mesh } = sceneWithScaledMesh();
    const baked = bakeFirstMesh(root);
    expect(baked).not.toBe(mesh);
    expect(baked.material).toBe(mesh.material);
    expect(mesh.scale.x).toBe(2);
    expect(mesh.geometry.getAttribute('position').array).toBeInstanceOf(Int16Array);
  });

  it('throws a clear error when the model has no mesh', () => {
    expect(() => bakeFirstMesh(new Group())).toThrow(/no mesh/i);
  });
});
