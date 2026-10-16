import type { Rng } from '../rng';
import { DUEL_RULES as R } from './rules';
import type { DuelInput, DuelState } from './types';

/** Decisions use only observations at least 200ms old, never the player's current input. */
export function createDuelAi(rng: Rng): { input(s: DuelState): DuelInput; reset(): void } {
  let history: DuelState[] = [];
  let held: DuelInput = {};
  let nextDecision = 0;
  return {
    reset() { history = []; held = {}; nextDecision = 0; },
    input(state) {
      history.push(state);
      if (history.length <= R.aiReactionFrames) return {};
      const seen = history.shift()!;
      if (state.frame < nextDecision) return held;
      nextDecision = state.frame + rng.range(10, 19);
      const [them, me] = seen.fighters;
      const toward = them.x > me.x ? { right: true } : { left: true };
      const away = them.x > me.x ? { left: true } : { right: true };
      const distance = Math.abs(them.x - me.x);
      let action: DuelInput;
      if (them.attack && distance < 3 && rng.chance(650)) {
        action = { block: true, crouch: them.attack.move === 'sweep' || (them.y === 0 && rng.chance(250)) };
      } else if (distance > 1.8) {
        action = { ...toward, jump: rng.chance(100), special: distance < 5 && me.meter >= R.specialCost && rng.chance(350) };
      } else if (rng.chance(180)) {
        action = { ...away, block: true };
      } else {
        action = { light: rng.chance(600), heavy: true, crouch: rng.chance(230), jump: rng.chance(80), special: me.meter >= R.specialCost && rng.chance(450) };
      }
      held = { left: action.left ?? false, right: action.right ?? false, block: action.block ?? false, crouch: action.crouch ?? false };
      return action;
    },
  };
}
