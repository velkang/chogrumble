// Headwear from a HeadSpec, built in head-bone space. Caps and bucket hats reuse the 3D models
// (recoloured, with the cap's own text on a decal); everything else is built from primitives.
// Head-bone space: head centre y 0.19, top about 0.45, radius about 0.29, face front at z 0.28.
import {
  Box3, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh,
  MeshStandardMaterial, OctahedronGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { Models } from '../engine/assets';
import { canvasTex } from '../engine/textures';
import type { HeadSpec } from '../looks/types';
import { singleMaterial } from './chog';
import { BUCKET_UP } from './accessories';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const std = (color: number, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.8 }), extra);

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.userData['ownsGeometry'] = true;
  return m;
}

/** Recolours the cap's red crown (and blanks its baked lettering) or the bucket's purple. */
function recolored(base: Material, kind: 'cap' | 'bucket', tint: number): Material {
  const m = base.clone() as MeshStandardMaterial;
  const color = new Color(tint);
  const mask =
    kind === 'cap'
      ? 'max(smoothstep(0.06, 0.18, c.r - max(c.g, c.b)), smoothstep(0.4, 0.6, mn))'
      : 'smoothstep(0.03, 0.12, c.b - c.g) * step(c.g, c.r + 0.02)';
  m.onBeforeCompile = (sh) => {
    sh.uniforms['hatTint'] = { value: color };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 hatTint;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b));
        diffuseColor.rgb = mix(c, hatTint * (0.35 + 1.2 * mx), ${mask});`,
      );
  };
  m.customProgramCacheKey = () => `hat-tint-${kind}`;
  return m;
}

/** Text on a transparent patch; with `background`, a rounded patch of that colour sits behind it. */
function textDecal(text: string, color: number, width: number, background?: number): Mesh {
  const tex = canvasTex(256, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    if (background !== undefined) {
      c.fillStyle = hex(background);
      c.beginPath();
      c.roundRect(4, 4, w - 8, h - 8, 28);
      c.fill();
    }
    c.fillStyle = hex(color);
    c.strokeStyle = 'rgba(0,0,0,.55)';
    c.lineWidth = 6;
    const size = Math.min(96, Math.floor((w * 1.6) / Math.max(2, text.length)));
    c.font = `bold ${size}px "Lilita One", Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText(text, w / 2, h / 2 + 4);
    c.fillText(text, w / 2, h / 2 + 4);
  });
  const m = new Mesh(
    new PlaneGeometry(width, width * 0.625),
    new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.renderOrder = 2;
  m.userData['ownsGeometry'] = true;
  return m;
}

/** Where the cap's front panel is, in the cap model's own space. */
const capFronts = new WeakMap<BufferGeometry, { y: number; z: number; width: number }>();
function capFront(geometry: BufferGeometry): { y: number; z: number; width: number } {
  const known = capFronts.get(geometry);
  if (known) return known;
  const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
  const p = geometry.getAttribute('position');
  // the baked lettering sits on the lower front of the crown, just above the brim
  const yLo = box.min.y + (box.max.y - box.min.y) * 0.42;
  const yHi = box.min.y + (box.max.y - box.min.y) * 0.72;
  const halfW = (box.max.x - box.min.x) * 0.06;
  let z = box.min.z;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > yLo && y < yHi && Math.abs(p.getX(i)) < halfW) z = Math.max(z, p.getZ(i));
  }
  const front = { y: (yLo + yHi) / 2, z, width: (box.max.x - box.min.x) * 0.66 };
  capFronts.set(geometry, front);
  return front;
}

function capOrBucket(spec: HeadSpec, models: Models, crowd: boolean): Group {
  const kind = spec.kind === 'cap' ? 'cap' : 'bucket';
  const src = kind === 'cap' ? (crowd ? models.capLod : models.cap) : crowd ? models.bucketLod : models.bucket;
  const h = new Mesh(src.geometry, recolored(singleMaterial(src), kind, spec.color));
  h.castShadow = true;
  const holder = new Group();
  holder.add(h);
  if (kind === 'cap') {
    h.position.set(0, -0.16, 0.11);
    holder.scale.setScalar(0.76);
    holder.position.set(0, 0.265, 0.01);
    holder.rotation.x = -0.1;
    if (spec.text) {
      const f = capFront(src.geometry);
      // the patch is cap-coloured so it hides the model's own lettering underneath
      const decal = textDecal(spec.text, spec.color2 ?? 0xffffff, f.width, spec.color);
      decal.position.set(0, f.y, f.z + 0.006);
      decal.rotation.x = -0.18;
      h.add(decal);
    }
  } else {
    h.quaternion.setFromUnitVectors(BUCKET_UP, new Vector3(0, 1, 0));
    h.position.set(-0.08, -0.28, -0.08);
    holder.scale.setScalar(0.75);
    holder.position.set(0, 0.285, 0.02);
    holder.rotation.x = -0.14;
  }
  return holder;
}

const dome = (r: number, cut = 0.5) => new SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI * cut);

function beanie(spec: HeadSpec): Group {
  const g = new Group();
  const knit = std(spec.color, { roughness: 1 });
  const d = mesh(dome(0.3), knit, 0, 0.26, 0);
  d.scale.y = 0.95;
  const band = mesh(new CylinderGeometry(0.305, 0.305, 0.09, 24, 1, true), std(spec.color, { roughness: 1 }), 0, 0.3, 0);
  (band.material as MeshStandardMaterial).color.multiplyScalar(0.8);
  (band.material as MeshStandardMaterial).side = DoubleSide;
  g.add(d, band, mesh(new SphereGeometry(0.06, 10, 8), knit, 0, 0.56, 0));
  if (spec.text) {
    const decal = textDecal(spec.text, spec.color2 ?? 0xffffff, 0.3);
    decal.position.set(0, 0.3, 0.31);
    g.add(decal);
  }
  return g;
}

function hornPair(color: number): Group {
  const g = new Group();
  for (const s of [-1, 1]) {
    const h = mesh(new ConeGeometry(0.05, 0.22, 12), std(color, { roughness: 0.5 }), 0.15 * s, 0.46, 0.02);
    h.rotation.z = -0.45 * s;
    g.add(h);
  }
  return g;
}

function ring(color: number, r: number, y: number, metal = true, emissive = false, tube = 0.025): Mesh {
  const m = mesh(
    new TorusGeometry(r, tube, 8, 36),
    std(color, metal ? { metalness: 0.7, roughness: 0.3, ...(emissive ? { emissive: new Color(color), emissiveIntensity: 0.8 } : {}) } : {}),
    0,
    y,
    0,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

type Builder = (spec: HeadSpec) => Object3D;

const BUILD: Partial<Record<HeadSpec['kind'], Builder>> = {
  beanie,
  mask: (s) => beanie({ ...s, kind: 'beanie' }),
  band: (s) => {
    const g = new Group();
    g.add(ring(s.color, 0.265, 0.22, false, false, 0.035));
    if (s.color2 !== undefined) g.add(mesh(new CylinderGeometry(0.04, 0.04, 0.01, 16).rotateX(Math.PI / 2), std(s.color2), 0, 0.22, 0.295));
    return g;
  },
  crown: (s) => {
    const g = new Group();
    const gold = std(s.color, { metalness: 0.8, roughness: 0.25 });
    g.add(mesh(new CylinderGeometry(0.21, 0.23, 0.1, 18, 1, true), gold, 0, 0.44, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new ConeGeometry(0.035, 0.1, 8), gold, Math.sin(a) * 0.21, 0.54, Math.cos(a) * 0.21));
    }
    (g.children[0] as Mesh).material = Object.assign(gold.clone(), { side: DoubleSide });
    return g;
  },
  wizard: (s) => {
    const g = new Group();
    g.add(mesh(new ConeGeometry(0.25, 0.5, 20), std(s.color), 0, 0.64, -0.02));
    g.add(mesh(new CylinderGeometry(0.42, 0.42, 0.02, 28), std(s.color), 0, 0.39, 0));
    if (s.color2 !== undefined) g.add(mesh(new OctahedronGeometry(0.05), std(s.color2, { emissive: new Color(s.color2), emissiveIntensity: 0.6 }), 0.06, 0.6, 0.2));
    return g;
  },
  ushanka: (s) => {
    const g = new Group();
    const fur = std(s.color, { roughness: 1 });
    g.add(mesh(new CylinderGeometry(0.3, 0.32, 0.22, 20), fur, 0, 0.42, 0));
    for (const x of [-0.32, 0.32]) g.add(mesh(new CapsuleGeometry(0.06, 0.16, 4, 8), fur, x, 0.28, 0));
    return g;
  },
  helmet: (s) => {
    const g = new Group();
    g.add(mesh(dome(0.29, 0.5), std(s.color, { metalness: 0.7, roughness: 0.35 }), 0, 0.27, -0.02));
    g.add(mesh(new CapsuleGeometry(0.035, 0.3, 4, 8).rotateX(Math.PI / 2), std(s.color2 ?? 0xd8323c, { roughness: 1 }), 0, 0.57, -0.02));
    return g;
  },
  durag: (s) => {
    const g = new Group();
    g.add(mesh(dome(0.3, 0.5), std(s.color, { roughness: 0.4 }), 0, 0.23, -0.02));
    g.add(mesh(new CapsuleGeometry(0.035, 0.22, 4, 8), std(s.color, { roughness: 0.4 }), 0, 0.12, -0.3));
    return g;
  },
  hair: (s) => {
    const tex =
      s.color2 === undefined
        ? null
        : canvasTex(4, 64, (c) => {
            ['#ff4d4d', '#ff9f1c', '#ffe94d', '#4dff88', '#4dc3ff', '#b04dff'].forEach((col, i) => {
              c.fillStyle = col;
              c.fillRect(0, i * 11, 4, 11);
            });
          });
    // a cap of hair on top, kept above the eyes so the face stays visible
    const m = mesh(dome(0.3, 0.5), std(s.color, tex ? { map: tex, color: new Color(0xffffff) } : { roughness: 0.9 }), 0, 0.25, -0.03);
    m.scale.set(1.05, 0.8, 1.05);
    return m;
  },
  nose: (s) => mesh(new SphereGeometry(0.065, 16, 12), std(s.color, { roughness: 0.2 }), 0, 0.12, 0.34),
  horns: (s) => hornPair(s.color),
  wreath: (s) => ring(s.color, 0.27, 0.36),
  halo: (s) => ring(s.color, 0.2, 0.56, true, true),
  eye3: (s) => mesh(new SphereGeometry(0.05, 16, 12), std(s.color, { emissive: new Color(s.color), emissiveIntensity: 0.7 }), 0, 0.3, 0.27),
  diamond: (s) => mesh(new OctahedronGeometry(0.1), std(s.color, { metalness: 0.3, roughness: 0.05, emissive: new Color(s.color), emissiveIntensity: 0.35 }), 0, 0.68, 0),
  banana: (s) => {
    const m = mesh(new CapsuleGeometry(0.045, 0.24, 4, 10), std(s.color, { roughness: 0.6 }), 0, 0.5, 0);
    m.rotation.z = 0.55;
    return m;
  },
  shroom: (s) => {
    const tex = canvasTex(64, 64, (c) => {
      c.fillStyle = hex(s.color);
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = hex(s.color2 ?? 0xffffff);
      for (const [x, y] of [[12, 40], [34, 22], [52, 46], [24, 10], [46, 6]] as const) {
        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.fill();
      }
    });
    const m = mesh(dome(0.34), std(0xffffff, { map: tex, roughness: 0.5 }), 0, 0.3, 0);
    m.scale.y = 0.6;
    return m;
  },
  fedora: (s) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.21, 0.25, 0.18, 20), std(s.color), 0, 0.5, 0));
    g.add(mesh(new CylinderGeometry(0.4, 0.4, 0.02, 28), std(s.color), 0, 0.41, 0));
    g.add(mesh(new CylinderGeometry(0.252, 0.252, 0.04, 20, 1, true), std(s.color2 ?? 0xd8323c), 0, 0.44, 0));
    return g;
  },
};

/** Builds the headwear for a spec (null for none). `crowd` uses the light hat models. */
export function buildHeadwear(spec: HeadSpec | null, models: Models, crowd: boolean): Object3D | null {
  if (!spec) return null;
  if (spec.kind === 'cap' || spec.kind === 'bucket') return capOrBucket(spec, models, crowd);
  const build = BUILD[spec.kind];
  return build ? build(spec) : null;
}

/** Frees per-hat materials, textures and primitive geometry (shared model geometry is kept). */
export function disposeHeadwear(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    if (m.userData['ownsGeometry']) m.geometry.dispose();
    const materials = Array.isArray(m.material) ? m.material : [m.material];
    materials.forEach((mat) => {
      (mat as MeshStandardMaterial).map?.dispose();
      mat.dispose();
    });
  });
}
