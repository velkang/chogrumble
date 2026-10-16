// The app shell owns loading, input, and a 60 Hz duel clock; rendering never decides combat.
import './debug/seeded-random';
import './app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createDuel, DUEL_RULES, statsFromTraits } from '@chog/sim';
import type { Duel, DuelState, FighterSpec } from '@chog/sim';
import { createView } from './engine/renderer';
import { SETTINGS, createFrameMonitor, detectQuality, deviceInfo } from './engine/quality';
import type { Quality } from './engine/quality';
import { createTweens } from './engine/tween';
import { createFxTextures, createWeaveGrey } from './engine/textures';
import { loadModels } from './engine/assets';
import { createFaces } from './chog/faces';
import { updateChog } from './chog/animate';
import { buildWorld } from './arena/world';
import { createFx } from './fx/fx';
import { byId } from './hud/dom';
import { createSound } from './audio/sound';
import { createWalletConnect } from './wallet/connect';
import { addRimCrowd } from './arena/rim-crowd';
import { App } from './ui/App';
import { failWith, ui } from './ui/store';
import { bindDuelKeyboard, duelInput } from './duel/input';
import { duelUi } from './duel/store';
import { createDuelPresentation } from './duel/presentation';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
let quality: Quality = detectQuality(deviceInfo(), params.get('quality'));
const stage = byId('stage');
const view = createView(stage, CAPTURE, SETTINGS[quality].maxPixelRatio);
const tw = createTweens();
const weaveGrey = createWeaveGrey();
const faces = createFaces();
const tex = { weaveGrey, ...createFxTextures() };
const chogData = import('@chog/content/chogs');
createRoot(byId('ui')).render(<StrictMode><App /></StrictMode>);

async function boot() {
  const models = await loadModels(import.meta.env.BASE_URL);
  const world = buildWorld(view.scene, models, faces, tex, SETTINGS[quality].lightScenery);
  const fx = createFx(view.scene, tw, tex);
  const sound = createSound();
  window.addEventListener('pointerdown', () => sound.unlock());
  window.addEventListener('keydown', () => sound.unlock());
  const crowd = addRimCrowd(view.scene, world.rim.center, world.rim.radius, SETTINGS[quality].lightScenery ? 12 : 22, import.meta.env.BASE_URL);
  const presentation = createDuelPresentation(view.scene, view.camera, models, sound, fx);
  let duel: Duel | null = null;
  let current: DuelState | null = null;
  let previous: DuelState | null = null;
  let accumulator = 0;
  let requestId = 0;
  let rerollId = 0;
  const portrait = matchMedia('(orientation: portrait) and (max-width: 1023px)');
  const freshSeed = () => `duel-${crypto.randomUUID()}`;
  const pause = () => {
    duelInput.clear(); accumulator = 0;
    if (!duel || duel.state().phase === 'matchResult') return;
    duel.pause(); current = duel.state(); previous = current;
    duelUi.setState({ state: current }); sound.music(false);
  };
  const resume = () => {
    if (!duel || document.hidden || portrait.matches) return;
    duelInput.clear(); accumulator = 0;
    duel.resume(); current = duel.state(); previous = current;
    duelUi.setState({ state: current }); sound.unlock(); sound.music(true);
  };
  const menu = () => {
    requestId++; duelInput.clear(); presentation.clear(); tw.cancelAll(); sound.music(false);
    duel = null; current = null; previous = null; accumulator = 0;
    duelUi.setState({ state: null, roster: null, combo: null }); ui.setState({ phase: 'ready' });
    view.camera.position.set(0, 3, 10);
    view.camera.lookAt(0, 2.5, -1);
  };
  duelUi.setState({ pause, resume, menu });
  bindDuelKeyboard(() => !!current && !current.paused && current.phase === 'fight', pause);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  portrait.addEventListener('change', pause);

  const applyQuality = (q: Quality) => {
    quality = q;
    const settings = SETTINGS[q];
    view.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.maxPixelRatio)); view.resize();
    world.sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    world.sun.shadow.map?.dispose(); world.sun.shadow.map = null;
    presentation.setQuality(settings);
  };
  applyQuality(quality);
  const monitor = createFrameMonitor({ budgetMs: 24, windowSeconds: 3 });
  const start = async (seed: string, token: number | null) => {
    const id = ++requestId;
    const last = duelUi.getState().roster;
    // Stop the previous session before awaiting metadata: rematches cannot advance old rounds.
    duel = null; current = null; previous = null; duelInput.clear(); accumulator = 0;
    tw.cancelAll(); fx.state.shakeAmt = 0; fx.state.hitstop = 0;
    ui.setState({ phase: 'loading', error: null }); sound.music(false);
    try {
      const data = await chogData;
      if (id !== requestId) return;
      const selected = token ?? ui.getState().candidates[0]?.tokenId;
      const mine = selected === undefined ? undefined : data.chogByToken(selected);
      if (!mine) throw new Error('Choose a Chog before entering the sack.');
      const opponent = last?.[0].tokenId === mine.tokenId ? last[1] : data.pickHouseChogs(seed, 1, new Set([mine.tokenId]))[0]!;
      const roster: [FighterSpec, FighterSpec] = [data.toFighter(mine), opponent];
      duel = createDuel({ roster, seed }); current = duel.state(); previous = current;
      presentation.play(roster, SETTINGS[quality]);
      duelUi.setState({ state: current, roster, combo: null });
      ui.setState({ phase: 'playing', chosen: mine.tokenId });
      sound.music(true);
      if (document.hidden || portrait.matches) pause();
    } catch (error) {
      if (id === requestId) { presentation.clear(); failWith(`Could not start a duel: ${error instanceof Error ? error.message : String(error)}`); }
    }
  };
  const reroll = async () => {
    const id = ++rerollId;
    try {
      const { pickHouseChogs } = await chogData;
      const candidates = pickHouseChogs(freshSeed(), 3, new Set()).map((f) => {
        const special = statsFromTraits(f.traits).special;
        return { tokenId: f.tokenId!, name: f.name, special: special === 'none' ? 'dive' : special };
      });
      if (id === rerollId) ui.setState({ candidates });
    } catch (error) { failWith(`Could not load Chogs: ${String(error)}`); }
  };
  const wallet = createWalletConnect(chogData);
  ui.setState({
    play: (token) => { void start(freshSeed(), token); }, reroll: () => { void reroll(); },
    muted: sound.muted(), toggleMute: () => { sound.setMuted(!sound.muted()); ui.setState({ muted: sound.muted() }); },
    connectWallet: wallet.connect, disconnectWallet: wallet.disconnect, checkToken: wallet.checkToken,
  });
  await reroll();
  if (ui.getState().phase !== 'error') menu();

  const frame = (rawDt: number) => {
    if (!Number.isFinite(rawDt) || rawDt < 0) return;
    if (!CAPTURE && quality === 'high' && monitor.push(rawDt)) applyQuality('low');
    const dt = Math.min(rawDt, 0.1);
    if (duel && current && !current.paused && current.phase !== 'matchResult') {
      accumulator += dt;
      const tick = 1 / DUEL_RULES.hz;
      while (accumulator >= tick) {
        previous = current;
        const result = duel.step(duelInput.take());
        current = result.state;
        presentation.events(result.events, current);
        for (const e of result.events) if (e.type === 'hit' && !e.blocked) duelUi.setState({ combo: { side: e.side, count: e.combo, until: current.frame + 65 } });
        duelUi.setState({ state: current });
        if (current.phase === 'matchResult') ui.setState({ phase: 'results' });
        accumulator -= tick;
      }
    }
    const animationDt = current?.paused ? 0 : dt;
    tw.advance(animationDt);
    if (current && previous) presentation.render(previous, current, current.paused ? 1 : accumulator * DUEL_RULES.hz, animationDt);
    updateChog(world.giant, animationDt);
    world.giant.B.head.rotation.y += Math.sin(tw.now() * 0.7) * 0.08;
    world.giant.u.faceSquash.value = tw.now() % 4.2 > 4.06 ? 0.15 : 1;
    world.motes.rotation.y += animationDt * 0.02;
    crowd.update(tw.now());
    view.renderer.render(view.scene, view.camera);
  };
  const w = window as Window & { __ready?: boolean; __step?: (dt: number) => void; __watch?: (seed: string, token?: number) => Promise<void>; __dbg?: () => unknown };
  w.__ready = true; w.__step = frame; w.__watch = (seed, token) => start(seed, token ?? null);
  w.__dbg = () => ({ duel, state: current, view, quality });
  if (!CAPTURE) {
    let last = performance.now();
    const loop = (now: number) => { frame((now - last) / 1000); last = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
boot().catch((error: unknown) => failWith(`Could not load the arena: ${error instanceof Error ? error.message : String(error)}`));
