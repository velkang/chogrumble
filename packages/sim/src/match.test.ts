import { describe, expect, it } from 'vitest';
import { SIM_VERSION, simulate } from './index';
import type { FighterSpec, MatchEvent, Timeline } from './index';

const TRAIT_POOL = [
  { Eyes: 'fire laser' },
  { Mouth: 'Bubblegum' },
  { Mouth: 'Rainbow Puke' },
  { Mouth: 'BTC Coin' },
  { Head: 'Crown', Tier: 'Rare' },
  { Body: 'Golden Armor' },
  { Accessory: 'Knife', Tier: 'Epic' },
  { Head: 'Spartan Helmet' },
  {},
  { Tier: 'Legendary', Base: '1:1' },
  { Eyes: 'Heart' },
  { Base: 'Skull', Form: 'Skull' },
];

const roster = (n: number): FighterSpec[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `Chog ${i}`,
    traits: TRAIT_POOL[i % TRAIT_POOL.length]!,
  }));

const end = (t: Timeline) => t.events.at(-1)!.at + t.events.at(-1)!.dur;
const ofType = <K extends MatchEvent['type']>(t: Timeline, type: K) =>
  t.events.filter((e): e is Extract<MatchEvent, { type: K }> => e.type === type);

describe('simulate', () => {
  it('is deterministic: same roster and seed give the same timeline', () => {
    expect(simulate(roster(12), 'seed-a')).toEqual(simulate(roster(12), 'seed-a'));
  });

  it('gives different matches for different seeds', () => {
    expect(simulate(roster(12), 'seed-a').events).not.toEqual(
      simulate(roster(12), 'seed-b').events,
    );
  });

  it('stamps the timeline with the sim version, seed and roster', () => {
    const t = simulate(roster(8), 's');
    expect(t.simVersion).toBe(SIM_VERSION);
    expect(t.seed).toBe('s');
    expect(t.roster.map((r) => r.id)).toEqual(roster(8).map((r) => r.id));
  });

  it('rejects rosters that are too small, too big or have duplicate ids', () => {
    expect(() => simulate(roster(1), 's')).toThrow(/2 to 12/);
    expect(() => simulate(roster(13), 's')).toThrow(/2 to 12/);
    const dup = roster(4).map((r) => ({ ...r, id: 'same' }));
    expect(() => simulate(dup, 's')).toThrow(/duplicate/i);
  });

  it('starts with the drop and ends with the winner', () => {
    const t = simulate(roster(10), 'bookends');
    expect(t.events[0]!.type).toBe('drop');
    expect(t.events.at(-1)!.type).toBe('winner');
  });

  it('does not mutate the roster passed in', () => {
    const r = roster(8);
    const copy = structuredClone(r);
    simulate(r, 'pure');
    expect(r).toEqual(copy);
  });
});

describe('simulate: properties over many seeds', () => {
  const runs = Array.from({ length: 1000 }, (_, i) => simulate(roster(8 + (i % 5)), `prop-${i}`));

  it('always has exactly one winner, who is never eliminated', () => {
    for (const t of runs) {
      const winners = ofType(t, 'winner');
      expect(winners).toHaveLength(1);
      expect(t.winner).toBe(winners[0]!.id);
      expect(t.placements[0]).toBe(t.winner);
    }
  });

  it('lasts about three minutes (170–190 s)', () => {
    for (const t of runs) {
      expect(end(t)).toBeGreaterThanOrEqual(170_000);
      expect(end(t)).toBeLessThanOrEqual(190_000);
      expect(t.duration).toBe(end(t));
    }
  });

  it('eliminates N − 1 fighters plus one per revive', () => {
    for (const t of runs) {
      expect(ofType(t, 'elimination')).toHaveLength(
        t.roster.length - 1 + ofType(t, 'revive').length,
      );
    }
  });

  it('revives at most once, only while more than 3 are standing', () => {
    for (const t of runs) {
      const revives = ofType(t, 'revive');
      expect(revives.length).toBeLessThanOrEqual(1);
      for (const r of revives) expect(r.aliveBefore).toBeGreaterThan(3);
    }
  });

  it('plays events back to back with whole-millisecond timing', () => {
    for (const t of runs) {
      t.events.forEach((e, i) => {
        expect(Number.isInteger(e.at) && Number.isInteger(e.dur)).toBe(true);
        expect(e.dur).toBeGreaterThan(0);
        if (i > 0) expect(e.at).toBe(t.events[i - 1]!.at + t.events[i - 1]!.dur);
      });
    }
  });

  it('keeps HP whole and never below zero, and only the eliminated reach zero', () => {
    for (const t of runs) {
      const out = new Set<string>();
      for (const e of t.events) {
        if (e.type === 'elimination') out.add(e.id);
        if (e.type === 'revive') out.delete(e.id);
        if ('hits' in e) {
          for (const h of e.hits) {
            expect(Number.isInteger(h.dmg) && Number.isInteger(h.hpAfter)).toBe(true);
            expect(h.hpAfter).toBeGreaterThanOrEqual(0);
          }
        }
      }
      expect(out.size).toBe(t.roster.length - 1);
    }
  });

  it('gives every fighter a unique placement, winner first', () => {
    for (const t of runs) {
      expect(new Set(t.placements).size).toBe(t.roster.length);
      expect([...t.placements].sort()).toEqual(t.roster.map((r) => r.id).sort());
    }
  });

  it('never involves an eliminated fighter in a later event', () => {
    for (const t of runs) {
      const out = new Set<string>();
      for (const e of t.events) {
        if (e.type === 'revive') out.delete(e.id);
        const involved =
          'hits' in e
            ? e.hits.flatMap((h) => ('attacker' in h ? [h.attacker, h.target] : [h.target]))
            : [];
        for (const id of involved) expect(out.has(id)).toBe(false);
        if (e.type === 'elimination') out.add(e.id);
      }
    }
  });
});

describe('simulate: speed', () => {
  it('runs a 12-Chog match in under 5 ms on average', () => {
    const r = roster(12);
    simulate(r, 'warmup');
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) simulate(r, `speed-${i}`);
    expect((performance.now() - t0) / 200).toBeLessThan(5);
  });
});
