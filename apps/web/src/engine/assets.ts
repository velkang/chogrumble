import type { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bakeFirstMesh } from '../loaders/bake-mesh';

/** The *Lod models are decimated crowd versions (Chog ~7k vertices, hats ~5k) for the fighters. */
export const MODEL_NAMES = ['chog', 'chogLod', 'sack', 'bucket', 'cap', 'bucketLod', 'capLod'] as const;
const FILES: Readonly<Record<(typeof MODEL_NAMES)[number], string>> = {
  chog: 'chog',
  chogLod: 'chog-lod',
  sack: 'sack',
  bucket: 'bucket',
  cap: 'cap',
  bucketLod: 'bucket-lod',
  capLod: 'cap-lod',
};
export type ModelName = (typeof MODEL_NAMES)[number];
/** Each model's first mesh, with node transforms baked into float geometry (model space). */
export type Models = Readonly<Record<ModelName, Mesh>>;

export async function loadModels(baseUrl: string): Promise<Models> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const meshes = await Promise.all(
    MODEL_NAMES.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`${baseUrl}models/${FILES[name]}.glb`);
        return bakeFirstMesh(gltf.scene);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not load the ${name} model: ${reason}`, { cause: error });
      }
    }),
  );
  return Object.fromEntries(MODEL_NAMES.map((n, i) => [n, meshes[i]!])) as Models;
}
