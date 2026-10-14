// Turns a lobby's entries into a match roster: entrants first, then house Chogs to fill it out.
import { MAX_FIGHTERS, createRng } from '@chog/sim';
import type { FighterSpec } from '@chog/sim';
import { CHOGS, chogByToken, toFighter } from './chogs';

/** Matches always have at least this many Chogs; house Chogs fill the gap. */
export const MIN_ROSTER = 8;
export const MAX_ROSTER = MAX_FIGHTERS;

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

/** Entrant token ids (in entry order) plus house Chogs up to MIN_ROSTER. */
export function buildRoster(entrantTokens: readonly number[], seed: string): FighterSpec[] {
  if (entrantTokens.length > MAX_ROSTER)
    throw new Error(`A match holds at most ${MAX_ROSTER} Chogs`);
  if (new Set(entrantTokens).size !== entrantTokens.length)
    throw new Error('A Chog was entered twice');
  const entrants = entrantTokens.map((id) => {
    const c = chogByToken(id);
    if (!c) throw new Error(`Unknown Chog token ${id}`);
    return toFighter(c);
  });
  const fill = Math.max(0, MIN_ROSTER - entrants.length);
  return [...entrants, ...pickHouseChogs(seed, fill, new Set(entrantTokens))];
}
