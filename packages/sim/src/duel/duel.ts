import { createRng } from '../rng';
import { statsFromTraits } from '../stats';
import type { FighterSpec } from '../types';
import { createDuelAi } from './ai';
import { DUEL_MOVES, DUEL_RULES as R } from './rules';
import type { DuelMove, MoveData } from './rules';
import type { Duel, DuelEvent, DuelFighter, DuelInput, DuelSide, DuelState } from './types';

const sides = [0, 1] as const;
const other = (side: DuelSide): DuelSide => side === 0 ? 1 : 0;
const clampX = (x: number) => Math.max(-R.stageEdge, Math.min(R.stageEdge, x));
const clone = (s: DuelState): DuelState => ({ ...s, wins: [...s.wins], fighters: s.fighters.map((f) => ({ ...f, attack: f.attack ? { ...f.attack } : null })) as DuelState['fighters'], projectiles: s.projectiles.map((p) => ({ ...p })) });
const height = (f: DuelFighter) => f.crouching ? R.crouchHeight : R.bodyHeight;

function fighter(spec: FighterSpec, side: DuelSide): DuelFighter {
  const special = statsFromTraits(spec.traits).special;
  return { id: spec.id, x: side === 0 ? -2.6 : 2.6, y: 0, vx: 0, vy: 0, facing: side === 0 ? 1 : -1,
    hp: R.health, meter: 0, crouching: false, blocking: false, stun: 0, blockstun: 0,
    attack: null, special: special === 'none' ? 'dive' : special, combo: 0, comboUntil: 0 };
}

/** Local 1v1 simulation. Omit opponent input to use the seeded AI; pass {} for a stationary opponent. */
export function createDuel(opts: { roster: readonly [FighterSpec, FighterSpec]; seed: string }): Duel {
  if (opts.roster.length !== 2 || opts.roster[0].id === opts.roster[1].id) throw new Error('A duel needs two distinct fighters');
  const roster = opts.roster.map((f) => ({ ...f, traits: { ...f.traits } })) as [FighterSpec, FighterSpec];
  const ai = createDuelAi(createRng(`duel:${opts.seed}`));
  const s: DuelState = { frame: 0, round: 1, phase: 'intro', phaseFrame: 0, remaining: R.roundFrames,
    fighters: [fighter(roster[0], 0), fighter(roster[1], 1)], projectiles: [], wins: [0, 0], roundWinner: null, winner: null, finish: null, paused: false };
  let projectileId = 0;
  let events: DuelEvent[] = [];
  type Buffered = { move: 'light' | 'heavy' | 'special'; until: number };
  let buffers: [Buffered | null, Buffered | null] = [null, null];

  function start(side: DuelSide, move: DuelMove, chain = 1) {
    const f = s.fighters[side];
    if (DUEL_MOVES[move].special) f.meter -= R.specialCost;
    f.attack = { move, frame: 0, connected: false, resolved: false, chain };
    f.blocking = false;
    events.push({ type: 'attack', side, move });
  }

  function control(side: DuelSide, input: DuelInput) {
    const f = s.fighters[side];
    const press = input.special ? 'special' : input.light ? 'light' : input.heavy ? 'heavy' : null;
    if (press) buffers[side] = { move: press, until: s.frame + R.inputBufferFrames };
    const buffered = buffers[side];
    if (buffered && buffered.until < s.frame) buffers[side] = null;
    if (f.hp === 0 || f.stun > 0) { f.blocking = false; return; }
    if (f.blockstun > 0) { f.blocking = f.y === 0 && !!input.block; return; }
    if (!f.attack) f.facing = s.fighters[other(side)].x >= f.x ? 1 : -1;
    f.crouching = f.y === 0 && !!input.crouch;
    if (f.attack) {
      const a = f.attack;
      const follow = buffers[side];
      if (a.move === 'light' && a.connected && a.frame >= DUEL_MOVES.light.startup && follow &&
          ((a.chain === 1 && follow.move === 'light') || (a.chain === 2 && follow.move === 'heavy'))) {
        start(side, follow.move === 'heavy' ? 'heavy' : 'light', a.chain + 1);
        buffers[side] = null;
      }
      // Air direction remains responsive, but attacks never walk automatically toward targets.
      if (f.y > 0) f.x = clampX(f.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * R.walkSpeed);
      return;
    }
    f.blocking = f.y === 0 && !!input.block;
    if (input.jump && f.y === 0 && !f.blocking) { f.vy = R.jumpSpeed; f.y = 0.001; f.crouching = false; }
    const b = buffers[side];
    if (b) {
      let move: DuelMove | null;
      if (b.move === 'special') move = f.y === 0 && f.meter >= R.specialCost ? f.special : null;
      else move = f.y > 0 ? (b.move === 'light' ? 'airLight' : 'airHeavy') : b.move === 'heavy' && f.crouching ? 'sweep' : b.move;
      if (move && !f.blocking) { start(side, move); buffers[side] = null; }
    }
    if (!f.attack && !f.blocking && !f.crouching) f.x = clampX(f.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * R.walkSpeed);
  }

  function physics() {
    for (const f of s.fighters) {
      const attack = f.attack;
      if (attack?.move === 'dive' && !attack.resolved && attack.frame + 1 >= DUEL_MOVES.dive.startup && attack.frame + 1 < DUEL_MOVES.dive.startup + DUEL_MOVES.dive.active) f.x = clampX(f.x + f.facing * 0.16);
      f.x = clampX(f.x + f.vx);
      f.vx *= 0.75;
      if (Math.abs(f.vx) < 0.001) f.vx = 0;
      if (f.y > 0 || f.vy !== 0) {
        f.y += f.vy;
        f.vy -= R.gravity;
        if (f.y <= 0) {
          f.y = 0; f.vy = 0;
          if (f.attack?.move === 'airLight' || f.attack?.move === 'airHeavy') f.attack = null;
        }
      }
    }
    const [a, b] = s.fighters;
    if (a.y === 0 && b.y === 0) {
      const d = b.x - a.x;
      const overlap = R.bodyWidth - Math.abs(d);
      if (overlap > 0) {
        const sign = d === 0 ? a.facing : Math.sign(d);
        a.x = clampX(a.x - sign * overlap / 2);
        b.x = clampX(b.x + sign * overlap / 2);
        // Transfer any displacement that was stopped by a corner to the other fighter.
        const left = R.bodyWidth - Math.abs(b.x - a.x);
        if (left > 0) {
          if (Math.abs(a.x) === R.stageEdge) b.x = clampX(b.x + sign * left);
          else a.x = clampX(a.x - sign * left);
        }
      }
    }
  }

  function contact(side: DuelSide, move: DuelMove, data: MoveData, fromX: number, bottom: number, top: number, facing: -1 | 1, reach: number): 'hit' | 'blocked' | null {
    const a = s.fighters[side];
    const target = other(side);
    const d = s.fighters[target];
    const x0 = Math.min(fromX, fromX + facing * reach);
    const x1 = Math.max(fromX, fromX + facing * reach);
    if (x1 < d.x - R.bodyWidth / 2 || x0 > d.x + R.bodyWidth / 2 || top < d.y || bottom > d.y + height(d)) return null;
    const front = (fromX - d.x) * d.facing >= 0;
    const blocked = d.y === 0 && d.blocking && d.stun === 0 && front &&
      (data.guard === 'either' || (data.guard === 'low' ? d.crouching : !d.crouching));
    if (blocked) {
      d.blockstun = R.blockstun;
      d.vx = facing * 0.035;
    } else {
      d.hp = Math.max(0, d.hp - data.damage);
      d.stun = data.stun;
      d.blockstun = 0;
      d.blocking = false;
      d.attack = null;
      buffers[target] = null;
      d.vx = facing * data.push;
      a.combo = s.frame < a.comboUntil ? a.combo + 1 : 1;
      a.comboUntil = s.frame + data.stun;
      if (!data.special) {
        a.meter = Math.min(R.meterMax, a.meter + R.hitMeter);
        d.meter = Math.min(R.meterMax, d.meter + R.hurtMeter);
      }
    }
    events.push({ type: 'hit', side, target, move, blocked, damage: blocked ? 0 : data.damage, combo: blocked ? 0 : a.combo });
    return blocked ? 'blocked' : 'hit';
  }

  function combat() {
    // Capture both attacks before resolving hits, so equal-frame trades/double KOs are possible.
    const attacks = s.fighters.map((f) => f.attack ? { ...f.attack } : null);
    for (const side of sides) {
      const a = attacks[side];
      if (!a) continue;
      const f = s.fighters[side];
      const data = DUEL_MOVES[a.move];
      a.frame++;
      const active = a.frame >= data.startup && a.frame < data.startup + data.active;
      if (active && !a.resolved) {
        if (a.move === 'laser' || a.move === 'bubble' || a.move === 'coin') {
          s.projectiles.push({ id: ++projectileId, owner: side, move: a.move, x: f.x + f.facing * 0.7, y: 0, facing: f.facing });
          a.resolved = true;
        } else {
          const result = contact(side, a.move, data, f.x, f.y + data.bottom, f.y + data.top, f.facing, data.reach);
          if (result) { a.resolved = true; a.connected = result === 'hit'; }
        }
      }
      // A trade may have interrupted the live attack; never restore it after being hit.
      if (f.attack) f.attack = a.frame >= data.startup + data.active + data.recovery && a.move !== 'airLight' && a.move !== 'airHeavy' ? null : a;
    }
    s.projectiles = s.projectiles.filter((p) => {
      const data = DUEL_MOVES[p.move];
      const oldX = p.x;
      p.x += p.facing * data.projectileSpeed!;
      const hit = contact(p.owner, p.move, data, oldX - p.facing * data.reach / 2, data.bottom, data.top, p.facing, data.reach + data.projectileSpeed!);
      return !hit && Math.abs(p.x) < R.stageEdge + 1;
    });
  }

  function endRound() {
    const [a, b] = s.fighters;
    if (a.hp > 0 && b.hp > 0 && s.remaining > 0) return;
    const winner: DuelSide | null = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1;
    s.roundWinner = winner;
    s.finish = winner === null ? 'draw' : s.remaining === 0 ? 'timeout' : 'ko';
    if (winner !== null) s.wins[winner]++;
    s.phase = 'roundResult'; s.phaseFrame = 0;
    s.projectiles = []; buffers = [null, null];
    s.fighters.forEach((f) => { f.attack = null; f.blocking = false; f.crouching = false; });
    events.push({ type: 'roundEnd', winner });
  }

  return {
    roster,
    state: () => clone(s),
    pause() { s.paused = true; buffers = [null, null]; },
    resume() { s.paused = false; buffers = [null, null]; },
    step(player = {}, opponent) {
      events = [];
      if (s.paused || s.phase === 'matchResult') return { state: clone(s), events };
      s.frame++; s.phaseFrame++;
      if (s.phase === 'intro') {
        if (s.phaseFrame >= R.introFrames) { s.phase = 'fight'; s.phaseFrame = 0; events.push({ type: 'fight' }); }
      } else if (s.phase === 'roundResult') {
        physics();
        if (s.phaseFrame >= R.resultFrames) {
          const winner = sides.find((i) => s.wins[i] >= R.winsRequired);
          if (winner !== undefined) { s.phase = 'matchResult'; s.winner = winner; events.push({ type: 'matchEnd', winner }); }
          else {
            if (s.roundWinner !== null) s.round++;
            s.fighters = [fighter(roster[0], 0), fighter(roster[1], 1)];
            s.projectiles = []; s.remaining = R.roundFrames; s.phase = 'intro'; s.phaseFrame = 0;
            s.roundWinner = null; s.finish = null; ai.reset();
            events.push({ type: 'round', round: s.round });
          }
        }
      } else {
        s.remaining--;
        for (const f of s.fighters) { f.stun = Math.max(0, f.stun - 1); f.blockstun = Math.max(0, f.blockstun - 1); }
        const aiInput = opponent ?? ai.input(clone(s));
        control(0, player); control(1, aiInput);
        physics(); combat(); endRound();
      }
      return { state: clone(s), events };
    },
  };
}
