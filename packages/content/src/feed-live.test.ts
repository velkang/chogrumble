import { describe, expect, it } from 'vitest';
import { createLiveMatch, TICK_MS } from '@chog/sim';
import { pickHouseChogs } from './roster';
import { createFeedFormatter } from './feed-format';

describe('createFeedFormatter', () => {
  it('turns a live match into filled-in feed lines as events arrive', () => {
    const m = createLiveMatch({ roster: pickHouseChogs('feed-live', 10, new Set()), seed: 'feed-live', playerId: null });
    const feed = createFeedFormatter(m.seed, m.roster);
    const lines = [];
    let index = 0;
    while (!m.done()) for (const e of m.step(TICK_MS * 4)) lines.push(...feed.add(e, index++));
    expect(lines.length).toBeGreaterThan(50);
    for (const l of lines) expect(l.text).not.toMatch(/[{}]/);
    expect(lines.some((l) => l.kind === 'win')).toBe(true);
    expect(lines.some((l) => /blocks|tanks|shrugs|guard/.test(l.text))).toBe(true);
  });
});
