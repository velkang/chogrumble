// The fighters' moves. Each one plays out its animation and applies damage as it lands.
import { Vector3 } from 'three';
import { ease } from '../engine/tween';
import { eyeWorld, headWorld } from '../chog/anchors';
import { setGum } from '../chog/accessories';
import type { Fighter } from '../arena/world';
import { LINES } from './lines';
import { pick, roll } from './game';
import type { Game } from './game';
import { dashAt, faceTo, hop, knock, lunge, runTo, squash } from './movement';

export type MoveFn = (game: Game, a: Fighter, d: Fighter) => Promise<void>;

function dodged(d: Fighter): boolean {
  return Math.random() < 0.12 && d.hp > 20;
}

async function sidestep(game: Game, d: Fighter, a: Fighter): Promise<void> {
  const s = new Vector3(Math.cos(d.g.rotation.y), 0, -Math.sin(d.g.rotation.y)).multiplyScalar(
    Math.random() < 0.5 ? 1.2 : -1.2,
  );
  d.free = false;
  await runTo(game, d, d.g.position.x + s.x, d.g.position.z + s.z, 0.22);
  faceTo(d, a.g.position.x, a.g.position.z);
}

/** A clean hit: spark, hurt pose, damage, knockback and a feed line. */
export function hurt(
  game: Game,
  d: Fighter,
  a: Fighter,
  n: number,
  crit: boolean,
  line: readonly string[],
  big: boolean,
): void {
  game.fx.impact(headWorld(d, 0.05), big);
  d.setPose('hurt', 18);
  game.hud.dmg(d, n, crit);
  knock(game, d, big ? 0.9 : 0.4, 0.3, a.g.position);
  game.hud.say(pick(line), { a, b: d, hit: n });
  game.tw.wait(0.35).then(
    () => d.setPose('guard', 9),
    () => {},
  );
}

async function whiff(game: Game, a: Fighter, d: Fighter, settle: number): Promise<void> {
  await sidestep(game, d, a);
  game.hud.say(pick(LINES.dodge), { a, b: d });
  await game.tw.wait(settle);
  a.setPose('guard', 9);
}

async function jabHit(game: Game, a: Fighter, d: Fighter, side: 'R' | 'L'): Promise<number> {
  a.setPose(side === 'R' ? 'windR' : 'windL', 16);
  await game.tw.wait(0.11);
  a.setPose(side === 'R' ? 'punchR' : 'punchL', 26);
  lunge(game, a, 0.3, 0.24);
  await game.tw.wait(0.09);
  const n = roll(4, 7);
  game.fx.impact(headWorld(d, 0.05));
  d.setPose('hurt', 18);
  game.hud.dmg(d, n);
  knock(game, d, 0.25, 0.2, a.g.position);
  await game.tw.wait(0.12);
  d.setPose('guard', 10);
  return n;
}

const moveJab: MoveFn = async (game, a, d) => {
  await dashAt(game, a, d);
  if (dodged(d)) {
    a.setPose('punchR', 22);
    lunge(game, a, 0.8, 0.3);
    return whiff(game, a, d, 0.25);
  }
  let total = await jabHit(game, a, d, 'R');
  total += await jabHit(game, a, d, 'L');
  if (Math.random() < 0.35 && d.hp > 0) {
    a.setPose('windR', 16);
    await game.tw.wait(0.12);
    a.setPose('punchR', 26);
    lunge(game, a, 0.6, 0.3);
    await game.tw.wait(0.1);
    hurt(game, d, a, roll(6, 10), false, LINES.uppercut, true);
  } else game.hud.say(pick(LINES.jab), { a, b: d, hit: total });
  await game.tw.wait(0.2);
  a.setPose('guard', 9);
};

const moveKick: MoveFn = async (game, a, d) => {
  await dashAt(game, a, d, 1.35);
  if (dodged(d)) {
    a.setPose('kick', 24);
    return whiff(game, a, d, 0.3);
  }
  a.setPose('windK', 15);
  await game.tw.wait(0.16);
  a.setPose('kick', 26);
  lunge(game, a, 0.35, 0.28);
  await game.tw.wait(0.12);
  const n = roll(12, 18);
  game.fx.impact(d.g.position.clone().add(new Vector3(0, 0.55, 0)), true);
  d.setPose('nuts', 16);
  game.hud.dmg(d, n, true);
  if (Math.random() < 0.5) game.fx.tooth(headWorld(d, 0.0));
  game.hud.say(pick(LINES.kick), { a, b: d, hit: n });
  await game.tw.wait(0.5);
  a.setPose('guard', 9);
  d.setPose('guard', 6);
};

const moveHeadbutt: MoveFn = async (game, a, d) => {
  await dashAt(game, a, d, 1.35);
  a.setPose('hurt', 12);
  await game.tw.wait(0.16);
  a.setPose('nuts', 26);
  lunge(game, a, 0.55, 0.26);
  await game.tw.wait(0.11);
  hurt(game, d, a, roll(8, 12), false, LINES.headbutt, true);
  if (Math.random() < 0.35) game.hud.dmg(a, 3);
  await game.tw.wait(0.3);
  a.setPose('guard', 9);
};

const moveLaser: MoveFn = async (game, a, d) => {
  const away = a.g.position.clone().sub(d.g.position).setY(0);
  if (away.length() < 2.4) {
    away.setLength(1.3);
    await runTo(game, a, a.g.position.x + away.x, a.g.position.z + away.z, 0.28);
  }
  faceTo(a, d.g.position.x, d.g.position.z);
  a.setPose('laser', 12);
  a.face('laser');
  await game.tw.wait(0.18);
  const missed = dodged(d);
  const target = missed ? d.g.position.clone().add(new Vector3(1.5, 0.2, 0)) : headWorld(d, 0.05);
  const beams = [-1, 1].map((s) => game.fx.beam(eyeWorld(a, s), target, 0.06, game.world.beamMat));
  if (missed) {
    await sidestep(game, d, a);
    await game.tw.wait(0.15);
    beams.forEach((b) => game.scene.remove(b));
    a.face('normal');
    a.setPose('guard', 9);
    game.hud.say(pick(LINES.dodge), { a, b: d });
    return;
  }
  await game.tw.wait(0.38);
  beams.forEach((b) => game.scene.remove(b));
  hurt(game, d, a, roll(10, 16), true, LINES.laser, true);
  await game.tw.wait(0.2);
  a.face('normal');
  a.setPose('guard', 9);
};

const moveBubble: MoveFn = async (game, a, d) => {
  const gum = a.gum;
  if (!gum) throw new Error(`${a.name} has no gum to blow`);
  faceTo(a, d.g.position.x, d.g.position.z);
  a.setPose('blow', 10);
  await game.tw.tween(0.55, (e) => setGum(a, 0.3 + e * 3.2), ease.out);
  // the bubble leaves the mouth and flies at the target
  const ball = gum.clone();
  ball.material = gum.material;
  game.scene.add(ball);
  const from = gum.getWorldPosition(new Vector3());
  ball.scale.setScalar(gum.getWorldScale(new Vector3()).x);
  setGum(a, 0);
  a.setPose('guard', 9);
  const to = headWorld(d, 0.05);
  await game.tw.tween(
    0.32,
    (e, p) => {
      ball.position.lerpVectors(from, to, e);
      ball.position.y += Math.sin(p * Math.PI) * 0.6;
    },
    ease.lin,
  );
  game.scene.remove(ball);
  d.u.gumMask.value = 1;
  hurt(game, d, a, roll(9, 14), false, LINES.bubble, true);
  game.tw.wait(2.5).then(
    () => {
      if (!d.stuck) d.u.gumMask.value = 0;
    },
    () => {},
  );
  await game.tw.wait(0.2);
};

const moveDive: MoveFn = async (game, a, d) => {
  const { group, topY } = game.world.platform;
  const top = new Vector3(group.position.x + 0.6, topY, group.position.z + 0.6);
  await runTo(game, a, top.x + 1.9, top.z + 1.6, 0.35);
  await hop(game, a, top.x, top.y, top.z, 0.5, 2.2);
  faceTo(a, d.g.position.x, d.g.position.z);
  await game.tw.wait(0.12);
  const t = d.g.position.clone();
  a.setPose('flail', 14);
  const p0 = a.g.position.clone();
  await game.tw.tween(
    0.55,
    (e, p) => {
      a.g.position.set(
        p0.x + (t.x - p0.x) * e,
        p0.y * (1 - p) + Math.sin(p * Math.PI) * 2.6,
        p0.z + (t.z - p0.z) * e,
      );
    },
    ease.lin,
  );
  a.g.position.y = 0;
  squash(game, a);
  squash(game, d);
  game.fx.puff(t, 12, 1.6);
  const back = t.clone().sub(p0).setY(0).setLength(1.1);
  a.g.position.x -= back.x;
  a.g.position.z -= back.z;
  hurt(game, d, a, roll(14, 19), true, LINES.dive, true);
  await game.tw.wait(0.3);
  a.setPose('guard', 9);
};

export const MOVES = {
  jab: { label: 'Slap combo', fn: moveJab },
  kick: { label: 'Nut shot', fn: moveKick },
  headbutt: { label: 'Headbutt', fn: moveHeadbutt },
  laser: { label: 'Laser eyes', fn: moveLaser },
  bubble: { label: 'Gum cannon', fn: moveBubble },
  dive: { label: 'Hat dive', fn: moveDive },
} as const satisfies Record<string, { label: string; fn: MoveFn }>;

export type MoveKey = keyof typeof MOVES;

export function movesOf(f: Fighter): MoveKey[] {
  return ['jab', 'kick', 'headbutt', 'dive', ...(f.specials as MoveKey[])];
}

/** Sometimes the defender fires straight back with a quick jab. */
export async function counterPunch(game: Game, d: Fighter, a: Fighter): Promise<void> {
  await game.tw.wait(0.08);
  await dashAt(game, d, a, 1.4, 0.18);
  d.setPose('windR', 16);
  await game.tw.wait(0.1);
  d.setPose('punchR', 26);
  lunge(game, d, 0.45, 0.24);
  await game.tw.wait(0.09);
  const n = roll(4, 7);
  game.fx.impact(headWorld(a, 0.05));
  a.setPose('hurt', 18);
  game.hud.dmg(a, n);
  knock(game, a, 0.35, 0.22, d.g.position);
  game.hud.say(pick(LINES.counter), { a, b: d, hit: n });
  await game.tw.wait(0.25);
}
