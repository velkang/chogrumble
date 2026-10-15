import { describe, expect, it } from 'vitest';
import { createLiveMatch, TICK_MS } from './live-match';
import type { LiveInput } from './live-match';
import type { FighterSpec, MatchEvent } from '../types';

const TRAITS = [{ Eyes: 'fire laser' }, { Mouth: 'Bubblegum' }, {}, { Head: 'Crown' }, { Body: 'Golden Armor' }, { Mouth: 'Rainbow Puke' }];
const roster = (n: number): FighterSpec[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `Chog ${i}`, traits: TRAITS[i % TRAITS.length]! }));

/** Runs a match to the end; `inputAt` can press buttons at given times. */
function run(n: number, seed: string, opts: { player?: string; inputAt?: (t: number) => LiveInput | undefined } = {}) {
  const m = createLiveMatch({ roster: roster(n), seed, playerId: opts.player ?? null });
  let guard = 0;
  while (!m.done() && guard++ < 10_000) m.step(TICK_MS, opts.inputAt?.(m.now()));
  return m;
}

const ofType = <K extends MatchEvent['type']>(events: readonly MatchEvent[], type: K) =>
  events.filter((e): e is Extract<MatchEvent, { type: K }> => e.type === type);

describe('createLiveMatch', () => {
  it('is deterministic for the same seed and the same inputs', () => {
    const press = (t: number): LiveInput | undefined => (t % 7000 < TICK_MS ? { special: true } : undefined);
    const a = run(12, 'same', { player: 'c0', inputAt: press }).events();
    const b = run(12, 'same', { player: 'c0', inputAt: press }).events();
    expect(a).toEqual(b);
  });

  it('starts with the drop and ends with exactly one winner', () => {
    const m = run(12, 'ends');
    const events = m.events();
    expect(events[0]!.type).toBe('drop');
    expect(ofType(events, 'winner')).toHaveLength(1);
    expect(events.at(-1)!.type).toBe('winner');
    expect(m.winner()).toBe(ofType(events, 'winner')[0]!.id);
  });

  it('rejects bad rosters and an unknown player', () => {
    expect(() => createLiveMatch({ roster: roster(1), seed: 's', playerId: null })).toThrow(/2 to 12/);
    expect(() => createLiveMatch({ roster: roster(4), seed: 's', playerId: 'nobody' })).toThrow(/player/i);
  });
});

describe('createLiveMatch: properties over many seeds', () => {
  const matches = Array.from({ length: 120 }, (_, i) => run(8 + (i % 5), `prop-${i}`));

  it('lasts about three minutes', () => {
    for (const m of matches) {
      const last = m.events().at(-1)!;
      expect(last.at + last.dur).toBeGreaterThanOrEqual(165_000);
      expect(last.at + last.dur).toBeLessThanOrEqual(195_000);
    }
  });

  it('eliminates everyone but the winner, each exactly once, with unique placements', () => {
    for (const m of matches) {
      const elims = ofType(m.events(), 'elimination');
      expect(elims).toHaveLength(m.roster.length - 1);
      expect(new Set(elims.map((e) => e.id)).size).toBe(elims.length);
      expect(new Set(m.placements()).size).toBe(m.roster.length);
      expect(m.placements()[0]).toBe(m.winner());
    }
  });

  it('keeps events in time order and plucks one at a time', () => {
    for (const m of matches) {
      const ev = m.events();
      ev.forEach((e, i) => i > 0 && expect(e.at).toBeGreaterThanOrEqual(ev[i - 1]!.at));
      const elims = ofType(ev, 'elimination');
      elims.forEach((e, i) => i > 0 && expect(e.at).toBeGreaterThanOrEqual(elims[i - 1]!.at + elims[i - 1]!.dur));
    }
  });

  it('never lets a knocked-out Chog swing or be hit again', () => {
    for (const m of matches) {
      const down = new Set<string>();
      for (const e of m.events()) {
        if (e.type === 'swing') {
          expect(down.has(e.attacker)).toBe(false);
          expect(down.has(e.target)).toBe(false);
        }
        if ('hits' in e) for (const h of e.hits) if (h.hpAfter === 0) down.add(h.target);
      }
    }
  });

  it('keeps HP whole and never below zero', () => {
    for (const m of matches) for (const e of m.events()) if ('hits' in e) for (const h of e.hits) {
      expect(Number.isInteger(h.hpAfter)).toBe(true);
      expect(h.hpAfter).toBeGreaterThanOrEqual(0);
    }
  });

  it('seats every Chog once around the ring and mostly fights neighbours', () => {
    for (const m of matches.slice(0, 20)) {
      const seats = m.seats();
      expect([...seats].sort()).toEqual(m.roster.map((r) => r.id).sort());
      const at = new Map(seats.map((id, i) => [id, i]));
      const swings = ofType(m.events(), 'swing').filter((s) => s.at < 40_000);
      const near = swings.filter((s) => {
        const d = Math.abs(at.get(s.attacker)! - at.get(s.target)!);
        return Math.min(d, seats.length - d) <= 2;
      });
      expect(near.length / swings.length).toBeGreaterThan(0.6);
    }
  });

  it('has several fights going at once early on', () => {
    for (const m of matches.slice(0, 20)) {
      const swings = ofType(m.events(), 'swing').filter((s) => s.at < 60_000);
      let busiest = 0;
      for (const s of swings) busiest = Math.max(busiest, swings.filter((o) => o.at <= s.at && o.landsAt > s.at).length);
      expect(busiest).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('createLiveMatch: the player', () => {
  const after = (m: ReturnType<typeof createLiveMatch>, t: number) => {
    while (m.now() < t) m.step(TICK_MS);
  };

  it('fires the trait special when SPECIAL is pressed, then cools down', () => {
    const m = createLiveMatch({ roster: roster(8), seed: 'special', playerId: 'c0' });
    after(m, 8000);
    expect(m.player()!.specialReadyIn).toBe(0);
    const fresh = m.step(TICK_MS, { special: true });
    const mine = fresh.find((e) => e.type === 'swing' && e.attacker === 'c0');
    expect(mine && mine.type === 'swing' && mine.move).toBe('laser');
    expect(m.player()!.specialReadyIn).toBeGreaterThan(0);
    const again = m.step(TICK_MS, { special: true });
    expect(again.some((e) => e.type === 'swing' && e.attacker === 'c0' && e.move === 'laser')).toBe(false);
  });

  it('uses a dive as the special when the Chog has no trait special', () => {
    const m = createLiveMatch({ roster: roster(8), seed: 'dive', playerId: 'c2' });
    after(m, 8000);
    const fresh = m.step(TICK_MS, { special: true });
    const mine = fresh.find((e) => e.type === 'swing' && e.attacker === 'c2');
    expect(mine && mine.type === 'swing' && mine.move).toBe('dive');
  });

  it('makes incoming blows miss while DODGE is active', () => {
    const m = createLiveMatch({ roster: roster(12), seed: 'dodge', playerId: 'c3' });
    after(m, 7000);
    const landed: boolean[] = [];
    // watch until the player has been swung at mid-dodge a few times
    for (let i = 0; i < 3000 && !m.done() && landed.length < 5; i++) {
      const dodgeNow = m.player()!.dodgeReadyIn === 0;
      for (const e of m.step(TICK_MS, dodgeNow ? { dodge: true } : undefined)) {
        if (e.type !== 'strike') continue;
        for (const h of e.hits) if (h.target === 'c3' && h.attacker !== 'c3' && m.player()!.dodgingAt(e.at)) landed.push(!h.dodged);
      }
    }
    expect(landed.length).toBeGreaterThan(0);
    expect(landed.every((hitLanded) => !hitLanded)).toBe(true);
  });

  it('reports no player state in an AI-only match', () => {
    expect(createLiveMatch({ roster: roster(8), seed: 'ai', playerId: null }).player()).toBeNull();
  });
});
