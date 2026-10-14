// The giant meddles: heart-beam launch, gum bomb, or a flick from its paw.
import { Vector3 } from 'three';
import { ease } from '../engine/tween';
import { eyeWorld, headWorld } from '../chog/anchors';
import { setGum } from '../chog/accessories';
import { RIM_Y } from '../arena/constants';
import { SHOTS } from '../camera/camera-rig';
import type { Fighter } from '../arena/world';
import { LINES } from './lines';
import { pick, roll, sides } from './game';
import type { Game } from './game';
import { checkGum, clampFloor, knock, runTo, squash } from './movement';

async function heartLaunch(game: Game, v: Fighter): Promise<void> {
  const { world, hud, fx, cam, tw } = game;
  hud.chip('cHeart', true);
  const pad = world.heartPads.reduce((best, h) =>
    h.pos.distanceTo(v.g.position) < best.pos.distanceTo(v.g.position) ? h : best,
  );
  await runTo(game, v, pad.pos.x, pad.pos.z, 0.4);
  v.g.position.y = 0.3;
  hud.banner('THE CHOG MEDDLES');
  cam.shot([0.8, 1.4, 6.4], [1.2, RIM_Y * 0.85, -1.5], 0.45);
  world.giant.face('heartsOpen');
  await tw.wait(0.3);
  const beams = [-1, 1].map((s) =>
    fx.beam(eyeWorld(world.giant, s), pad.pos, 0.35, world.heartBeamMat),
  );
  tw.tween(
    0.5,
    (_e, p) => {
      pad.pm.emissiveIntensity = 0.6 + p * 4;
      pad.light.intensity = 6 + p * 60;
    },
    ease.lin,
  );
  await tw.wait(0.5);
  beams.forEach((b) => game.scene.remove(b));
  hud.bannerOff();
  world.giant.face('hearts');
  pad.pm.emissiveIntensity = 0.6;
  pad.light.intensity = 6;
  fx.impact(pad.pos.clone().add(new Vector3(0, 0.6, 0)), true);
  fx.puff(pad.pos, 14, 2);
  await launchArc(game, v);
}

/** Up to the giant's face and back down into the gum. */
async function launchArc(game: Game, v: Fighter): Promise<void> {
  const { world, hud, fx, cam, tw } = game;
  const p0 = v.g.position.clone();
  const top = new Vector3(world.rim.center.x + 1, RIM_Y - 2.5, world.rim.center.z + 1);
  const land = world.gumBlob.position.clone().setY(0);
  v.setPose('flail', 14);
  v.face('hurt');
  cam.shot([2.2, 1.0, 6.0], [1.5, RIM_Y * 0.75, -0.5], 0.4);
  await tw.tween(
    0.7,
    (e, p) => {
      v.g.position.lerpVectors(p0, top, e);
      v.g.rotation.x = -p * 3;
    },
    ease.out,
  );
  cam.follow();
  await tw.tween(
    0.7,
    (e, p) => {
      v.g.position.lerpVectors(top, land, e);
      v.g.rotation.x = -3 - p * 3.28;
    },
    ease.in,
  );
  v.g.rotation.x = 0;
  squash(game, v);
  fx.puff(land, 14, 1.8);
  fx.shake(0.5);
  const n = hud.dmg(v, roll(12, 17));
  checkGum(game, v);
  hud.say(pick(LINES.heart), { b: v, hit: n, kind: 'arena' });
  v.setPose('guard', 8);
}

async function gumBomb(game: Game): Promise<void> {
  const { world, hud, fx, cam, tw } = game;
  const { me, foe } = sides(game);
  const gum = world.giant.gum;
  if (!gum) throw new Error('The giant has no gum');
  hud.chip('cGum', true);
  hud.banner('THE CHOG MEDDLES');
  cam.shot(...SHOTS.up, 0.45);
  world.giant.face('heartsOpen');
  await tw.tween(0.4, (e) => setGum(world.giant, 0.3 + e * 0.6), ease.out);
  const ball = gum.clone();
  ball.material = gum.material;
  game.scene.add(ball);
  const from = gum.getWorldPosition(new Vector3());
  ball.scale.setScalar(gum.getWorldScale(new Vector3()).x * 0.5);
  setGum(world.giant, 0.3);
  world.giant.face('hearts');
  hud.bannerOff();
  const mid = me.g.position.clone().add(foe.g.position).multiplyScalar(0.5).setY(0.8);
  cam.follow();
  await tw.tween(0.7, (e) => ball.position.lerpVectors(from, mid, e), ease.in);
  game.scene.remove(ball);
  fx.impact(mid, true);
  fx.puff(mid, 18, 2.2);
  for (const f of [me, foe]) {
    hud.dmg(f, roll(5, 8));
    f.u.gumMask.value = 0.8;
    knock(game, f, 1.0, 0.35, mid);
  }
  tw.wait(2.5).then(
    () => {
      for (const f of [me, foe]) if (!f.stuck) f.u.gumMask.value = 0;
    },
    () => {},
  );
  hud.say(pick(LINES.gum), { kind: 'arena', hit: 0 });
}

async function pawFlick(game: Game, v: Fighter): Promise<void> {
  const { world, hud, fx, tw } = game;
  const { paw } = world;
  hud.chip('cHand', true);
  hud.banner('THE CHOG MEDDLES');
  const bp = v.g.position.clone();
  paw.g.visible = true;
  paw.grip(0);
  paw.g.position.set(bp.x + 1.2, RIM_Y + 14, bp.z - 0.6);
  await tw.tween(0.6, (e) => (paw.g.position.y = RIM_Y + 14 + (2.4 - RIM_Y - 14) * e), ease.out);
  hud.bannerOff();
  await tw.tween(0.15, (e) => {
    paw.g.position.x = bp.x + 1.2 - e * 1.4;
    paw.grip(e * 0.5);
  });
  fx.impact(headWorld(v, 0.1), true);
  const n = hud.dmg(v, roll(7, 11));
  v.setPose('flail', 14);
  const away = new Vector3(-1, 0, 0.3).normalize();
  const p0 = v.g.position.clone();
  const [x, z] = clampFloor(game, p0.x + away.x * 3.5, p0.z + away.z * 3.5);
  tw.tween(
    0.55,
    (e, p) =>
      v.g.position.set(p0.x + (x - p0.x) * e, Math.sin(p * Math.PI) * 1.6, p0.z + (z - p0.z) * e),
    ease.lin,
  ).then(
    () => {
      squash(game, v);
      v.setPose('guard', 8);
      checkGum(game, v);
    },
    () => {},
  );
  hud.say(pick(LINES.flick), { b: v, hit: n, kind: 'arena' });
  await tw.tween(0.6, (e) => (paw.g.position.y = 2.4 + (RIM_Y + 16) * e), ease.in);
  paw.g.visible = false;
}

export async function arenaEvent(game: Game): Promise<void> {
  const kind = pick(['heart', 'gum', 'flick'] as const);
  const { me, foe } = sides(game);
  const v = Math.random() < 0.5 ? me : foe;
  me.free = foe.free = false;
  me.walking = foe.walking = 0;
  if (kind === 'heart') await heartLaunch(game, v);
  else if (kind === 'gum') await gumBomb(game);
  else await pawFlick(game, v);
  await game.tw.wait(0.3);
}
