// Everything a stager needs to put one match event on screen.
import type { PerspectiveCamera, Scene } from 'three';
import type { FighterSpec } from '@chog/sim';
import type { Tweens } from '../engine/tween';
import type { Models } from '../engine/assets';
import type { Fx } from '../fx/fx';
import type { CameraRig } from '../camera/camera-rig';
import type { World } from '../arena/world';
import type { Chog } from '../chog/chog';
import type { Slots } from '../playback/slots';

export interface StageCtx {
  scene: Scene;
  camera: PerspectiveCamera;
  /** The stage element, for damage numbers. */
  stage: HTMLElement;
  tw: Tweens;
  fx: Fx;
  cam: CameraRig;
  world: World;
  models: Models;
  roster: readonly FighterSpec[];
  /** This match's Chogs by fighter id. */
  cast: ReadonlyMap<string, Chog>;
  /** Fighters a stager is animating; the idle walker leaves them alone. */
  busy: Set<string>;
  slots(): Slots;
  /** Match time in ms. */
  clock(): number;
  /** Resolves when the match clock reaches `ms`; rejects with CANCELLED if the match was replaced. */
  waitUntil(ms: number): Promise<void>;
}

export function chogOf(ctx: StageCtx, id: string): Chog {
  const c = ctx.cast.get(id);
  if (!c) throw new Error(`No Chog on stage for ${id}`);
  return c;
}

export function nameOf(ctx: StageCtx, id: string): string {
  return ctx.roster.find((r) => r.id === id)?.name ?? id;
}
