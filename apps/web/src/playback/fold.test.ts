import { describe, expect, it } from 'vitest';
import { simulate } from '@chog/sim';
import type { Timeline } from '@chog/sim';
import { hitTime } from '@chog/content';
import { buildRoster } from '@chog/content/chogs';
import { eventIndexAt, foldTo } from './fold';

const timelines: Timeline[] = Array.from({ length: 40 }, (_, i) => simulate(buildRoster([], `fold-${i}`), `fold-${i}`));
const t0 = timelines[0]!;

describe('eventIndexAt', () => {
  it('is -1 before the match and the last event after it', () => {
    expect(eventIndexAt(t0, -1)).toBe(-1);
    expect(eventIndexAt(t0, t0.duration + 5000)).toBe(t0.events.length - 1);
  });

  it('finds the event running at a given time', () => {
    t0.events.forEach((e, i) => {
      expect(eventIndexAt(t0, e.at)).toBe(i);
      expect(eventIndexAt(t0, e.at + e.dur - 1)).toBe(i);
    });
  });
});

describe('foldTo', () => {
  it('starts with everyone at full health and nobody out', () => {
    const s = foldTo(t0, 0);
    expect(s.alive).toBe(t0.roster.length);
    expect(s.round).toBe(0);
    expect(s.winner).toBeNull();
    for (const f of s.fighters) {
      expect(f.hp).toBe(f.maxHp);
      expect(f.out).toBe(false);
    }
  });

  it('ends with one survivor, the winner, and the same placements as the sim', () => {
    for (const t of timelines) {
      const s = foldTo(t, t.duration);
      expect(s.alive).toBe(1);
      expect(s.winner).toBe(t.winner);
      expect(s.done).toBe(true);
      const ranked = [...s.fighters].sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0)).map((f) => f.id);
      expect(ranked).toEqual(t.placements);
    }
  });

  it('applies each hit when it lands, matching the sim', () => {
    for (const t of timelines.slice(0, 10)) {
      t.events.forEach((e) => {
        if (!('hits' in e)) return;
        e.hits.forEach((h, i) => {
          const at = hitTime(e, i, e.hits.length);
          const after = foldTo(t, at).fighters.find((f) => f.id === h.target)!;
          expect(after.hp).toBe(h.hpAfter);
        });
      });
    }
  });

  it('never lets the alive count go up except on a revive', () => {
    for (const t of timelines) {
      let prev = t.roster.length;
      for (const e of t.events) {
        const s = foldTo(t, e.at);
        if (e.type !== 'revive') expect(s.alive).toBeLessThanOrEqual(prev);
        prev = s.alive;
      }
    }
  });

  it('credits kills to the eliminating fighter', () => {
    for (const t of timelines) {
      const s = foldTo(t, t.duration);
      const kills = t.events.filter((e) => e.type === 'elimination' && e.by).length;
      expect(s.fighters.reduce((sum, f) => sum + f.kills, 0)).toBe(kills);
    }
  });

  it('tracks the drawstring round', () => {
    const zone = t0.events.find((e) => e.type === 'zone');
    if (!zone || zone.type !== 'zone') throw new Error('fixture has no zone event');
    expect(foldTo(t0, zone.at - 1).round).toBe(zone.round - 1);
    expect(foldTo(t0, zone.at).round).toBe(zone.round);
  });

  it('does not change the timeline', () => {
    const copy = structuredClone(t0);
    foldTo(t0, t0.duration / 2);
    expect(t0).toEqual(copy);
  });
});
