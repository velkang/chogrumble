import { describe, expect, it } from 'vitest';
import { SETTINGS, createFrameMonitor, detectQuality } from './quality';

const desktop = { touchPoints: 0, memoryGb: 16, cores: 10, shortSide: 1080 };
const phone = { touchPoints: 5, memoryGb: 6, cores: 8, shortSide: 390 };

describe('detectQuality', () => {
  it('picks high on a capable desktop', () => {
    expect(detectQuality(desktop)).toBe('high');
  });

  it('picks low on phones', () => {
    expect(detectQuality(phone)).toBe('low');
  });

  it('picks low on weak machines even without touch', () => {
    expect(detectQuality({ ...desktop, memoryGb: 4 })).toBe('low');
    expect(detectQuality({ ...desktop, cores: 4 })).toBe('low');
  });

  it('treats unknown memory and cores as fine', () => {
    expect(detectQuality({ touchPoints: 0, shortSide: 1080 })).toBe('high');
  });

  it('lets an explicit choice win', () => {
    expect(detectQuality(phone, 'high')).toBe('high');
    expect(detectQuality(desktop, 'low')).toBe('low');
    expect(detectQuality(desktop, 'bogus')).toBe('high');
  });
});

describe('SETTINGS', () => {
  it('makes low cheaper than high on every knob', () => {
    expect(SETTINGS.low.maxPixelRatio).toBeLessThan(SETTINGS.high.maxPixelRatio);
    expect(SETTINGS.low.shadowMapSize).toBeLessThan(SETTINGS.high.shadowMapSize);
    expect(SETTINGS.low.fighterShadows).toBe(false);
    expect(SETTINGS.high.fighterShadows).toBe(true);
  });
});

describe('createFrameMonitor', () => {
  it('flags sustained slow frames', () => {
    const m = createFrameMonitor({ budgetMs: 24, windowSeconds: 2 });
    let slow = false;
    for (let i = 0; i < 70; i++) slow = m.push(0.033) || slow;
    expect(slow).toBe(true);
  });

  it('ignores a few hitches among fast frames', () => {
    const m = createFrameMonitor({ budgetMs: 24, windowSeconds: 2 });
    let slow = false;
    for (let i = 0; i < 240; i++) slow = m.push(i % 20 === 0 ? 0.1 : 0.016) || slow;
    expect(slow).toBe(false);
  });

  it('needs a full window before judging', () => {
    const m = createFrameMonitor({ budgetMs: 24, windowSeconds: 2 });
    expect(m.push(0.2)).toBe(false);
  });
});
