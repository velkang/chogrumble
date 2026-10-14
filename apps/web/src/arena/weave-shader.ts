import type { MeshStandardMaterial, Texture } from 'three';

/** Optional disc (x, z, radius) above y = 2 to discard, used to hollow out the sack's neck. */
export type CutDisc = readonly [number, number, number];

/**
 * Adds world-space triplanar weave detail so a blown-up texture still reads as burlap up close.
 */
export function addWeave(
  mat: MeshStandardMaterial,
  weaveMap: Texture,
  scale: number,
  strength: number,
  cut?: CutDisc,
): void {
  const s = scale.toFixed(3);
  const discard = cut
    ? `#include <clipping_planes_fragment>
      if (vWPos.y > 2.0 && length(vWPos.xz - vec2(${cut[0].toFixed(3)}, ${cut[1].toFixed(3)})) < ${cut[2].toFixed(3)}) discard;`
    : '#include <clipping_planes_fragment>';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms['weaveMap'] = { value: weaveMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNorm;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vWNorm = normalize(mat3(modelMatrix) * objectNormal);',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D weaveMap; varying vec3 vWPos; varying vec3 vWNorm;',
      )
      .replace('#include <clipping_planes_fragment>', discard)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 bw = abs(vWNorm); bw /= (bw.x + bw.y + bw.z);
        float wv = texture2D(weaveMap, vWPos.yz * ${s}).r * bw.x + texture2D(weaveMap, vWPos.xz * ${s}).r * bw.y + texture2D(weaveMap, vWPos.xy * ${s}).r * bw.z;
        diffuseColor.rgb *= mix(1.0, wv * 1.9, ${strength.toFixed(3)});`,
      );
  };
  // the shader text depends on the parameters, so they must be part of the program cache key
  mat.customProgramCacheKey = () => `weave:${s}:${strength}:${cut?.join(',') ?? ''}`;
}
