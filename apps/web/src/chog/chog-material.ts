// Patches the Chog's standard material: face projection, fur/skin recolour, painted shirt, gum splat.
import { Color } from 'three';
import type { IUniform, Material, Texture } from 'three';
import type { FaceName, Faces } from './faces';

export interface ChogLook {
  face: FaceName;
  fur?: number;
  skin?: number;
  shirt?: number;
}

export interface ChogUniforms {
  faceMap: IUniform<Texture>;
  /** Vertical squash of the face around the eyes; < 1 reads as a blink. */
  faceSquash: IUniform<number>;
  furCol: IUniform<Color>;
  skinCol: IUniform<Color>;
  shirtCol: IUniform<Color>;
  recolor: IUniform<number>;
  shirtOn: IUniform<number>;
  /** 0..1 pink gum smeared over the face. */
  gumMask: IUniform<number>;
}

const FRAGMENT_PARS = `#include <common>
  uniform sampler2D faceMap; uniform float faceSquash; uniform vec3 furCol; uniform vec3 skinCol; uniform vec3 shirtCol;
  uniform float recolor; uniform float shirtOn; uniform float gumMask; varying vec3 vBind; varying vec3 vBindN;`;

// bind-pose coordinates: the model is ~1 tall, face on +z between y 0.575 and 0.875
const FRAGMENT_MAP = `#include <map_fragment>
  vec3 col = diffuseColor.rgb;
  float lum = dot(col, vec3(.3,.59,.11));
  float fur = smoothstep(0.08, 0.22, col.r - col.g);
  if (recolor > 0.5) {
    vec3 f = furCol * (lum / 0.32);
    vec3 s = skinCol * (lum / 0.62);
    col = mix(s, f, fur);
  }
  float ax = abs(vBind.x);
  float shirt = shirtOn * smoothstep(0.12, 0.15, vBind.y) * (1.0 - smoothstep(0.52, 0.56, vBind.y)) * (1.0 - smoothstep(0.30, 0.34, ax));
  col = mix(col, shirtCol * (0.55 + lum * 0.7), shirt);
  vec2 fuv = vec2((vBind.x + 0.215) / 0.43, ((vBind.y - 0.72) / faceSquash + 0.72 - 0.575) / 0.30);
  float front = step(0.04, vBind.z) * smoothstep(0.15, 0.45, vBindN.z);
  if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0 && front > 0.0) {
    vec4 fc = texture2D(faceMap, fuv);
    col = mix(col, fc.rgb, fc.a * front);
  }
  col = mix(col, vec3(1.0, 0.45, 0.75), gumMask * smoothstep(0.62, 0.70, vBind.y) * front);
  diffuseColor.rgb = col;`;

export function chogMaterial(
  base: Material,
  faces: Faces,
  look: ChogLook,
): { material: Material; u: ChogUniforms } {
  const material = base.clone();
  const u: ChogUniforms = {
    faceMap: { value: faces[look.face] },
    faceSquash: { value: 1 },
    furCol: { value: new Color(look.fur ?? 0xffffff) },
    skinCol: { value: new Color(look.skin ?? 0xffffff) },
    shirtCol: { value: new Color(look.shirt ?? 0xffffff) },
    recolor: { value: look.fur ? 1 : 0 },
    shirtOn: { value: look.shirt ? 1 : 0 },
    gumMask: { value: 0 },
  };
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind; varying vec3 vBindN;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvBind = position; vBindN = normal;',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <map_fragment>', FRAGMENT_MAP);
  };
  material.customProgramCacheKey = () => 'chog-material';
  return { material, u };
}
