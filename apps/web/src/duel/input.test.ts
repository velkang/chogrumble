import { describe, expect, it } from 'vitest';
import { createDuelInput } from './input';
describe('duel input ownership', () => {
  it('combines simultaneous pointers and consumes attacks once', () => {
    const input = createDuelInput();
    input.down('finger1', 'right'); input.down('finger2', 'light');
    expect(input.take()).toEqual({ right: true, light: true });
    expect(input.take()).toEqual({ right: true });
    input.up('finger2'); expect(input.take()).toEqual({ right: true });
    input.up('finger1'); expect(input.take()).toEqual({});
  });
  it('keeps another key holding the same action and clears all inputs on pause', () => {
    const input = createDuelInput(); input.down('a', 'left'); input.down('arrow', 'left');
    input.up('a'); expect(input.take()).toEqual({ left: true });
    input.down('j', 'heavy'); input.clear(); expect(input.take()).toEqual({});
  });
  it('accepts one-tick directional and block actions from assistive activation', () => {
    const input = createDuelInput(); input.tap('left'); input.tap('block');
    expect(input.take()).toEqual({ left: true, block: true });
    expect(input.take()).toEqual({});
  });
  it('ignores repeated keydown for held attack buttons', () => {
    const input = createDuelInput(); input.down('j', 'light'); input.take(); input.down('j', 'light');
    expect(input.take()).toEqual({}); input.up('j'); input.down('j', 'light');
    expect(input.take()).toEqual({ light: true });
  });
});
