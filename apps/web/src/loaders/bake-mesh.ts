import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import type { InterleavedBufferAttribute, Object3D } from 'three';

type AnyAttribute = BufferAttribute | InterleavedBufferAttribute;

const COMPONENT_GETTERS = ['getX', 'getY', 'getZ', 'getW'] as const;

// reads through getX/getY/... so normalized ints are dequantized and interleaved buffers are flattened
function toFloatAttribute(src: AnyAttribute): BufferAttribute {
  const { count, itemSize } = src;
  const out = new Float32Array(count * itemSize);
  const getters = COMPONENT_GETTERS.slice(0, itemSize);
  for (let i = 0; i < count; i++) {
    getters.forEach((get, c) => {
      out[i * itemSize + c] = src[get](i);
    });
  }
  return new BufferAttribute(out, itemSize, false);
}

/** A new geometry whose attributes are plain, non-interleaved float32 arrays. */
export function toFloatGeometry(src: BufferGeometry): BufferGeometry {
  const out = new BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    out.setAttribute(name, toFloatAttribute(attr as AnyAttribute));
  }
  const index = src.getIndex();
  if (index) out.setIndex(index.clone());
  out.groups = src.groups.map((g) => ({ ...g }));
  return out;
}

function findFirstMesh(root: Object3D): Mesh | undefined {
  let found: Mesh | undefined;
  root.traverse((child) => {
    if (!found && (child as Mesh).isMesh) found = child as Mesh;
  });
  return found;
}

/**
 * The model's first mesh as a new Mesh with its node transforms (including meshopt
 * dequantization) baked into float geometry, so all measurements are in model space.
 */
export function bakeFirstMesh(root: Object3D): Mesh {
  root.updateMatrixWorld(true);
  const src = findFirstMesh(root);
  if (!src) throw new Error('Model has no mesh to use');
  const geometry = toFloatGeometry(src.geometry).applyMatrix4(src.matrixWorld);
  return new Mesh(geometry, src.material);
}
