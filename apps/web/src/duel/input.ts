import type { DuelInput } from '@chog/sim';
export type DuelControl = keyof DuelInput;
const impulses = new Set<DuelControl>(['jump', 'light', 'heavy', 'special']);

/** Each keyboard key/touch owns its input; releasing one never releases another finger. */
export function createDuelInput() {
  const held = new Map<string, DuelControl>();
  let pressed: DuelInput = {};
  return {
    down(source: string, control: DuelControl) {
      if (held.has(source)) return;
      held.set(source, control);
      if (impulses.has(control)) pressed[control] = true;
    },
    tap(control: DuelControl) { pressed[control] = true; },
    up(source: string) { held.delete(source); },
    clear() { held.clear(); pressed = {}; },
    take(): DuelInput {
      const input: DuelInput = { ...pressed };
      for (const control of held.values()) if (!impulses.has(control)) input[control] = true;
      pressed = {};
      return input;
    },
  };
}
export const duelInput = createDuelInput();

const KEYS: Readonly<Record<string, DuelControl>> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump', KeyS: 'crouch', ArrowDown: 'crouch',
  KeyJ: 'light', KeyK: 'heavy', KeyL: 'special', Space: 'block',
};
export function bindDuelKeyboard(active: () => boolean, pause: () => void): () => void {
  const down = (e: KeyboardEvent) => {
    const el = e.target;
    if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) return;
    if (e.code === 'Escape' && !e.repeat) { pause(); return; }
    const control = KEYS[e.code];
    if (!control || e.metaKey || e.ctrlKey || e.altKey || !active()) return;
    e.preventDefault();
    if (!e.repeat) duelInput.down(e.code, control);
  };
  const up = (e: KeyboardEvent) => duelInput.up(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); duelInput.clear(); };
}
