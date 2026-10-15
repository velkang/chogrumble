import { describe, expect, it } from 'vitest';
import { CANCELLED } from './tween';
import { createMatchClock } from './match-clock';

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('createMatchClock', () => {
  it('counts real elapsed time in ms', () => {
    const c = createMatchClock();
    c.advance(0.5);
    c.advance(0.25);
    expect(c.now()).toBeCloseTo(750);
  });

  it('ignores negative or missing time', () => {
    const c = createMatchClock();
    c.advance(-1);
    c.advance(Number.NaN);
    expect(c.now()).toBe(0);
  });

  it('resolves waitUntil once the clock reaches the time, not before', async () => {
    const c = createMatchClock();
    let done = false;
    void c.waitUntil(1000).then(() => (done = true));
    c.advance(0.9);
    await settle();
    expect(done).toBe(false);
    c.advance(0.1);
    await settle();
    expect(done).toBe(true);
  });

  it('resolves immediately for times already past', async () => {
    const c = createMatchClock();
    c.advance(2);
    await expect(c.waitUntil(500)).resolves.toBeUndefined();
  });

  it('resolves waiters in time order within one advance', async () => {
    const c = createMatchClock();
    const order: number[] = [];
    void c.waitUntil(300).then(() => order.push(300));
    void c.waitUntil(100).then(() => order.push(100));
    void c.waitUntil(200).then(() => order.push(200));
    c.advance(1);
    await settle();
    expect(order).toEqual([100, 200, 300]);
  });

  it('reset rejects pending waits with CANCELLED and restarts at zero', async () => {
    const c = createMatchClock();
    c.advance(1);
    const pending = c.waitUntil(5000);
    c.reset();
    await expect(pending).rejects.toBe(CANCELLED);
    expect(c.now()).toBe(0);
  });
});
