import type { MatchEvent } from '@chog/sim';

/**
 * When the i-th of n hits inside an event lands, in ms from match start. The feed, the HUD and
 * the 3D director all use this, so a hit's number, its feed line and its animation line up.
 */
export function hitTime(e: Pick<MatchEvent, 'at' | 'dur'> & { type?: MatchEvent['type'] }, i: number, n: number): number {
  // a live strike is the impact itself: its blow (and any recoil) land at once
  if (e.type === 'strike') return e.at;
  return e.at + Math.floor((e.dur * (i + 1)) / (n + 1));
}
