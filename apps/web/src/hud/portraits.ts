// Renders a head-and-shoulders portrait of each fighter into a data URL for the HUD and pick cards.
import { Color, PerspectiveCamera, SRGBColorSpace, WebGLRenderTarget } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { headWorld } from '../chog/anchors';
import { updateChog } from '../chog/animate';
import type { Chog } from '../chog/chog';

const SIZE = 192;

function readPixels(renderer: WebGLRenderer, rt: WebGLRenderTarget): string {
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available in this browser');
  const img = ctx.createImageData(SIZE, SIZE);
  // WebGL rows are bottom-up
  for (let y = 0; y < SIZE; y++)
    img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/** One portrait per fighter, each on its own background colour. Leaves the fighters hidden. */
export function renderPortraits(
  renderer: WebGLRenderer,
  scene: Scene,
  sitters: readonly (readonly [Chog, number])[],
): string[] {
  const rt = new WebGLRenderTarget(SIZE, SIZE, { colorSpace: SRGBColorSpace });
  const pc = new PerspectiveCamera(30, 1, 0.1, 50);
  const bg = scene.background;
  const all = sitters.map(([f]) => f);
  const urls = sitters.map(([f, bgColor]) => {
    f.g.visible = true;
    f.g.position.set(0, 0, 0);
    f.g.rotation.y = 0;
    f.setPose('idle');
    updateChog(f, 1);
    const others = all.filter((o) => o !== f);
    others.forEach((o) => (o.g.visible = false));
    scene.background = new Color(bgColor);
    const h = headWorld(f, 0.05);
    pc.position.set(h.x + 0.5, h.y + 0.15, h.z + 2.0);
    pc.lookAt(h.x, h.y - 0.05, h.z);
    renderer.setRenderTarget(rt);
    renderer.render(scene, pc);
    const url = readPixels(renderer, rt);
    others.forEach((o) => (o.g.visible = true));
    return url;
  });
  renderer.setRenderTarget(null);
  scene.background = bg;
  all.forEach((f) => (f.g.visible = false));
  rt.dispose();
  return urls;
}
