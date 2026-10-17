import { describe, expect, it } from 'vitest';
import { createJoystick } from './joystick';
import { createDuelInput } from './input';

describe('analog joystick', () => {
  it('uses a radial dead zone, proportional speed and clamped travel', () => {
    const stick = createJoystick();
    expect(stick.move(0.17, 0).moveX).toBe(0);
    expect(stick.move(0.59, 0).moveX).toBeCloseTo(0.5);
    expect(stick.move(-4, 0).moveX).toBe(-1);
    const diagonal = stick.move(2, -2);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.moveX).toBeCloseTo(Math.SQRT1_2); expect(diagonal.jump).toBe(true);
  });
  it('fires jump once until returned below the rearm threshold', () => {
    const stick = createJoystick();
    expect(stick.move(0, -0.6).jump).toBe(true);
    expect(stick.move(0, -1).jump).toBe(false);
    stick.move(0, -0.4); expect(stick.move(0, -0.6).jump).toBe(false);
    stick.move(0, -0.3); expect(stick.move(0, -0.6).jump).toBe(true);
    stick.reset(); expect(stick.move(0, -0.6).jump).toBe(true);
  });
  it('holds diagonal crouch with hysteresis without jitter', () => {
    const stick = createJoystick();
    expect(stick.move(0.4, 0.6).crouch).toBe(true);
    expect(stick.move(0.4, 0.4).crouch).toBe(true);
    expect(stick.move(0.4, 0.3).crouch).toBe(false);
    expect(stick.move(0, 0.4).crouch).toBe(false);
  });
  it('combines a stick and action pointer, prioritizes keys, and clears safely', () => {
    const input = createDuelInput(); input.analog(0.5, false, true); input.down('finger2', 'light');
    expect(input.take()).toEqual({ moveX: 0.5, jump: true, light: true });
    expect(input.take()).toEqual({ moveX: 0.5 });
    input.down('KeyA', 'left'); expect(input.take()).toEqual({ left: true });
    input.releaseAnalog(); expect(input.take()).toEqual({ left: true });
    input.up('KeyA'); input.analog(0, false, true); input.releaseAnalog(); expect(input.take()).toEqual({});
    input.analog(-1, true, false); input.clear(); expect(input.take()).toEqual({});
  });
});
