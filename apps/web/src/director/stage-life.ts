// The match's bookends and turning points: the drop, plucks, revives and the winner's moment.
import { Vector3 } from 'three';
import type { MatchEvent } from '@chog/sim';
import { ease } from '../engine/tween';
import { RIM_Y } from '../arena/constants';
import { setGum } from '../chog/accessories';
import { SHOTS } from '../camera/camera-rig';
import { hideBanner, showBanner } from '../ui/store';
import { HAT } from '../playback/slots';
import { shortName } from '../ui/names';
import { chogOf, nameOf } from './context';
import type { StageCtx } from './context';
import { faceTo, hop, squash } from './motion';

type Of<K extends MatchEvent['type']> = Extract<MatchEvent, { type: K }>;

/** The giant shakes everyone into the sack, a few at a time. */
export async function stageDrop(ctx: StageCtx, e: Of<'drop'>): Promise<void> {
  const { rim, giant } = ctx.world;
  showBanner('IN THE BAG.');
  void ctx.cam.shot(...SHOTS.up);
  const slots = ctx.slots();
  const window = e.dur / 1000 - 1.6;
  const spacing = window / Math.max(1, e.ids.length);
  ctx.tw.tween(1.2, (_x, p) => setGum(giant, 0.3 + Math.sin(p * Math.PI) * 0.5), ease.lin).catch(() => {});
  ctx.tw.wait(1.4).then(() => {
    hideBanner();
    void ctx.cam.shot(...SHOTS.wide, 1.2);
  }, () => {});
  await Promise.all(
    e.ids.map(async (id, i) => {
      await ctx.tw.wait(0.5 + i * spacing);
      const c = chogOf(ctx, id);
      const slot = slots[id] ?? { x: 0, z: 0 };
      c.g.visible = true;
      c.setPose('flail', 20);
      c.face('hurt');
      const p0 = new Vector3(rim.center.x + (Math.random() - 0.5) * 3, RIM_Y + 2, rim.center.z + (Math.random() - 0.5) * 2);
      await ctx.tw.tween(0.85, (x, p) => {
        c.g.position.set(p0.x + (slot.x - p0.x) * p, p0.y * (1 - x), p0.z + (slot.z - p0.z) * p);
        c.g.rotation.y += 0.25;
      }, ease.in);
      c.g.position.y = 0;
      c.setPose('guard', 8);
      c.face('normal');
      void squash(ctx, c);
      ctx.fx.puff(c.g.position, 10, 1.4);
      ctx.fx.shake(0.2);
    }),
  );
  await ctx.waitUntil(e.at + e.dur);
}

/** The paw reaches in, pinches the knocked-out Chog by the scruff and lifts it out. */
export async function stageElimination(ctx: StageCtx, e: Of<'elimination'>): Promise<void> {
  const c = chogOf(ctx, e.id);
  const { paw } = ctx.world;
  ctx.busy.add(e.id);
  c.face('ko');
  c.setPose('limp', 8);
  c.u.gumMask.value = 0;
  const bp = c.g.position.clone();
  void ctx.cam.shot([bp.x + 2.0, 1.9, Math.min(6.6, bp.z + 5.6)], [bp.x, 3.0, bp.z], 0.5);
  if (e.placement === 2) showBanner('PLUCKED.');
  await ctx.tw.tween(0.3, (x) => (c.body.rotation.x = -x * 0.35));
  paw.g.visible = true;
  paw.grip(0);
  paw.g.position.set(bp.x, RIM_Y + 18, bp.z);
  await ctx.tw.tween(0.8, (x) => (paw.g.position.y = RIM_Y + 18 + (bp.y + 2.1 - RIM_Y - 18) * x), ease.out);
  await ctx.tw.tween(0.2, (x) => paw.grip(x));
  c.body.rotation.x = 0;
  paw.g.attach(c.g);
  await ctx.tw.tween(0.95, (x) => (paw.g.position.y = bp.y + 2.1 + (RIM_Y + 26 - bp.y - 2.1) * x), ease.in);
  paw.g.visible = false;
  ctx.scene.attach(c.g);
  c.g.visible = false;
  if (e.placement === 2) hideBanner();
  await ctx.waitUntil(e.at + e.dur);
}

/** The giant changes its mind and drops a plucked Chog back in. */
export async function stageRevive(ctx: StageCtx, e: Of<'revive'>): Promise<void> {
  const c = chogOf(ctx, e.id);
  const slot = ctx.slots()[e.id] ?? { x: 0, z: 0 };
  ctx.busy.add(e.id);
  showBanner('BACK IN THE BAG');
  void ctx.cam.shot([slot.x + 1.5, 2.2, Math.min(6.6, slot.z + 5)], [slot.x, 2.5, slot.z], 0.5);
  c.g.visible = true;
  c.face('hurt');
  c.setPose('flail', 18);
  await ctx.tw.tween(1.3, (x) => c.g.position.set(slot.x, (RIM_Y + 4) * (1 - x), slot.z), ease.in);
  void squash(ctx, c);
  ctx.fx.puff(c.g.position, 14, 1.8);
  ctx.fx.shake(0.4);
  c.face('normal');
  c.setPose('guard', 8);
  ctx.tw.wait(0.8).then(hideBanner, () => {});
  await ctx.waitUntil(e.at + e.dur);
  ctx.busy.delete(e.id);
}

/** The last Chog standing climbs the bucket hat and celebrates. */
export async function stageWinner(ctx: StageCtx, e: Of<'winner'>): Promise<void> {
  const c = chogOf(ctx, e.id);
  ctx.busy.add(e.id);
  const top = new Vector3(HAT.x, ctx.world.platform.topY, HAT.z);
  await hop(ctx, c, top, 0.8, 3);
  faceTo(c, 6, 14);
  c.setPose('victory', 8);
  void ctx.cam.shot([0.2, 2.2, 4.6], [-3.0, 3.9, -2.4], 0.9);
  showBanner(`${shortName(nameOf(ctx, e.id))} WINS`, 'gold');
  // victory dance on the hat until the moment ends
  const moves = ['victory', 'flex', 'victory', 'point'] as const;
  for (let i = 0; ctx.clock() < e.at + e.dur - 900; i++) {
    c.setPose(moves[i % moves.length]!, 14);
    c.g.rotation.y += i % 2 ? 0.5 : -0.5;
    await ctx.tw.wait(0.45);
  }
  hideBanner();
}
