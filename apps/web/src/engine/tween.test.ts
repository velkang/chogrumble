import { describe, expect, it, vi } from 'vitest';
import { CANCELLED, createTweens, ease } from './tween';

describe('ease', () => {
  it('starts at 0 and ends at 1 for every curve', () => {
    for (const fn of Object.values(ease)) {
      expect(fn(0)).toBeCloseTo(0);
      expect(fn(1)).toBeCloseTo(1);
    }
  });

  it('inOut is symmetric around the midpoint', () => {
    expect(ease.inOut(0.5)).toBeCloseTo(0.5);
    expect(ease.inOut(0.25) + ease.inOut(0.75)).toBeCloseTo(1);
  });
});

describe('createTweens', () => {
  it('drives the callback with eased value and raw progress, then resolves', async () => {
    const tw = createTweens();
    const fn = vi.fn();
    const done = tw.tween(1, fn, ease.lin);
    tw.advance(0.5);
    expect(fn).toHaveBeenLastCalledWith(0.5, 0.5);
    tw.advance(0.6);
    expect(fn).toHaveBeenLastCalledWith(1, 1);
    await expect(done).resolves.toBeUndefined();
  });

  it('uses inOut easing by default', () => {
    const tw = createTweens();
    const fn = vi.fn();
    void tw.tween(1, fn);
    tw.advance(0.25);
    expect(fn).toHaveBeenLastCalledWith(ease.inOut(0.25), 0.25);
  });

  it('wait resolves only after its duration', async () => {
    const tw = createTweens();
    let done = false;
    void tw.wait(1).then(() => (done = true));
    tw.advance(0.9);
    await Promise.resolve();
    expect(done).toBe(false);
    tw.advance(0.2);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('tracks sim time', () => {
    const tw = createTweens();
    tw.advance(0.25);
    tw.advance(0.5);
    expect(tw.now()).toBeCloseTo(0.75);
  });

  it('cancelAll rejects running tweens with CANCELLED and bumps the run token', async () => {
    const tw = createTweens();
    const before = tw.token();
    const running = tw.tween(1, () => {});
    tw.cancelAll();
    expect(tw.token()).toBe(before + 1);
    tw.advance(0.1);
    await expect(running).rejects.toBe(CANCELLED);
  });

  it('tweens started after a cancel still run', async () => {
    const tw = createTweens();
    tw.cancelAll();
    const fresh = tw.tween(0.5, () => {});
    tw.advance(0.6);
    await expect(fresh).resolves.toBeUndefined();
  });
});
