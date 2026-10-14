import type { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bakeFirstMesh } from '../loaders/bake-mesh';

export const MODEL_NAMES = ['chog', 'sack', 'bucket', 'cap'] as const;
export type ModelName = (typeof MODEL_NAMES)[number];
/** Each model's first mesh, with node transforms baked into float geometry (model space). */
export type Models = Readonly<Record<ModelName, Mesh>>;

export async function loadModels(baseUrl: string): Promise<Models> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const meshes = await Promise.all(
    MODEL_NAMES.map(async (name) => {
      try {
        const gltf = await loader.loadAsync(`${baseUrl}models/${name}.glb`);
        return bakeFirstMesh(gltf.scene);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not load the ${name} model: ${reason}`, { cause: error });
      }
    }),
  );
  return Object.fromEntries(MODEL_NAMES.map((n, i) => [n, meshes[i]!])) as Models;
}
