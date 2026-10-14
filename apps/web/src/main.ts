// Entry point: build the view and arena, wire the 1v1 prototype, and run the frame loop.
import './debug/seeded-random';
import './app.css';
import { createView } from './engine/renderer';
import { createTweens } from './engine/tween';
import { createFxTextures, createWeaveGrey } from './engine/textures';
import { loadModels } from './engine/assets';
import { createFaces } from './chog/faces';
import { updateChog } from './chog/animate';
import { buildWorld } from './arena/world';
import type { World } from './arena/world';
import { createFx } from './fx/fx';
import { createCameraRig, SHOTS } from './camera/camera-rig';
import { createHud } from './hud/hud';
import { renderPortraits } from './hud/portraits';
import { byId, showError } from './hud/dom';
import type { Game } from './legacy-1v1/game';
import { updateCircling } from './legacy-1v1/movement';
import { bindUi, choose } from './legacy-1v1/ui';

const CAPTURE = new URLSearchParams(location.search).has('capture');
const MAX_DT = 0.05;
const HITSTOP_SLOWDOWN = 0.12;
const BLINK_EVERY = 4.2;
const BLINK_FOR = 0.14;

const stage = byId('stage');
const view = createView(stage, CAPTURE);
const tw = createTweens();
// creation order matters: it fixes the seeded random stream that ?capture&seed=N comparisons rely on
const weaveGrey = createWeaveGrey();
const faces = createFaces();
const tex = { weaveGrey, ...createFxTextures() };

/** The giant breathes, looks around and blinks. */
function animateGiant(world: World, time: number): void {
  const { giant } = world;
  giant.B.head.rotation.y += Math.sin(time * 0.7) * 0.08;
  giant.B.head.rotation.z += Math.sin(time * 0.45) * 0.05;
  giant.u.faceSquash.value = time % BLINK_EVERY > BLINK_EVERY - BLINK_FOR ? 0.15 : 1;
}

function createFrame(game: Game): (dt: number) => void {
  return (rawDt) => {
    let dt = rawDt;
    if (game.fx.state.hitstop > 0) {
      game.fx.state.hitstop -= dt;
      dt *= HITSTOP_SLOWDOWN;
    }
    tw.advance(dt);
    updateCircling(game, dt);
    for (const f of [...game.world.fighters, game.world.giant]) updateChog(f, dt);
    animateGiant(game.world, tw.now());
    game.world.motes.rotation.y += dt * 0.02;
    game.cam.update(dt, tw.now());
    view.renderer.render(view.scene, view.camera);
  };
}

function startLoop(frame: (dt: number) => void): void {
  let last = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now();
    frame(Math.min(MAX_DT, (now - last) / 1000));
    last = now;
  };
  loop();
}

type CaptureWindow = Window & {
  __ready?: boolean;
  __start?: () => void;
  __step?: (dt: number) => void;
  __shot?: (name: keyof typeof SHOTS) => void;
  __dbg?: () => unknown;
};

// capture hooks: step the sim by a fixed amount per recorded frame
function exposeCaptureHooks(game: Game, frame: (dt: number) => void): void {
  const w = window as CaptureWindow;
  w.__start = () => choose(game, game.world.fighters[0]);
  w.__step = frame;
  w.__shot = (name) => {
    void game.cam.shot(...SHOTS[name]);
    frame(0);
  };
  w.__dbg = () => ({ ...view, game });
  w.__ready = true;
}

async function boot(): Promise<void> {
  const models = await loadModels(import.meta.env.BASE_URL);
  const world = buildWorld(view.scene, models, faces, tex);
  const fx = createFx(view.scene, tw, tex);
  const cam = createCameraRig(view.camera, tw, fx.state);
  const match: Game['match'] = { me: null, foe: null, meddleQueued: false };
  const hud = createHud(stage, view.camera, tw, (f) => f === match.me);
  const game: Game = { scene: view.scene, camera: view.camera, tw, fx, hud, cam, world, match };
  view.resize();
  const [a, b] = world.fighters;
  const [pa = '', pb = ''] = renderPortraits(view.renderer, view.scene, [
    [a, 0xffb48a],
    [b, 0xd7a8ff],
  ]);
  a.portrait = pa;
  b.portrait = pb;
  bindUi(game);
  byId('loading').remove();
  const frame = createFrame(game);
  exposeCaptureHooks(game, frame);
  void cam.shot(...SHOTS.up);
  if (!CAPTURE) startLoop(frame);
}

boot().catch((error: unknown) => {
  showError(
    'Could not load the 3D models: ' + (error instanceof Error ? error.message : String(error)),
  );
});
