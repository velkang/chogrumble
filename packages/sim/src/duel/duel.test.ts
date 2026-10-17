import { describe, expect, it } from 'vitest';
import { createDuel } from './duel';
import { DUEL_RULES as R } from './rules';
import type { Duel, DuelEvent, DuelInput } from './types';
import type { FighterSpec } from '../types';

const roster: [FighterSpec, FighterSpec] = [
  { id: 'a', name: 'A', traits: { Eyes: 'fire laser', Head: 'Crown' } },
  { id: 'b', name: 'B', traits: {} },
];
function step(m: Duel, n: number, a: DuelInput = {}, b: DuelInput = {}) {
  const events: DuelEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...m.step(a, b).events);
  return events;
}
function ready(traits = roster[0].traits) {
  const m = createDuel({ roster: [{ ...roster[0], traits }, roster[1]], seed: 'test' });
  step(m, R.introFrames);
  return m;
}
function close(m: Duel) { step(m, 30, { right: true }, { left: true }); }
function attack(m: Duel, input: DuelInput, guard: DuelInput = {}) {
  const events = [...m.step(input, guard).events, ...step(m, 65, {}, guard)];
  return events.filter((e) => e.type === 'hit');
}
function charge(m: Duel) { close(m); for (let i = 0; i < 5; i++) { close(m); attack(m, { light: true }); } }

describe('duel movement and state', () => {
  it('applies proportional analog movement on the ground and in the air, with digital precedence', () => {
    const full = ready(); const half = ready();
    step(full, 10, { moveX: -1 }); step(half, 10, { moveX: -0.5 });
    expect(half.state().fighters[0].x + 2.6).toBeCloseTo((full.state().fighters[0].x + 2.6) / 2);
    const initial = half.state().fighters[0].x;
    half.step({ jump: true, moveX: 0.5 }, {});
    expect(half.state().fighters[0].x - initial).toBeCloseTo(R.walkSpeed * 0.5);
    const airborne = half.state().fighters[0].x;
    half.step({ light: true, moveX: 0.5 }, {});
    half.step({ moveX: 0.5 }, {});
    expect(half.state().fighters[0].x - airborne).toBeCloseTo(R.walkSpeed * 0.5);
    const keyed = ready(); step(keyed, 10, { left: true, moveX: 1 });
    expect(keyed.state().fighters[0].x).toBeCloseTo(full.state().fighters[0].x);
    const bounded = ready(); step(bounded, 10, { moveX: -9 });
    expect(bounded.state().fighters[0].x).toBeCloseTo(full.state().fighters[0].x);
    const invalid = ready(); step(invalid, 10, { moveX: Number.NaN });
    expect(invalid.state().fighters[0].x).toBe(-2.6);
  });
  it('validates two distinct fighters, equalizes stats, and isolates snapshots', () => {
    expect(() => createDuel({ roster: [roster[0], roster[0]], seed: '' })).toThrow(/distinct/);
    const m = ready(); const old = m.state();
    expect(old.fighters.map((f) => f.hp)).toEqual([100, 100]);
    step(m, 30, { right: true });
    expect(old.fighters[0].x).toBe(-2.6);
    const snapshot = m.state(); snapshot.fighters[0].hp = -10; snapshot.wins[0] = 9;
    expect(m.state().fighters[0].hp).toBe(100); expect(m.state().wins[0]).toBe(0);
  });
  it('enforces corners and grounded pushboxes', () => {
    const m = ready(); step(m, 200, { left: true }, { right: true });
    expect(m.state().fighters.map((f) => f.x)).toEqual([-6, 6]);
    step(m, 200, { right: true }, { left: true });
    const [a, b] = m.state().fighters;
    expect(b.x - a.x).toBeCloseTo(R.bodyWidth);
  });
  it('jumps over opponents, lands, and turns to face them', () => {
    const m = ready(); close(m);
    m.step({ jump: true, right: true }, {});
    step(m, 32, { right: true });
    expect(m.state().fighters[0].x).toBeGreaterThan(m.state().fighters[1].x);
    const before = m.state().fighters[0].y;
    m.step({ jump: true }, {});
    expect(m.state().fighters[0].y).toBeLessThan(before);
    step(m, 30);
    expect(m.state().fighters[0].y).toBe(0);
    expect(m.state().fighters[0].facing).toBe(-1);
  });
  it('pauses without advancing and resumes without buffered attacks', () => {
    const m = ready(); close(m); m.pause();
    const paused = m.state(); step(m, 100, { heavy: true });
    expect(m.state()).toEqual(paused);
    m.resume(); m.step({}, {});
    expect(m.state().fighters[0].attack).toBeNull();
  });
});

describe('duel combat', () => {
  it('whiffs out of range, respects startup/recovery, and hits once per move', () => {
    const m = ready(); expect(attack(m, { light: true })).toHaveLength(0);
    close(m); m.step({ light: true }, {}); step(m, 4);
    expect(m.state().fighters[1].hp).toBe(100);
    const hits = step(m, 16).filter((e) => e.type === 'hit');
    expect(hits).toHaveLength(1); expect(m.state().fighters[1].hp).toBe(94);
    expect(m.state().fighters.map((f) => f.meter)).toEqual([10, 5]);
  });
  it('locks facing during attacks and cannot cancel a heavy with another attack', () => {
    const m = ready(); close(m); m.step({ heavy: true }, {});
    m.step({ light: true }, { jump: true, left: true });
    step(m, 18, {}, { left: true });
    expect(m.state().fighters[0].attack?.move).toBe('heavy');
    expect(m.state().fighters[0].facing).toBe(1);
  });
  it('standing/crouching guard stop normal attacks, without damage or meter', () => {
    for (const crouch of [false, true]) {
      const m = ready(); close(m);
      const hits = attack(m, { light: true }, { block: true, crouch });
      expect(hits[0]?.blocked).toBe(true);
      expect(m.state().fighters.map((f) => [f.hp, f.meter])).toEqual([[100, 0], [100, 0]]);
    }
  });
  it('sweeps beat standing block and lose to crouch block', () => {
    for (const crouch of [false, true]) {
      const m = ready(); close(m);
      const hits = attack(m, { crouch: true, heavy: true }, { block: true, crouch });
      expect(hits[0]?.blocked).toBe(crouch);
      expect(m.state().fighters[1].hp).toBe(crouch ? 100 : 90);
    }
  });
  it('keeps a held guard through blockstun', () => {
    const m = ready(); close(m);
    m.step({ light: true }, { block: true }); step(m, 5, {}, { block: true });
    expect(m.state().fighters[1].blockstun).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) {
      m.step({}, { block: true });
      expect(m.state().fighters[1].blocking).toBe(true);
    }
  });
  it('buffers near the end of recovery and expires early presses', () => {
    const m = ready();
    m.step({ heavy: true }, {}); m.step({ light: true }, {});
    step(m, 41);
    expect(m.state().fighters[0].attack).toBeNull();
    m.step({ heavy: true }, {}); step(m, 38);
    m.step({ light: true }, {}); step(m, 3);
    expect(m.state().fighters[0].attack?.move).toBe('light');
  });
  it('jumping attacks beat crouch block and lose to standing block', () => {
    for (const crouch of [false, true]) {
      const m = ready(); close(m);
      m.step({ jump: true }, { block: true, crouch });
      step(m, 23, {}, { block: true, crouch });
      const hits = attack(m, { heavy: true }, { block: true, crouch });
      expect(hits.some((h) => h.move === 'airHeavy')).toBe(true);
      expect(hits[0]?.blocked).toBe(!crouch);
    }
  });
  it('allows the confirmed light → light → heavy chain only', () => {
    const m = ready(); close(m);
    m.step({ light: true }, {}); step(m, 5);
    expect(m.state().fighters[0].attack?.connected).toBe(true);
    m.step({ light: true }, {}); step(m, 5);
    expect(m.state().fighters[0].attack?.chain).toBe(2);
    m.step({ heavy: true }, {});
    expect(m.state().fighters[0].attack?.chain).toBe(3);
    const hits = step(m, 18).filter((e) => e.type === 'hit');
    expect(hits[0]?.combo).toBe(3);
    expect(m.state().fighters[1].hp).toBe(76);
    expect(m.state().fighters[0].meter).toBe(30);
  });
  it('does not permit a blocked or whiffed light to cancel', () => {
    for (const block of [false, true]) {
      const m = ready(); if (block) close(m);
      m.step({ light: true }, { block }); step(m, 5, {}, { block });
      m.step({ heavy: true }, { block });
      expect(m.state().fighters[0].attack?.move).toBe('light');
      expect(m.state().fighters[0].attack?.chain).toBe(1);
    }
  });
  it('interrupts startup with hitstun and forbids attacks during stun', () => {
    const m = ready(); close(m);
    m.step({ light: true }, { heavy: true }); step(m, 5);
    expect(m.state().fighters[1].attack).toBeNull();
    expect(m.state().fighters[1].stun).toBeGreaterThan(0);
    m.step({}, { special: true, light: true, jump: true });
    expect(m.state().fighters[1].attack).toBeNull();
    expect(m.state().fighters[1].y).toBe(0);
  });
  it('requires meter and ground for specials; spending and special hits generate no meter', () => {
    const m = ready(); close(m);
    m.step({ special: true }, {}); expect(m.state().fighters[0].attack).toBeNull();
    step(m, 10); charge(m);
    expect(m.state().fighters[0].meter).toBe(50);
    m.step({ jump: true, special: true }, {});
    expect(m.state().fighters[0].meter).toBe(50);
    step(m, 60); close(m);
    const before = m.state().fighters[1].meter;
    const hits = attack(m, { special: true });
    expect(hits.some((h) => h.move === 'laser' && h.damage === 18)).toBe(true);
    expect(m.state().fighters[0].meter).toBe(0);
    expect(m.state().fighters[1].meter).toBe(before);
  });
  it('projectiles travel independently and miss a hurtbox above their path', () => {
    const m = ready(); charge(m);
    step(m, 35, { left: true });
    const hp = m.state().fighters[1].hp;
    m.step({ special: true }, {}); step(m, 18);
    m.step({}, { jump: true }); step(m, 10);
    expect(m.state().projectiles).toHaveLength(1);
    const x = m.state().projectiles[0]!.x;
    m.step({}, {});
    expect(m.state().projectiles[0]!.x).toBeGreaterThan(x);
    step(m, 60);
    expect(m.state().projectiles).toHaveLength(0);
    expect(m.state().fighters[1].hp).toBe(hp);
  });
  it('supports every special archetype with deterministic single-contact damage', () => {
    const traits = [{ Eyes: 'fire laser' }, { Mouth: 'Bubblegum' }, { Mouth: 'Rainbow Puke' }, { Mouth: 'BTC Coin' }, {}];
    for (const t of traits) {
      const m = ready(t); charge(m);
      const hp = m.state().fighters[1].hp;
      const hits = attack(m, { special: true });
      expect(hits).toHaveLength(1);
      expect(m.state().fighters[1].hp).toBe(hp - 18);
      expect(m.state().fighters[0].meter).toBe(0);
    }
  });
  it('does not turn separate neutral attacks into a false combo', () => {
    const m = ready(); close(m);
    attack(m, { light: true }); close(m);
    expect(attack(m, { light: true })[0]?.combo).toBe(1);
  });
  it('cannot block while airborne or during attack recovery', () => {
    const m = ready(); close(m);
    m.step({ jump: true, right: true }, {});
    step(m, 19, { right: true });
    m.step({ block: true }, { heavy: true });
    expect(m.state().fighters[0].blocking).toBe(false);
    m.step({}, { block: true });
    expect(m.state().fighters[1].blocking).toBe(false);
  });

});

describe('rounds and AI', () => {
  it('replays drawn rounds and resets resources and positions', () => {
    const m = ready(); step(m, R.roundFrames);
    expect(m.state().finish).toBe('draw'); expect(m.state().wins).toEqual([0, 0]);
    step(m, R.resultFrames);
    expect(m.state().phase).toBe('intro'); expect(m.state().round).toBe(1);
    expect(m.state().fighters.map((f) => [f.hp, f.meter, f.x])).toEqual([[100, 0, -2.6], [100, 0, 2.6]]);
  });
  it('decides timeouts by health and finishes at two wins', () => {
    const m = ready();
    for (let round = 0; round < 2; round++) {
      if (round > 0) step(m, R.introFrames);
      close(m); attack(m, { light: true });
      while (m.state().phase === 'fight') m.step({}, {});
      expect(m.state().roundWinner).toBe(0); expect(m.state().finish).toBe('timeout');
      step(m, R.resultFrames);
    }
    expect(m.state().phase).toBe('matchResult'); expect(m.state().winner).toBe(0);
    const end = m.state(); step(m, 100); expect(m.state()).toEqual(end);
  });
  it('supports simultaneous knockout trades without awarding a round', () => {
    const m = ready();
    for (let i = 0; i < 8; i++) {
      close(m); m.step({ heavy: true }, { heavy: true }); step(m, 65);
    }
    expect(m.state().fighters.map((f) => f.hp)).toEqual([4, 4]);
    close(m); m.step({ light: true }, { light: true }); step(m, 6);
    expect(m.state().finish).toBe('draw'); expect(m.state().wins).toEqual([0, 0]);
  });
  it.each(Array.from({ length: 8 }, (_, seed) => seed))('AI waits for observations and is deterministic and legal for seed %i', (seed) => {
      const run = () => {
        const m = createDuel({ roster, seed: String(seed) });
        step(m, R.introFrames);
        for (let i = 0; i < R.aiReactionFrames; i++) m.step({ right: true });
        expect(m.state().fighters[1].x).toBe(2.6);
        for (let i = 0; i < 8500 && m.state().phase !== 'matchResult'; i++) {
          const result = m.step(i % 22 === 0 ? { light: true, right: true } : { right: true });
          for (const f of result.state.fighters) {
            expect(f.hp).toBeGreaterThanOrEqual(0); expect(f.hp).toBeLessThanOrEqual(100);
            expect(f.meter).toBeGreaterThanOrEqual(0); expect(f.meter).toBeLessThanOrEqual(100);
            expect(Math.abs(f.x)).toBeLessThanOrEqual(R.stageEdge);
          }
        }
        expect(m.state().phase).toBe('matchResult');
        return m.state();
      };
      expect(run()).toEqual(run());
  });
});
