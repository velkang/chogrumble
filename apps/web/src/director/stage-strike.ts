// Live combat: a swing closes in and winds up; the strike that follows plays the outcome.
import type { MatchEvent } from '@chog/sim';
import { chogOf } from './context';
import type { StageCtx } from './context';
import { playStrike, playSwing } from './moves';

type Of<K extends MatchEvent['type']> = Extract<MatchEvent, { type: K }>;

export async function stageSwing(ctx: StageCtx, e: Of<'swing'>): Promise<void> {
  if (!ctx.cast.has(e.attacker) || !ctx.cast.has(e.target)) return;
  ctx.busy.add(e.attacker);
  try {
    await playSwing(ctx, e.attacker, e.target, e.move === 'recoil' ? 'jab' : e.move, e.landsAt);
  } finally {
    ctx.busy.delete(e.attacker);
  }
}

export function stageStrike(ctx: StageCtx, e: Of<'strike'>): Promise<void> {
  return playStrike(ctx, e.hits);
}

/** The player's dodge roll: a quick sideways tumble. */
export async function stageRoll(ctx: StageCtx, e: Of<'roll'>): Promise<void> {
  if (!ctx.cast.has(e.id)) return;
  const c = chogOf(ctx, e.id);
  const side = Math.sin(e.at) > 0 ? 1 : -1;
  const p0 = c.g.position.clone();
  const dir = { x: Math.cos(c.g.rotation.y) * side * 1.4, z: -Math.sin(c.g.rotation.y) * side * 1.4 };
  ctx.busy.add(e.id);
  c.setPose('flail', 18);
  try {
    await ctx.tw.tween(e.dur / 1000, (x, p) => {
      c.g.position.set(p0.x + dir.x * x, Math.sin(p * Math.PI) * 0.35, p0.z + dir.z * x);
      c.body.rotation.z = -side * p * Math.PI * 2;
    });
  } finally {
    c.body.rotation.z = 0;
    c.g.position.y = 0;
    c.setPose('guard', 9);
    ctx.busy.delete(e.id);
  }
}
