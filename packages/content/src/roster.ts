// Seeded collection sampling for borrowed fighters and AI opponents.
import { createRng } from '@chog/sim';
import type { FighterSpec } from '@chog/sim';
import { CHOGS, toFighter } from './chogs';

/** Real Chogs, drawn at random (by seed) from those not already in the match. */
export function pickHouseChogs(
  seed: string,
  count: number,
  exclude: ReadonlySet<number>,
): FighterSpec[] {
  const rng = createRng(`house:${seed}`);
  const pool = CHOGS.filter((c) => !exclude.has(c.tokenId));
  if (count > pool.length)
    throw new Error(`Only ${pool.length} house Chogs available, asked for ${count}`);
  const picks: FighterSpec[] = [];
  const taken = new Set<number>();
  while (picks.length < count) {
    const c = pool[rng.int(pool.length)]!;
    if (taken.has(c.tokenId)) continue;
    taken.add(c.tokenId);
    picks.push(toFighter(c, { house: true }));
  }
  return picks;
}
