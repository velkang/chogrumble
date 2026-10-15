// One attack, animated so its impact lands exactly at the sim's hit time. The sim already
// decided the outcome (dodged, damage, crit); this only stages it.
import { CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { AttackHit, MoveKey } from '@chog/sim';
import { ease } from '../engine/tween';
import { eyeWorld, headWorld } from '../chog/anchors';
import type { Chog } from '../chog/chog';
import { chogOf } from './context';
import type { StageCtx } from './context';
import { closeIn, faceTo, knock, lunge } from './motion';
import { popDamage } from './popups';
import { hitWord, popWord } from './hit-words';
import { swoosh } from './swoosh';

/** Seconds before the impact that each move starts winding up. */
const LEAD: Readonly<Record<MoveKey, number>> = {
  jab: 0.22,
  counter: 0.2,
  kick: 0.3,
  headbutt: 0.3,
  dive: 0.62,
  laser: 0.42,
  bubble: 0.48,
  puke: 0.5,
  coin: 0.4,
  recoil: 0,
};

const RAINBOW = [0xff4d4d, 0xff9f1c, 0xffe94d, 0x4dff88, 0x4dc3ff, 0xb04dff] as const;

function mouthWorld(c: Chog): Vector3 {
  return headWorld(c, 0.06).add(new Vector3(Math.sin(c.g.rotation.y) * 0.3, 0, Math.cos(c.g.rotation.y) * 0.3));
}

/** Flies a mesh from `from` to `to` over `dur` seconds with a little arc, then removes it. */
async function projectile(ctx: StageCtx, mesh: Mesh, from: Vector3, to: Vector3, dur: number, arc: number, spin = 0): Promise<void> {
  mesh.position.copy(from);
  ctx.scene.add(mesh);
  try {
    await ctx.tw.tween(
      dur,
      (e, p) => {
        mesh.position.lerpVectors(from, to, e);
        mesh.position.y += Math.sin(p * Math.PI) * arc;
        mesh.rotation.y += spin;
      },
      ease.lin,
    );
  } finally {
    ctx.scene.remove(mesh);
  }
}

/** Windup and body motion for the attacker; projectiles launch here and arrive at impact. */
async function windUp(ctx: StageCtx, move: MoveKey, a: Chog, d: Chog, lead: number): Promise<void> {
  const target = () => headWorld(d, 0.05);
  switch (move) {
    case 'jab':
    case 'counter': {
      a.setPose(move === 'jab' ? 'windR' : 'windL', 16);
      await ctx.tw.wait(lead * 0.5);
      a.setPose(move === 'jab' ? 'punchR' : 'punchL', 30);
      void lunge(ctx, a, 0.55, 0.24);
      void stretch(ctx, a, 0.24);
      return;
    }
    case 'kick': {
      // a little jump kick
      a.setPose('windK', 15);
      await ctx.tw.wait(lead * 0.45);
      a.setPose('kick', 28);
      void lunge(ctx, a, 0.5, 0.3);
      void ctx.tw.tween(0.3, (_x, p) => (a.g.position.y = Math.sin(p * Math.PI) * 0.35), ease.lin).catch(() => {});
      return;
    }
    case 'headbutt':
      // rear back, then a lunging dash head-first
      a.setPose('hurt', 12);
      await ctx.tw.wait(lead * 0.5);
      a.setPose('nuts', 28);
      void lunge(ctx, a, 0.9, 0.28);
      void stretch(ctx, a, 0.28);
      return;
    case 'dive': {
      const p0 = a.g.position.clone();
      const to = d.g.position.clone();
      a.setPose('flail', 14);
      await ctx.tw.tween(lead, (e, p) => a.g.position.set(p0.x + (to.x - p0.x) * e * 0.8, Math.sin(p * Math.PI) * 2.4, p0.z + (to.z - p0.z) * e * 0.8), ease.lin);
      a.g.position.y = 0;
      return;
    }
    case 'laser': {
      a.setPose('laser', 12);
      a.face('laser');
      await ctx.tw.wait(lead * 0.4);
      const beams = [-1, 1].map((s) => ctx.fx.beam(eyeWorld(a, s), target(), 0.06, ctx.world.beamMat));
      await ctx.tw.wait(lead * 0.6);
      beams.forEach((b) => ctx.scene.remove(b));
      a.face('normal');
      return;
    }
    case 'bubble': {
      a.setPose('blow', 10);
      const ball = new Mesh(new SphereGeometry(0.28, 20, 12), new MeshStandardMaterial({ color: 0xff7ec4, roughness: 0.15, transparent: true, opacity: 0.92 }));
      await projectile(ctx, ball, mouthWorld(a), target(), lead, 0.6);
      return;
    }
    case 'puke': {
      a.setPose('blow', 10);
      const blobs = RAINBOW.map((c, i) => projectile(ctx, new Mesh(new SphereGeometry(0.14, 10, 8), new MeshBasicMaterial({ color: c })), mouthWorld(a), target().add(new Vector3(0, (i - 2.5) * 0.06, 0)), lead * (0.75 + i * 0.05), 0.4));
      await Promise.all(blobs);
      return;
    }
    case 'coin': {
      a.setPose('punchR', 20);
      const coin = new Mesh(new CylinderGeometry(0.16, 0.16, 0.04, 20), new MeshStandardMaterial({ color: 0xffc83d, metalness: 0.8, roughness: 0.3 }));
      coin.rotation.x = Math.PI / 2;
      await projectile(ctx, coin, mouthWorld(a), target(), lead, 0.9, 0.5);
      return;
    }
    case 'recoil':
      return;
  }
}

/** A forward stretch for the moment of impact, then back to shape. */
function stretch(ctx: StageCtx, c: Chog, dur: number): Promise<void> {
  return ctx.tw
    .tween(dur, (_x, p) => {
      const k = Math.sin(p * Math.PI) * 0.18;
      c.body.scale.set(1 - k * 0.5, 1 - k * 0.3, 1 + k);
    }, ease.lin)
    .then(() => void c.body.scale.set(1, 1, 1), () => void c.body.scale.set(1, 1, 1));
}

/** Big hits send the target head over heels backwards, then it scrambles up. */
async function tumble(ctx: StageCtx, d: Chog, from: Chog): Promise<void> {
  const p0 = d.g.position.clone();
  const away = p0.clone().sub(from.g.position).setY(0);
  if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
  away.setLength(1.3);
  d.setPose('flail', 18);
  try {
    await ctx.tw.tween(0.6, (x, p) => {
      d.g.position.set(p0.x + away.x * x, Math.sin(p * Math.PI) * 0.7, p0.z + away.z * x);
      d.body.rotation.x = -p * Math.PI * 2;
    }, ease.out);
  } finally {
    d.body.rotation.x = 0;
    d.g.position.y = 0;
  }
  ctx.fx.puff(d.g.position, 6, 1.0);
}

/** The target's side of the impact. */
function react(ctx: StageCtx, h: AttackHit, a: Chog, d: Chog): void {
  popWord(ctx, headWorld(d, 0.5), hitWord(h.move, h));
  if (h.move === 'jab' || h.move === 'counter' || h.move === 'kick' || h.move === 'headbutt') {
    swoosh(ctx, a, h.blocked ? 0x7fd8ff : h.dodged ? 0xffffff : 0xffd23f, h.move === 'kick');
  }
  if (h.blocked) {
    d.setPose('guard', 22);
    ctx.fx.puff(headWorld(d, 0).add(new Vector3(Math.sin(d.g.rotation.y) * 0.25, -0.1, Math.cos(d.g.rotation.y) * 0.25)), 4, 0.7);
    void knock(ctx, d, a.g.position, 0.15, 0.15);
    return;
  }
  if (h.dodged) {
    // a quick hop to the side
    const flip = Math.random() < 0.5 ? 1 : -1;
    const side = new Vector3(Math.cos(d.g.rotation.y), 0, -Math.sin(d.g.rotation.y)).multiplyScalar(1.1 * flip);
    const p0 = d.g.position.clone();
    d.setPose('flail', 20);
    void ctx.tw
      .tween(0.28, (e, p) => {
        d.g.position.set(p0.x + side.x * e, Math.sin(p * Math.PI) * 0.3, p0.z + side.z * e);
        d.body.rotation.z = -flip * Math.sin(p * Math.PI) * 0.35;
      })
      .then(
        () => {
          d.body.rotation.z = 0;
          d.setPose('guard', 10);
        },
        () => {},
      );
    return;
  }
  if (h.dmg >= 9 || h.crit || h.hpAfter === 0) {
    void tumble(ctx, d, a);
  }
  const big = h.dmg >= 12 || h.crit;
  ctx.fx.impact(h.move === 'kick' ? d.g.position.clone().add(new Vector3(0, 0.55, 0)) : headWorld(d, 0.05), big);
  d.setPose(h.move === 'kick' ? 'nuts' : 'hurt', 18);
  d.face(h.hpAfter <= 1 ? 'ko' : 'hurt');
  popDamage(ctx, d, h.dmg, h.crit);
  if (h.move === 'bubble' || h.move === 'puke') d.u.gumMask.value = h.move === 'bubble' ? 1 : 0.5;
  if (h.move === 'kick' && h.crit) void ctx.fx.tooth(headWorld(d, 0));
  if (!(h.dmg >= 9 || h.crit || h.hpAfter === 0)) void knock(ctx, d, a.g.position, big ? 0.8 : 0.35, 0.3);
  ctx.tw.wait(0.45).then(
    () => {
      d.setPose('guard', 9);
      if (h.hpAfter > 1) d.face('normal');
    },
    () => {},
  );
  ctx.tw.wait(2.2).then(
    () => (d.u.gumMask.value = 0),
    () => {},
  );
}

const REACH: Partial<Record<MoveKey, number>> = { jab: 1.0, counter: 1.0, kick: 0.95, headbutt: 0.95, dive: 3.5 };

/** Closes in and winds up so the blow lands at `landAt` (match ms). The outcome comes later. */
export async function playSwing(ctx: StageCtx, attacker: string, target: string, move: Exclude<MoveKey, 'recoil'>, landAt: number): Promise<void> {
  const a = chogOf(ctx, attacker);
  const d = chogOf(ctx, target);
  const lead = LEAD[move];
  const reach = REACH[move];
  if (reach !== undefined) await closeIn(ctx, a, d, reach, Math.max(0.15, Math.min(0.45, (landAt - ctx.clock()) / 1000 - lead - 0.05)));
  faceTo(a, d.g.position.x, d.g.position.z);
  await ctx.waitUntil(landAt - lead * 1000);
  faceTo(a, d.g.position.x, d.g.position.z);
  await windUp(ctx, move, a, d, lead);
}

/** The impact: reactions for each blow (and any headbutt recoil), then guards back up. */
export async function playStrike(ctx: StageCtx, hits: readonly AttackHit[]): Promise<void> {
  for (const h of hits) {
    if (!ctx.cast.has(h.attacker) || !ctx.cast.has(h.target)) continue;
    const a = chogOf(ctx, h.attacker);
    if (h.move === 'recoil') {
      a.setPose('hurt', 18);
      ctx.fx.impact(headWorld(a, 0.1));
      popDamage(ctx, a, h.dmg);
      continue;
    }
    react(ctx, h, a, chogOf(ctx, h.target));
  }
  await ctx.tw.wait(0.3);
  for (const h of hits) if (ctx.cast.has(h.attacker)) chogOf(ctx, h.attacker).setPose('guard', 9);
}
