// Plays a live match in 3D: steps the match loop in lockstep with the real-time clock, feeds in
// the player's button presses, and stages each event as it happens. Outcomes come only from the sim.
import type { PerspectiveCamera, Scene } from 'three';
import { TICK_MS } from '@chog/sim';
import type { FighterSpec, LiveMatch, MatchEvent } from '@chog/sim';
import { CANCELLED } from '../engine/tween';
import { createMatchClock } from '../engine/match-clock';
import type { Tweens } from '../engine/tween';
import type { Models } from '../engine/assets';
import type { Fx } from '../fx/fx';
import type { CameraRig } from '../camera/camera-rig';
import type { World } from '../arena/world';
import { singleMaterial } from '../chog/chog';
import type { Chog } from '../chog/chog';
import { setGum } from '../chog/accessories';
import type { Faces } from '../chog/faces';
import type { QualitySettings } from '../engine/quality';
import type { Sound } from '../audio/sound';
import type { RimCrowd } from '../arena/rim-crowd';
import { failWith, hideBanner, takePresses, ui } from '../ui/store';
import { makeBlobShadow } from './blob-shadow';
import type { StageCtx } from './context';
import { dressFighter } from './looks';
import type { Dressed } from './looks';
import { clearPopups } from './popups';
import { createHudSync } from './hud-sync';
import type { HudSync } from './hud-sync';
import { homeSpots, keepApart } from './crowd';
import { animateYouMarker, disposeYouMarker, makeYouMarker } from './you-marker';
import { stageRoll, stageStrike, stageSwing } from './stage-strike';
import { stageMeddle, stageMishap, stageZone } from './stage-arena';
import { stageDrop, stageElimination, stageRevive, stageWinner } from './stage-life';

export interface DirectorBase {
  scene: Scene;
  camera: PerspectiveCamera;
  stage: HTMLElement;
  tw: Tweens;
  fx: Fx;
  cam: CameraRig;
  world: World;
  models: Models;
  faces: Faces;
  sound: Sound;
  crowd: RimCrowd;
}

export interface Director {
  play(match: LiveMatch): void;
  /**
   * Per frame, after the tweens have advanced. `realDt` drives the match clock (never slowed);
   * `dt` is the visual step, which hitstop may slow down.
   */
  update(realDt: number, dt: number): void;
  /** Chogs on stage this match, for per-frame animation. */
  chogs(): readonly Chog[];
  /** The player's Chog, if a person is playing this match. */
  playerChog(): Chog | null;
  /** Switches fighters between real shadows and blob shadows. */
  setQuality(settings: QualitySettings): void;
}

/** Smaller than the old 1v1 Chogs so twelve fit on the floor. */
const FIGHTER_SCALE = 1.3;
/** Seconds a set piece keeps the camera before it goes back to following the action. */
const SET_PIECE_HOLD = 2.2;

function stageEvent(ctx: StageCtx, e: MatchEvent): Promise<void> {
  switch (e.type) {
    case 'drop':
      return stageDrop(ctx, e);
    case 'swing':
      return stageSwing(ctx, e);
    case 'strike':
      return stageStrike(ctx, e);
    case 'roll':
      return stageRoll(ctx, e);
    case 'mishap':
      return stageMishap(ctx, e);
    case 'meddle':
      return stageMeddle(ctx, e);
    case 'zone':
      return stageZone(ctx, e);
    case 'elimination':
      return stageElimination(ctx, e);
    case 'revive':
      return stageRevive(ctx, e);
    case 'winner':
      return stageWinner(ctx, e);
    case 'fight':
    case 'brawl':
      // turn-based events only appear in pre-recorded timelines, which the game no longer plays
      return Promise.resolve();
  }
}

/** Real shadows on high quality; a blob under the feet on low. */
function applyShadows(c: Chog, settings: QualitySettings): void {
  c.mesh.castShadow = settings.fighterShadows;
  c.hat?.traverse((o) => (o.castShadow = settings.fighterShadows));
  const blob = c.g.getObjectByName('blob');
  if (blob) blob.visible = !settings.fighterShadows;
}

function buildFighter(base: DirectorBase, spec: FighterSpec, settings: QualitySettings): Dressed {
  const dressed = dressFighter(spec, base.models, FIGHTER_SCALE);
  const { chog } = dressed;
  const blob = makeBlobShadow();
  blob.name = 'blob';
  chog.g.add(blob);
  applyShadows(chog, settings);
  chog.g.visible = false;
  base.scene.add(chog.g);
  return dressed;
}

function resetArena(base: DirectorBase): void {
  const { world } = base;
  world.rope.scale.setScalar(1);
  world.paw.g.visible = false;
  world.giant.face('hearts');
  world.giant.u.faceSquash.value = 1;
  setGum(world.giant, 0.3);
  clearPopups(base.stage);
  hideBanner();
}

interface Running {
  ctx: StageCtx;
  match: LiveMatch;
  hud: HudSync;
  out: Set<string>;
  round: number;
  /** Whoever the player last traded blows with. */
  lastRival: string | null;
}

export function createDirector(base: DirectorBase, initialQuality: QualitySettings): Director {
  const matchClock = createMatchClock();
  let quality = initialQuality;
  let matchId = 0;
  let cast = new Map<string, Chog>();
  let wardrobe: Dressed[] = [];
  let running: Running | null = null;
  let marker: ReturnType<typeof makeYouMarker> | null = null;

  const disposeCast = () => {
    for (const c of cast.values()) {
      base.scene.remove(c.g);
      singleMaterial(c.mesh).dispose();
    }
    wardrobe.forEach((d) => d.dispose());
    wardrobe = [];
    cast = new Map();
    if (marker) disposeYouMarker(marker);
    marker = null;
  };

  const play = (match: LiveMatch) => {
    base.tw.cancelAll();
    matchClock.reset();
    const id = ++matchId;
    disposeCast();
    resetArena(base);
    wardrobe = match.roster.map((spec) => buildFighter(base, spec, quality));
    cast = new Map(match.roster.map((spec, i) => [spec.id, wardrobe[i]!.chog]));
    const me = match.player();
    if (me) {
      marker = makeYouMarker();
      cast.get(me.id)?.g.add(marker);
    }
    const homes = homeSpots(match.seats(), new Set(), 0);
    const dropSpots = Object.fromEntries([...homes].map(([fid, h]) => [fid, { ...h, onHat: false }]));
    const ctx: StageCtx = {
      ...base,
      roster: match.roster,
      cast,
      busy: new Set(),
      slots: () => dropSpots,
      clock: () => matchClock.now(),
      waitUntil: (ms) => (id === matchId ? matchClock.waitUntil(ms) : Promise.reject(CANCELLED)),
    };
    running = { ctx, match, hud: createHudSync(match), out: new Set(), round: 0, lastRival: null };
    running.hud.add(match.events());
    takePresses();
    base.sound.music(true);
    ui.setState({ phase: 'playing', feed: [], knockOuts: [], banner: null });
    match.events().forEach((e) => dispatch(running!, e));
  };

  /** Sounds and crowd reactions for each event, at the moment it happens. */
  const react = (e: MatchEvent) => {
    const { sound, crowd, tw } = base;
    if (e.type === 'strike') {
      for (const h of e.hits) {
        if (h.blocked) sound.block();
        else if (h.dodged) sound.whoosh();
        else if (h.move === 'laser') sound.zap();
        else if (h.move === 'bubble' || h.move === 'puke') sound.splat();
        else sound.hit(h.dmg >= 9 || h.crit);
      }
    } else if (e.type === 'swing' && (e.move === 'dive' || e.move === 'kick')) sound.whoosh();
    else if (e.type === 'elimination') {
      sound.knockOut();
      crowd.cheer(tw.now());
    } else if (e.type === 'zone') sound.round();
    else if (e.type === 'meddle') sound.rumble();
    else if (e.type === 'winner') {
      sound.music(false);
      sound.fanfare();
      crowd.cheer(tw.now());
    }
  };

  const dispatch = (r: Running, e: MatchEvent) => {
    react(e);
    if (e.type === 'zone') r.round = e.round;
    if (e.type === 'elimination') r.out.add(e.id);
    const me = r.match.player()?.id;
    if (me && e.type === 'swing' && (e.attacker === me || e.target === me)) r.lastRival = e.attacker === me ? e.target : e.attacker;
    stageEvent(r.ctx, e).catch((err: unknown) => {
      if (err === CANCELLED) return;
      failWith(`The match broke while playing a ${e.type}: ${err instanceof Error ? err.message : String(err)}`);
    });
  };

  /** Between set pieces the camera follows the player and their rival (or the whole field). */
  const followAction = (r: Running) => {
    if (base.cam.sinceDirected(base.tw.now()) < SET_PIECE_HOLD) return;
    const standing = [...cast].filter(([id, c]) => c.g.visible && !r.out.has(id)).map(([, c]) => c);
    const me = r.match.player();
    const mine = me && !r.out.has(me.id) ? cast.get(me.id) : undefined;
    if (!mine) {
      base.cam.follow(standing);
      return;
    }
    const rival = r.lastRival && !r.out.has(r.lastRival) ? cast.get(r.lastRival) : undefined;
    base.cam.follow(rival ? [mine, rival] : [mine]);
  };

  /** Steps the match in whole ticks until it catches up with the clock. */
  const advanceMatch = (r: Running) => {
    while (!r.match.done() && r.match.now() + TICK_MS <= matchClock.now()) {
      const fresh = r.match.step(TICK_MS, takePresses());
      r.hud.add(fresh);
      fresh.forEach((e) => dispatch(r, e));
    }
  };

  return {
    play,
    update(realDt, dt) {
      const r = running;
      if (!r) return;
      matchClock.advance(realDt);
      advanceMatch(r);
      keepApart(r.ctx, r.out, r.round, dt, r.match.seats());
      if (marker) animateYouMarker(marker, base.tw.now());
      followAction(r);
      r.hud.sync(matchClock.now());
      if (r.match.done() && ui.getState().phase === 'playing') ui.setState({ phase: 'results' });
    },
    chogs: () => [...cast.values()],
    playerChog: () => {
      const id = running?.match.player()?.id;
      return id ? (cast.get(id) ?? null) : null;
    },
    setQuality(settings) {
      quality = settings;
      cast.forEach((c) => applyShadows(c, settings));
    },
  };
}
