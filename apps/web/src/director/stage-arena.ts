// Things the sack and the giant do: mishaps, meddling, and the drawstring tightening each round.
import { Vector3 } from 'three';
import type { EnvHit, MatchEvent } from '@chog/sim';
import { hitTime } from '@chog/content';
import { ease } from '../engine/tween';
import { eyeWorld, headWorld } from '../chog/anchors';
import { setGum } from '../chog/accessories';
import { RIM_Y } from '../arena/constants';
import { SHOTS } from '../camera/camera-rig';
import { hideBanner, showBanner } from '../ui/store';
import { HAT } from '../playback/slots';
import { chogOf } from './context';
import type { StageCtx } from './context';
import { squash, walkTo } from './motion';
import { popDamage } from './popups';

type Of<K extends MatchEvent['type']> = Extract<MatchEvent, { type: K }>;

/** Shows each environmental hit at its time: spark, hurt pose, damage number. */
function landHits(ctx: StageCtx, e: Of<'mishap' | 'meddle' | 'zone'>, onHit?: (h: EnvHit) => void): Promise<void[]> {
  return Promise.all(
    e.hits.map(async (h, i) => {
      await ctx.waitUntil(hitTime(e, i, e.hits.length));
      const c = chogOf(ctx, h.target);
      ctx.fx.impact(headWorld(c, 0.05), h.dmg >= 10);
      c.setPose('hurt', 18);
      c.face(h.hpAfter <= 1 ? 'ko' : 'hurt');
      popDamage(ctx, c, h.dmg);
      onHit?.(h);
      await ctx.tw.wait(0.5);
      if (h.hpAfter > 0) {
        c.setPose('guard', 9);
        if (h.hpAfter > 1) c.face('normal');
      }
    }),
  );
}

function withBusy(ctx: StageCtx, ids: readonly string[], run: () => Promise<unknown>): Promise<void> {
  ids.forEach((id) => ctx.busy.add(id));
  return run().then(
    () => ids.forEach((id) => ctx.busy.delete(id)),
    (err: unknown) => {
      ids.forEach((id) => ctx.busy.delete(id));
      throw err;
    },
  );
}

export function stageMishap(ctx: StageCtx, e: Of<'mishap'>): Promise<void> {
  const id = e.hits[0]?.target;
  if (!id) return ctx.waitUntil(e.at + e.dur);
  const c = chogOf(ctx, id);
  ctx.cam.focus([c]);
  return withBusy(ctx, [id], async () => {
    if (e.kind === 'gumSlip') {
      const gum = ctx.world.gumBlob.position;
      await walkTo(ctx, c, gum.x, gum.z, 0.6);
      c.setPose('flail', 12);
    } else if (e.kind === 'hatFall') {
      await walkTo(ctx, c, HAT.x, HAT.z, 0.01, ctx.world.platform.topY);
      c.setPose('victory', 10);
      await ctx.waitUntil(hitTime(e, 0, 1) - 400);
      await ctx.tw.tween(0.4, (eased) => c.g.position.set(HAT.x + eased * 2.4, ctx.world.platform.topY * (1 - eased), HAT.z + eased * 2.0), ease.in);
    } else {
      c.setPose(e.kind === 'trip' ? 'flail' : 'hurt', 10);
    }
    await landHits(ctx, e, () => {
      if (e.kind === 'gumSlip') c.u.gumMask.value = 0.6;
      if (e.kind === 'trip') void squash(ctx, c);
    });
    await ctx.waitUntil(e.at + e.dur);
    c.u.gumMask.value = 0;
  });
}

async function heartLaunch(ctx: StageCtx, e: Of<'meddle'>): Promise<void> {
  const h = e.hits[0];
  if (!h) return;
  const c = chogOf(ctx, h.target);
  const { giant, heartBeamMat, heartPads, gumBlob, rim } = ctx.world;
  const pad = heartPads.reduce((best, p) => (p.pos.distanceTo(c.g.position) < best.pos.distanceTo(c.g.position) ? p : best));
  await walkTo(ctx, c, pad.pos.x, pad.pos.z, 0.5, 0.3);
  void ctx.cam.shot([0.8, 1.4, 6.4], [1.2, RIM_Y * 0.85, -1.5], 0.45);
  giant.face('heartsOpen');
  const hit = hitTime(e, 0, 1);
  await ctx.waitUntil(hit - 600);
  const beams = [-1, 1].map((s) => ctx.fx.beam(eyeWorld(giant, s), pad.pos, 0.35, heartBeamMat));
  void ctx.tw.tween(0.6, (_x, p) => {
    pad.pm.emissiveIntensity = 0.6 + p * 4;
    pad.light.intensity = 6 + p * 60;
  }, ease.lin);
  await ctx.waitUntil(hit);
  beams.forEach((b) => ctx.scene.remove(b));
  giant.face('hearts');
  pad.pm.emissiveIntensity = 0.6;
  pad.light.intensity = 6;
  const landing = gumBlob.position.clone().setY(0);
  const top = new Vector3(rim.center.x + 1, RIM_Y - 2.5, rim.center.z + 1);
  const p0 = c.g.position.clone();
  ctx.fx.impact(pad.pos.clone().setY(0.6), true);
  popDamage(ctx, c, h.dmg);
  c.setPose('flail', 14);
  c.face('hurt');
  ctx.cam.focus([c]);
  await ctx.tw.tween(0.7, (x, p) => {
    c.g.position.lerpVectors(p0, top, x);
    c.g.rotation.x = -p * 3;
  }, ease.out);
  await ctx.tw.tween(0.7, (x, p) => {
    c.g.position.lerpVectors(top, landing, x);
    c.g.rotation.x = -3 - p * 3.28;
  }, ease.in);
  c.g.rotation.x = 0;
  void squash(ctx, c);
  ctx.fx.puff(landing, 14, 1.8);
  ctx.fx.shake(0.5);
  c.setPose('guard', 8);
}

async function gumBomb(ctx: StageCtx, e: Of<'meddle'>): Promise<void> {
  const { giant } = ctx.world;
  const gum = giant.gum;
  const targets = e.hits.map((h) => chogOf(ctx, h.target));
  if (!gum || targets.length === 0) return;
  void ctx.cam.shot(...SHOTS.up, 0.45);
  giant.face('heartsOpen');
  await ctx.tw.tween(0.5, (x) => setGum(giant, 0.3 + x * 0.6), ease.out);
  const ball = gum.clone();
  ball.material = gum.material;
  ctx.scene.add(ball);
  const from = gum.getWorldPosition(new Vector3());
  ball.scale.setScalar(gum.getWorldScale(new Vector3()).x * 0.5);
  setGum(giant, 0.3);
  giant.face('hearts');
  const mid = targets.reduce((s, t) => s.add(t.g.position), new Vector3()).divideScalar(targets.length).setY(0.8);
  ctx.cam.focus(targets);
  const first = hitTime(e, 0, e.hits.length);
  const flight = Math.max(0.3, (first - ctx.clock()) / 1000);
  await ctx.tw.tween(flight, (x) => ball.position.lerpVectors(from, mid, x), ease.in);
  ctx.scene.remove(ball);
  ctx.fx.impact(mid, true);
  ctx.fx.puff(mid, 18, 2.2);
  targets.forEach((t) => (t.u.gumMask.value = 0.8));
  ctx.tw.wait(2.5).then(
    () => targets.forEach((t) => (t.u.gumMask.value = 0)),
    () => {},
  );
}

async function pawFlick(ctx: StageCtx, e: Of<'meddle'>): Promise<void> {
  const h = e.hits[0];
  if (!h) return;
  const c = chogOf(ctx, h.target);
  const { paw } = ctx.world;
  const bp = c.g.position.clone();
  // from the side the paw doesn't come down, so its arm stays out of the lens
  void ctx.cam.shot([bp.x - 3.2, 4.2, Math.min(6.4, bp.z + 5.8)], [bp.x + 0.4, 1.8, bp.z], 0.4);
  const hit = hitTime(e, 0, 1);
  paw.g.visible = true;
  paw.grip(0);
  paw.g.position.set(bp.x + 1.2, RIM_Y + 14, bp.z - 0.6);
  await ctx.tw.tween(Math.max(0.3, (hit - ctx.clock()) / 1000 - 0.15), (x) => (paw.g.position.y = RIM_Y + 14 + (2.4 - RIM_Y - 14) * x), ease.out);
  await ctx.tw.tween(0.15, (x) => {
    paw.g.position.x = bp.x + 1.2 - x * 1.4;
    paw.grip(x * 0.5);
  });
  c.setPose('flail', 14);
  const away = new Vector3(-1, 0, 0.3).normalize().multiplyScalar(3);
  void ctx.tw.tween(0.55, (x, p) => c.g.position.set(bp.x + away.x * x, Math.sin(p * Math.PI) * 1.6, bp.z + away.z * x), ease.lin).then(
    () => void squash(ctx, c),
    () => {},
  );
  await ctx.tw.tween(0.6, (x) => (paw.g.position.y = 2.4 + (RIM_Y + 16) * x), ease.in);
  paw.g.visible = false;
}

async function timesUp(ctx: StageCtx): Promise<void> {
  showBanner("TIME'S UP");
  void ctx.cam.shot(...SHOTS.up, 0.5);
  ctx.world.giant.face('heartsOpen');
  await ctx.tw.wait(1.2);
  hideBanner();
  ctx.world.giant.face('hearts');
}

export function stageMeddle(ctx: StageCtx, e: Of<'meddle'>): Promise<void> {
  const ids = e.hits.map((h) => h.target);
  return withBusy(ctx, ids, async () => {
    if (e.kind !== 'pluck') showBanner('THE CHOG MEDDLES');
    const run = { heart: heartLaunch, gum: gumBomb, flick: pawFlick, pluck: timesUp }[e.kind];
    const banner = ctx.tw.wait(1.1).then(() => e.kind !== 'pluck' && hideBanner(), () => {});
    await Promise.all([run(ctx, e), e.kind === 'heart' || e.kind === 'flick' ? Promise.resolve() : landHits(ctx, e), banner]);
    await ctx.waitUntil(e.at + e.dur);
  });
}

/** The drawstring tightens: banner, the rope ring closes in, the unlucky get squeezed. */
export async function stageZone(ctx: StageCtx, e: Of<'zone'>): Promise<void> {
  showBanner(`ROUND ${e.round}`);
  void ctx.cam.shot(...SHOTS.wide, 0.6);
  const { rope } = ctx.world;
  const from = rope.scale.x;
  const to = Math.max(0.7, 1 - 0.06 * e.round);
  void ctx.tw.tween(1.2, (x) => rope.scale.setScalar(from + (to - from) * x), ease.inOut);
  ctx.fx.shake(0.3);
  ctx.tw.wait(1.3).then(hideBanner, () => {});
  await withBusy(ctx, e.hits.map((h) => h.target), async () => {
    await landHits(ctx, e);
    await ctx.waitUntil(e.at + e.dur);
  });
}
