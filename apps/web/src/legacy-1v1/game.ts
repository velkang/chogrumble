// Everything the 1v1 fight script needs, passed around as one context.
import type { PerspectiveCamera, Scene } from 'three';
import type { Tweens } from '../engine/tween';
import type { Fx } from '../fx/fx';
import type { Hud } from '../hud/hud';
import type { CameraRig } from '../camera/camera-rig';
import type { Fighter, World } from '../arena/world';

export interface Match {
  me: Fighter | null;
  foe: Fighter | null;
  meddleQueued: boolean;
}

export interface Game {
  scene: Scene;
  camera: PerspectiveCamera;
  tw: Tweens;
  fx: Fx;
  hud: Hud;
  cam: CameraRig;
  world: World;
  match: Match;
}

/** Both sides of the current match; throws if called before a fighter was picked. */
export function sides(game: Game): { me: Fighter; foe: Fighter } {
  const { me, foe } = game.match;
  if (!me || !foe) throw new Error('No fighters picked yet');
  return { me, foe };
}

export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]!;
export const roll = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
