// Comic hit-words that pop at the moment of impact, so every blow reads at a glance.
import type { MoveKey } from '@chog/sim';
import type { Vector3 } from 'three';
import { ease } from '../engine/tween';
import { HIT_WORD } from '../hud/classes';
import type { StageCtx } from './context';

type Tone = 'gold' | 'pink' | 'white' | 'blue';

const WORDS: Readonly<Record<MoveKey, readonly [string, Tone]>> = {
  jab: ['POW!', 'gold'],
  counter: ['SMACK!', 'gold'],
  kick: ['WHAM!', 'gold'],
  headbutt: ['BONK!', 'gold'],
  dive: ['SPLAT!', 'pink'],
  laser: ['ZAP!', 'pink'],
  bubble: ['SPLURT!', 'pink'],
  puke: ['BLEGH!', 'pink'],
  coin: ['CLINK!', 'gold'],
  recoil: ['OOF', 'white'],
};

export function hitWord(move: MoveKey, outcome: { dodged: boolean; blocked?: boolean; crit: boolean }): readonly [string, Tone] {
  if (outcome.blocked) return ['BLOCK!', 'blue'];
  if (outcome.dodged) return ['MISS', 'white'];
  if (outcome.crit) return ['CRIT!', 'gold'];
  return WORDS[move];
}

/** Pops a word at a world position, tilted, with a little overshoot, then fades up and away. */
export function popWord(ctx: StageCtx, at: Vector3, [word, tone]: readonly [string, Tone]): void {
  const p = at.clone().project(ctx.camera);
  if (p.z > 1) return;
  const el = document.createElement('div');
  el.className = HIT_WORD;
  el.dataset['dmg'] = '';
  el.dataset['tone'] = tone;
  el.textContent = word;
  el.style.left = `${((p.x + 1) / 2) * 100}%`;
  el.style.top = `${((1 - p.y) / 2) * 100}%`;
  const tilt = (Math.random() - 0.5) * 24;
  ctx.stage.appendChild(el);
  ctx.tw
    .tween(
      0.75,
      (_e, t) => {
        const pop = t < 0.18 ? 0.4 + (t / 0.18) * 0.9 : 1.3 - Math.min(0.3, (t - 0.18) * 1.2);
        el.style.transform = `translate(-50%, ${-60 - t * 60}%) rotate(${tilt}deg) scale(${pop})`;
        el.style.opacity = String(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
      },
      ease.lin,
    )
    .then(
      () => el.remove(),
      () => el.remove(),
    );
}
