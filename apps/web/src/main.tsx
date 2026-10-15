// Entry point: build the 3D view and arena, mount the HUD, and run the frame loop.
import './debug/seeded-random';
import './app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createLiveMatch, statsFromTraits } from '@chog/sim';
import { createView } from './engine/renderer';
import { SETTINGS, createFrameMonitor, detectQuality, deviceInfo } from './engine/quality';
import type { Quality } from './engine/quality';
import { createTweens } from './engine/tween';
import { createFxTextures, createWeaveGrey } from './engine/textures';
import { loadModels } from './engine/assets';
import { createFaces } from './chog/faces';
import { updateChog } from './chog/animate';
import { buildWorld } from './arena/world';
import type { World } from './arena/world';
import { createFx } from './fx/fx';
import { createCameraRig, SHOTS } from './camera/camera-rig';
import { byId } from './hud/dom';
import { createDirector } from './director/director';
import { createSound } from './audio/sound';
import { createWalletConnect } from './wallet/connect';
import { addRimCrowd } from './arena/rim-crowd';
import { createLineup } from './debug/lineup';
import type { Director } from './director/director';
import { App } from './ui/App';
import { failWith, ui } from './ui/store';

const CAPTURE = new URLSearchParams(location.search).has('capture');
/** Longest visual step: slower frames slow the animation down rather than skip ahead. */
const MAX_DT = 0.05;
/** Longest real step the match clock takes in one frame (late-join resync comes with lobbies). */
const MAX_REAL_DT = 0.25;
const HITSTOP_SLOWDOWN = 0.12;
const BLINK_EVERY = 4.2;
const BLINK_FOR = 0.14;
const MATCH_SIZE = 12;

const params = new URLSearchParams(location.search);
let quality: Quality = detectQuality(deviceInfo(), params.get('quality'));
const stage = byId('stage');
const view = createView(stage, CAPTURE, SETTINGS[quality].maxPixelRatio);
const tw = createTweens();
// creation order matters: it fixes the seeded random stream that ?capture&seed=N comparisons rely on
const weaveGrey = createWeaveGrey();
const faces = createFaces();
const tex = { weaveGrey, ...createFxTextures() };

createRoot(byId('ui')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/** The giant breathes, looks around and blinks. */
function animateGiant(world: World, time: number): void {
  const { giant } = world;
  giant.B.head.rotation.y += Math.sin(time * 0.7) * 0.08;
  giant.B.head.rotation.z += Math.sin(time * 0.45) * 0.05;
  giant.u.faceSquash.value = time % BLINK_EVERY > BLINK_EVERY - BLINK_FOR ? 0.15 : 1;
}

// the full Chog list is big, so it loads in its own chunk alongside the models
const chogData = import('@chog/content/chogs');

/** A live match: your Chog (if any) plus house Chogs up to twelve. */
async function liveMatch(seed: string, playerToken: number | null) {
  const { chogByToken, pickHouseChogs, toFighter } = await chogData;
  const mine = playerToken === null ? undefined : chogByToken(playerToken);
  const house = pickHouseChogs(seed, MATCH_SIZE - (mine ? 1 : 0), new Set(mine ? [mine.tokenId] : []));
  const roster = mine ? [toFighter(mine), ...house] : house;
  return createLiveMatch({ roster, seed, playerId: mine ? `token:${mine.tokenId}` : null });
}

/** Three random Chogs to choose from on the start screen. */
async function offerCandidates(seed: string) {
  const { pickHouseChogs } = await chogData;
  const candidates = pickHouseChogs(seed, 3, new Set()).map((f) => {
    const special = statsFromTraits(f.traits).special;
    return { tokenId: f.tokenId ?? 0, name: f.name, special: special === 'none' ? 'dive' : special };
  });
  ui.setState({ candidates });
}

function startLoop(frame: (dt: number) => void): void {
  let last = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now();
    frame((now - last) / 1000);
    last = now;
  };
  loop();
}

type CaptureWindow = Window & {
  __lineup?: (tokenIds: number[]) => Promise<unknown>;
  __ready?: boolean;
  __watch?: (seed: string, token?: number | null) => void;
  __step?: (dt: number) => void;
  __dbg?: () => unknown;
};

async function boot(): Promise<void> {
  const models = await loadModels(import.meta.env.BASE_URL);
  const world = buildWorld(view.scene, models, faces, tex, SETTINGS[quality].lightScenery);
  const fx = createFx(view.scene, tw, tex);
  const cam = createCameraRig(view.camera, tw, fx.state);
  const sound = createSound();
  // audio may only start after a tap or click
  window.addEventListener('pointerdown', () => sound.unlock());
  window.addEventListener('keydown', () => sound.unlock());
  const crowd = addRimCrowd(view.scene, world.rim.center, world.rim.radius, SETTINGS[quality].lightScenery ? 12 : 22, import.meta.env.BASE_URL);
  ui.setState({ muted: sound.muted(), toggleMute: () => {
    sound.setMuted(!sound.muted());
    ui.setState({ muted: sound.muted() });
  } });
  const director: Director = createDirector(
    { scene: view.scene, camera: view.camera, stage, tw, fx, cam, world, models, faces, sound, crowd },
    SETTINGS[quality],
  );
  const applyQuality = (q: Quality) => {
    quality = q;
    const s = SETTINGS[q];
    view.renderer.setPixelRatio(Math.min(devicePixelRatio, s.maxPixelRatio));
    view.resize();
    world.sun.shadow.mapSize.set(s.shadowMapSize, s.shadowMapSize);
    world.sun.shadow.map?.dispose();
    world.sun.shadow.map = null;
    director.setQuality(s);
  };
  applyQuality(quality);
  // drop to low quality if frames stay slow (never back up mid-session, to avoid flip-flopping)
  const monitor = createFrameMonitor({ budgetMs: 24, windowSeconds: 3 });
  view.resize();
  void cam.shot(...SHOTS.up);

  const frame = (rawDt: number) => {
    if (!CAPTURE && quality === 'high' && monitor.push(rawDt)) applyQuality('low');
    let dt = Math.min(MAX_DT, rawDt);
    if (fx.state.hitstop > 0) {
      fx.state.hitstop -= dt;
      dt *= HITSTOP_SLOWDOWN;
    }
    tw.advance(dt);
    director.update(Math.min(MAX_REAL_DT, rawDt), dt);
    for (const c of director.chogs()) if (c.g.visible) updateChog(c, dt);
    updateChog(world.giant, dt);
    animateGiant(world, tw.now());
    world.motes.rotation.y += dt * 0.02;
    crowd.update(tw.now());
    cam.update(dt, tw.now());
    view.renderer.render(view.scene, view.camera);
  };

  const start = (seed: string, playerToken: number | null) => {
    ui.setState({ chosen: playerToken });
    liveMatch(seed, playerToken).then(director.play, (error: unknown) =>
      failWith('Could not start a match: ' + (error instanceof Error ? error.message : String(error))),
    );
  };
  const freshSeed = () => `match-${Date.now().toString(36)}`;
  const reroll = () => {
    offerCandidates(freshSeed()).catch((error: unknown) => failWith('Could not load Chogs: ' + String(error)));
  };
  reroll();
  const wallet = createWalletConnect(chogData);
  ui.setState({
    phase: 'ready',
    play: (token) => start(freshSeed(), token),
    reroll,
    connectWallet: wallet.connect,
    disconnectWallet: wallet.disconnect,
    checkToken: wallet.checkToken,
  });
  const w = window as CaptureWindow;
  w.__watch = (seed: string, token: number | null = null) => start(seed, token);
  w.__step = frame;
  w.__dbg = () => ({ ...view, world, director, ui: ui.getState(), quality, applyQuality });
  if (CAPTURE) {
    const lineup = createLineup(view.scene, models, cam);
    w.__lineup = (ids) => lineup.show(ids).then((chogs) => chogs.length);
  }
  w.__ready = true;
  if (!CAPTURE) startLoop(frame);
}

boot().catch((error: unknown) => {
  failWith('Could not load the 3D models: ' + (error instanceof Error ? error.message : String(error)));
});
