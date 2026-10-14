// The 1v1 fight script: the giant stuffs both fighters in, they trade moves until one drops, the paw plucks the loser.
import { ease } from '../engine/tween';
import { CANCELLED } from '../engine/tween';
import { setGum } from '../chog/accessories';
import { RIM_Y } from '../arena/constants';
import { SHOTS } from '../camera/camera-rig';
import { CHIPS } from '../hud/hud';
import { byId, setFlag } from '../hud/dom';
import type { Fighter } from '../arena/world';
import { LINES } from './lines';
import { pick, sides } from './game';
import type { Game } from './game';
import { arenaEvent } from './meddle';
import { MOVES, counterPunch, movesOf } from './moves';
import { faceTo, hop, runTo, squash } from './movement';

type Alive = () => void;

function resetFighter(game: Game, f: Fighter): void {
  game.hud.setHP(f, 100);
  f.face('normal');
  f.setPose('idle');
  f.g.visible = false;
  f.body.scale.set(1, 1, 1);
  f.body.rotation.set(0, 0, 0);
  f.u.gumMask.value = 0;
  game.scene.attach(f.g);
  f.g.rotation.set(0, 0, 0);
  f.free = false;
  f.stuck = 0;
  f.walking = 0;
  f.circleDir = f === game.world.fighters[0] ? 1 : -1;
  if (f !== game.match.me) f.nextMove = null;
  if (f.gum) setGum(f, 0);
}

function resetStage(game: Game): void {
  const { hud, world } = game;
  setFlag(byId('hud'), 'on', false);
  setFlag(byId('bubble'), 'on', false);
  hud.bannerOff();
  byId('feed').innerHTML = '';
  CHIPS.forEach((c) => hud.chip(c, false));
  world.fighters.forEach((f) => resetFighter(game, f));
  world.paw.g.visible = false;
  setGum(world.giant, 0.3);
  world.giant.face('hearts');
  world.giant.u.faceSquash.value = 1;
  document.querySelectorAll('[data-dmg]').forEach((e) => e.remove());
  game.match.meddleQueued = false;
}

async function intro(game: Game, alive: Alive): Promise<void> {
  const { me, foe } = sides(game);
  const { tw, cam, world, fx } = game;
  cam.shot(...SHOTS.up);
  setFlag(byId('bubble'), 'on', true);
  tw.tween(1.0, (_e, p) => setGum(world.giant, 0.3 + Math.sin(p * Math.PI) * 0.5), ease.lin);
  await tw.wait(1.2);
  alive();
  setFlag(byId('bubble'), 'on', false);
  const drops = [
    [me, -0.8, 1.2],
    [foe, 2.6, 0.4],
  ] as const;
  for (const [f, x, z] of drops) {
    f.g.visible = true;
    f.setPose('flail', 20);
    f.face('hurt');
    f.g.position.set(world.rim.center.x + x * 0.4, RIM_Y + 2, world.rim.center.z + z * 0.3);
  }
  cam.follow();
  await Promise.all(
    drops.map(([f, x, z], i) =>
      tw.wait(i * 0.25).then(() => {
        const p0 = f.g.position.clone();
        return tw
          .tween(
            0.85,
            (e, p) => {
              f.g.position.set(p0.x + (x - p0.x) * p, p0.y * (1 - e), p0.z + (z - p0.z) * p);
              f.g.rotation.y += 0.25;
            },
            ease.in,
          )
          .then(() => {
            f.g.position.y = 0;
            f.setPose('guard', 8);
            f.face('normal');
            squash(game, f);
            fx.puff(f.g.position, 12, 1.6);
            fx.shake(0.35);
          });
      }),
    ),
  );
  alive();
  faceTo(me, foe.g.position.x, foe.g.position.z);
  faceTo(foe, me.g.position.x, me.g.position.z);
  setFlag(byId('hud'), 'on', true);
  game.hud.say('The heart-eyes Chog stuffed {a} and {b} into its sack. Fight!', {
    a: me,
    b: foe,
    kind: 'arena',
  });
  me.free = foe.free = true;
  await tw.wait(0.5);
  alive();
}

async function meddleTurn(game: Game, alive: Alive): Promise<void> {
  const { me, foe } = sides(game);
  const button = byId<HTMLButtonElement>('meddle');
  game.match.meddleQueued = false;
  button.disabled = true;
  await arenaEvent(game);
  alive();
  button.disabled = false;
  game.cam.follow();
  me.free = foe.free = true;
}

/** A stuck fighter loses its turn; after two turns it peels free. */
async function stuckTurn(game: Game, a: Fighter, alive: Alive): Promise<void> {
  a.stuck++;
  if (a.stuck > 2) {
    a.stuck = 0;
    a.u.gumMask.value = 0;
    game.hud.say(pick(LINES.unstick), { a });
    runTo(game, a, a.g.position.x - 1.2, a.g.position.z + 0.8, 0.3);
    return;
  }
  game.hud.say(pick(LINES.stuck), { a });
  a.setPose('flail', 10);
  await game.tw.wait(0.5);
  alive();
  a.setPose('guard', 8);
}

function clearMoveChoice(me: Fighter): void {
  me.nextMove = null;
  byId('moves')
    .querySelectorAll<HTMLElement>('[data-k]')
    .forEach((x) => setFlag(x, 'on', false));
}

async function attackTurn(game: Game, a: Fighter, d: Fighter, alive: Alive): Promise<void> {
  const { me } = sides(game);
  const chosen = a === me && me.nextMove ? (me.nextMove as keyof typeof MOVES) : null;
  let k = chosen ?? pick(movesOf(a));
  if (k === 'dive' && Math.random() < 0.5 && !chosen) k = 'jab';
  if (a === me) clearMoveChoice(me);
  a.free = false;
  d.free = false;
  a.walking = d.walking = 0;
  await MOVES[k].fn(game, a, d);
  alive();
  if (k === 'dive') game.hud.chip('cHat', true);
  if (d.hp > 0 && !d.stuck && Math.random() < 0.25) {
    await counterPunch(game, d, a);
    alive();
    a.setPose('guard', 9);
    d.setPose('guard', 9);
  }
}

/** Non-stop exchanges until somebody drops, with the giant meddling now and then. */
async function brawl(game: Game, alive: Alive): Promise<void> {
  const { me, foe } = sides(game);
  let last: Fighter | null = null;
  let sinceArena = 0;
  while (me.hp > 0 && foe.hp > 0) {
    if (game.match.meddleQueued || (sinceArena > 3 && Math.random() < 0.3)) {
      sinceArena = 0;
      await meddleTurn(game, alive);
      if (me.hp <= 0 || foe.hp <= 0) break;
      await game.tw.wait(0.25);
      alive();
      continue;
    }
    sinceArena++;
    const a: Fighter = Math.random() < (last === me ? 0.35 : 0.65) ? me : foe;
    const d = a === me ? foe : me;
    const wasStuck = a.stuck > 0;
    if (wasStuck) {
      await stuckTurn(game, a, alive);
    } else {
      await attackTurn(game, a, d, alive);
      a.free = d.free = true;
    }
    last = a;
    await game.tw.wait(wasStuck ? 0.2 : 0.15 + Math.random() * 0.35);
    alive();
  }
}

/** KO, the paw plucks the loser out, and the winner celebrates on the bucket hat. */
async function finale(game: Game, alive: Alive): Promise<void> {
  const { me, foe } = sides(game);
  const { tw, hud, cam, world } = game;
  const winner = me.hp > 0 ? me : foe;
  const loser = winner === me ? foe : me;
  winner.free = loser.free = false;
  loser.face('ko');
  loser.setPose('limp', 8);
  loser.u.gumMask.value = 0;
  loser.stuck = 0;
  hud.say(pick(LINES.ko), { b: loser, kind: 'ko' });
  await tw.tween(0.4, (e) => (loser.body.rotation.x = -e * 0.35));
  alive();
  await tw.wait(0.5);
  alive();
  await pluck(game, loser, alive);
  const { group, topY } = world.platform;
  await hop(game, winner, group.position.x + 0.6, topY, group.position.z + 0.6, 0.7, 3);
  alive();
  faceTo(winner, 6, 14);
  winner.setPose('victory', 8);
  cam.shot([0.2, 2.2, 4.6], [-3.0, 3.9, -2.4], 0.9);
  hud.banner(winner.name.toUpperCase() + ' WINS', true);
  hud.say('The heart-eyes Chog plucks {b} out of the sack. {a} wins!', {
    a: winner,
    b: loser,
    kind: 'win',
  });
  await tw.wait(3.2);
  alive();
  hud.bannerOff();
}

async function pluck(game: Game, loser: Fighter, alive: Alive): Promise<void> {
  const { tw, hud, cam, world } = game;
  const { paw } = world;
  hud.chip('cHand', true);
  hud.banner('PLUCKED.');
  const bp = loser.g.position.clone();
  cam.shot([bp.x + 2.0, 1.9, Math.min(6.6, bp.z + 5.6)], [bp.x, 3.4, bp.z], 0.7);
  paw.g.visible = true;
  paw.grip(0);
  paw.g.position.set(bp.x, RIM_Y + 18, bp.z);
  await tw.tween(
    0.9,
    (e) => (paw.g.position.y = RIM_Y + 18 + (bp.y + 2.1 - RIM_Y - 18) * e),
    ease.out,
  );
  alive();
  await tw.tween(0.2, (e) => paw.grip(e));
  alive();
  loser.body.rotation.x = 0;
  loser.setPose('limp', 10);
  paw.g.attach(loser.g);
  await tw.tween(
    1.3,
    (e) => (paw.g.position.y = bp.y + 2.1 + (RIM_Y + 26 - bp.y - 2.1) * e),
    ease.in,
  );
  alive();
  paw.g.visible = false;
  game.scene.attach(loser.g);
  loser.g.visible = false;
  hud.bannerOff();
}

/** One full fight. Rejects with CANCELLED if a newer fight (or a fighter change) supersedes it. */
export async function fight(game: Game): Promise<void> {
  const token = game.tw.token();
  const alive: Alive = () => {
    if (token !== game.tw.token()) throw CANCELLED;
  };
  resetStage(game);
  await intro(game, alive);
  await brawl(game, alive);
  await finale(game, alive);
}
