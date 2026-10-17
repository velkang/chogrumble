// Patches the Chog's standard material: face projection, fur recolour and finish, a painted
// shirt with a pattern, and the gum splat.
import { Color } from 'three';
import type { IUniform, Material, MeshStandardMaterial, Texture } from 'three';
import type { FurFinish, ShirtPattern } from '../looks/types';
import type { FaceName, Faces } from './faces';

export interface ChogLook {
  face: FaceName;
  fur?: number;
  furFinish?: FurFinish;
  shirt?: number;
  shirt2?: number;
  shirtPattern?: ShirtPattern;
}

export interface ChogUniforms {
  faceMap: IUniform<Texture>;
  /** Vertical squash of the face around the eyes; < 1 reads as a blink. */
  faceSquash: IUniform<number>;
  furCol: IUniform<Color>;
  shirtCol: IUniform<Color>;
  shirtCol2: IUniform<Color>;
  shirtPattern: IUniform<number>;
  recolor: IUniform<number>;
  multi: IUniform<number>;
  shirtOn: IUniform<number>;
  /** 0..1 pink gum smeared over the face. */
  gumMask: IUniform<number>;
}

const PATTERN_CODE: Readonly<Record<ShirtPattern, number>> = { solid: 0, stripes: 1, tux: 2, jacket: 3, robe: 4 };

const FRAGMENT_PARS = `#include <common>
  uniform sampler2D faceMap; uniform float faceSquash; uniform vec3 furCol; uniform vec3 shirtCol; uniform vec3 shirtCol2;
  uniform float shirtPattern; uniform float recolor; uniform float multi; uniform float shirtOn; uniform float gumMask;
  varying vec3 vBind; varying vec3 vBindN;`;

// bind-pose coordinates: the model is ~1 tall, face on +z between y 0.575 and 0.875
const FRAGMENT_MAP = `#include <map_fragment>
  vec3 col = diffuseColor.rgb;
  float lum = dot(col, vec3(.3,.59,.11));
  float fur = smoothstep(0.08, 0.22, col.r - col.g);
  if (recolor > 0.5) {
    vec3 f = furCol * (lum / 0.32);
    vec3 skin = vec3(1.0) * (lum / 0.62) * mix(vec3(1.0), furCol, 0.25);
    col = mix(skin, f, fur);
  }
  if (multi > 0.5) {
    vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vBind.y * 1.7 + vBind.x * 0.6 + vec3(0.0, 0.33, 0.67)));
    col = mix(col, rainbow * (0.4 + lum), fur);
  }
  float ax = abs(vBind.x);
  float shirt = shirtOn * smoothstep(0.12, 0.15, vBind.y) * (1.0 - smoothstep(0.52, 0.56, vBind.y)) * (1.0 - smoothstep(0.30, 0.34, ax));
  float frontHalf = step(0.0, vBind.z);
  vec3 sc = shirtCol;
  if (shirtPattern > 0.5 && shirtPattern < 1.5) {
    sc = mix(shirtCol, shirtCol2, step(0.5, fract(vBind.y * 22.0)));
  } else if (shirtPattern > 1.5 && shirtPattern < 2.5) {
    float v = frontHalf * (1.0 - smoothstep(0.045, 0.06, ax - (0.52 - vBind.y) * 0.14));
    sc = mix(shirtCol, shirtCol2, v);
  } else if (shirtPattern > 2.5 && shirtPattern < 3.5) {
    sc = mix(shirtCol, shirtCol2, frontHalf * (1.0 - smoothstep(0.035, 0.05, ax)));
  } else if (shirtPattern > 3.5) {
    float trim = max(frontHalf * (1.0 - smoothstep(0.025, 0.04, ax)), 1.0 - smoothstep(0.16, 0.19, vBind.y));
    sc = mix(shirtCol, shirtCol2, trim);
  }
  col = mix(col, sc * (0.55 + lum * 0.7), shirt);
  vec2 fuv = vec2((vBind.x + 0.215) / 0.43, ((vBind.y - 0.72) / faceSquash + 0.72 - 0.575) / 0.30);
  float front = step(0.04, vBind.z) * smoothstep(0.15, 0.45, vBindN.z);
  if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0 && front > 0.0) {
    vec4 fc = texture2D(faceMap, fuv);
    col = mix(col, fc.rgb, fc.a * front);
  }
  col = mix(col, vec3(1.0, 0.45, 0.75), gumMask * smoothstep(0.62, 0.70, vBind.y) * front);
  diffuseColor.rgb = col;`;

/** Surface tweaks per fur finish, on top of the recolour. */
function applyFinish(material: MeshStandardMaterial, finish: FurFinish): void {
  if (finish === 'metal') {
    material.metalness = 0.55;
    material.roughness = 0.32;
  } else if (finish === 'jade') {
    material.roughness = 0.22;
    material.emissive = new Color(0x0d3a2a);
  } else if (finish === 'bone') {
    material.roughness = 0.95;
  } else if (finish === 'radioactive') {
    material.emissive = new Color(0x1f7a10);
    material.emissiveIntensity = 0.6;
  }
}

export function chogMaterial(base: Material, faces: Faces, look: ChogLook): { material: Material; u: ChogUniforms } {
  const material = base.clone() as MeshStandardMaterial;
  const u: ChogUniforms = {
    faceMap: { value: faces[look.face] },
    faceSquash: { value: 1 },
    furCol: { value: new Color(look.fur ?? 0xffffff) },
    shirtCol: { value: new Color(look.shirt ?? 0xffffff) },
    shirtCol2: { value: new Color(look.shirt2 ?? 0xffffff) },
    shirtPattern: { value: PATTERN_CODE[look.shirtPattern ?? 'solid'] },
    recolor: { value: look.fur !== undefined && look.furFinish !== 'multi' ? 1 : 0 },
    multi: { value: look.furFinish === 'multi' ? 1 : 0 },
    shirtOn: { value: look.shirt !== undefined ? 1 : 0 },
    gumMask: { value: 0 },
  };
  if (look.furFinish) applyFinish(material, look.furFinish);
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 appearancePosition; varying vec3 vBind; varying vec3 vBindN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = appearancePosition; vBindN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <map_fragment>', FRAGMENT_MAP);
  };
  material.customProgramCacheKey = () => 'chog-material-v3';
  return { material, u };
}
