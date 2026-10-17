import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import { DUEL_MOVES, DUEL_RULES } from '@chog/sim';
import type { DuelEvent, DuelFighter, DuelState, FighterSpec } from '@chog/sim';
import type { Models } from '../engine/assets';
import type { QualitySettings } from '../engine/quality';
import type { Sound } from '../audio/sound';
import type { Fx } from '../fx/fx';
import type { PoseName } from '../chog/poses';
import { updateChog, applyPose } from '../chog/animate';
import { sampleAttackPose, combatYaw } from './attack-pose';
import type { Chog } from '../chog/chog';
import { singleMaterial } from '../chog/chog';
import { FIGHTER_SHAPE } from '../chog/fighter-shape';
import { dressFighter } from '../director/looks';
import { makeBlobShadow } from '../director/blob-shadow';
import type { Dressed } from '../director/looks';

const RAINBOW = [0xff4d4d, 0xff9f1c, 0xffe94d, 0x4dff88, 0x4dc3ff, 0xb04dff];
const COLORS = { laser: 0xff4fb0, bubble: 0xff95d1, coin: 0xffd23f };
function pose(f: DuelFighter, s: DuelState, side: number): PoseName {
  if (f.hp === 0) return 'limp';
  if (s.phase === 'roundResult' || s.phase === 'matchResult') return s.roundWinner === side ? 'victory' : 'guard';
  if (f.stun) return 'hurt';
  const a = f.attack;
  if (!a) return f.y > 0 ? 'flail' : f.crouching ? 'crouch' : 'guard';
  return 'guard';
}

// Correct only the visual body height; combat roots and trajectories remain in the simulation.
const sole = new Vector3();
function groundBody(c: Chog, grounded: boolean): void {
  c.body.position.y = FIGHTER_SHAPE.lift;
  if (!grounded) return;
  c.g.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const shin of [c.B.shinL, c.B.shinR]) {
    sole.set(0, -FIGHTER_SHAPE.soleLength, 0.045);
    c.body.worldToLocal(shin.localToWorld(sole));
    lowest = Math.min(lowest, sole.y);
  }
  c.body.position.y = -lowest * c.body.scale.y;
}

/** Positions always come from interpolated sim snapshots, never from presentation tweens. */
export function createDuelPresentation(scene: Scene, camera: PerspectiveCamera, models: Models, sound: Sound, fx: Fx) {
  let cast: Dressed[] = [];
  const projectiles = new Map<number, Mesh<SphereGeometry, MeshBasicMaterial>>();
  const projectileGeometry = new SphereGeometry(0.22, 16, 12);
  const projectileMaterials = Object.fromEntries(Object.entries(COLORS).map(([key, color]) => [key, new MeshBasicMaterial({ color, fog: false })])) as Record<keyof typeof COLORS, MeshBasicMaterial>;
  const bursts = [0, 1].map(() => RAINBOW.map((color) => {
    const mesh = new Mesh(projectileGeometry, new MeshBasicMaterial({ color, fog: false }));
    mesh.visible = false; scene.add(mesh); return mesh;
  }));
  let cut = true;
  const rightHand = [false, false];
  const facingAngle = (f: DuelFighter, hand: boolean) => combatYaw(f.facing, f.stun || f.hp === 0 ? null : f.attack, hand);
  const place = (c: Chog, f: DuelFighter, hand: boolean) => { c.g.position.set(f.x, f.y + 0.09, 0); c.g.rotation.y = facingAngle(f, hand); };
  const pendingHits: { event: Extract<DuelEvent, { type: 'hit' }>; at: Vector3 }[] = [];
  function clearProjectiles() { for (const m of projectiles.values()) scene.remove(m); projectiles.clear(); }
  function disposeCast() {
    cast.forEach((d) => { scene.remove(d.chog.g); singleMaterial(d.chog.mesh).dispose(); d.chog.mesh.skeleton.dispose(); d.dispose(); });
    cast = []; pendingHits.length = 0; rightHand.fill(false); clearProjectiles(); bursts.flat().forEach((m) => { m.visible = false; });
  }
  return {
    play(roster: readonly [FighterSpec, FighterSpec], settings: QualitySettings) {
      disposeCast(); cut = true;
      cast = roster.map((f) => {
        const d = dressFighter(f, models, 2.15);
        const c = d.chog;
        const shadow = makeBlobShadow(); shadow.name = 'duel-shadow'; c.g.add(shadow);
        c.bob = 0.5; c.setPose('guard', 25); scene.add(c.g);
        return d;
      });
      this.setQuality(settings);
    },
    clear: disposeCast,
    setQuality(settings: QualitySettings) {
      for (const { chog: c } of cast) {
        c.mesh.castShadow = settings.fighterShadows;
        const shadow = c.g.getObjectByName('duel-shadow');
        if (shadow) shadow.visible = !settings.fighterShadows;
        c.hat?.traverse((o) => { o.castShadow = settings.fighterShadows; });
      }
    },
    events(events: readonly DuelEvent[], state: DuelState) {
      for (const e of events) {
        if (e.type === 'hit') {
          const f = state.fighters[e.target];
          const at = new Vector3(f.x, f.y + 1.3, 0.25);
          const attacker = cast[e.side]?.chog;
          if (attacker && ['light', 'heavy', 'sweep', 'airLight', 'airHeavy'].includes(e.move)) {
            place(attacker, { ...state.fighters[e.side], stun: 0, hp: 1, attack: { move: e.move, frame: DUEL_MOVES[e.move].startup, chain: 1, connected: true, resolved: true } }, rightHand[e.side]!);
            applyPose(attacker, sampleAttackPose({ move: e.move, frame: DUEL_MOVES[e.move].startup }, rightHand[e.side]!));
            if (state.fighters[e.side].crouching || e.move === 'sweep') attacker.body.scale.y = 0.74;
            groundBody(attacker, state.fighters[e.side].y === 0);
            attacker.g.updateMatrixWorld(true);
            const kick = e.move === 'heavy' || e.move === 'airHeavy' || e.move === 'sweep';
            const limb = kick ? attacker.B.shinR : rightHand[e.side] ? attacker.B.forearmR : attacker.B.forearmL;
            at.copy(limb.localToWorld(kick ? new Vector3(0, -FIGHTER_SHAPE.soleLength, 0.045) : new Vector3((rightHand[e.side] ? -1 : 1) * FIGHTER_SHAPE.fistLength, 0, 0)));
            at.x = Math.max(f.x - 0.55, Math.min(f.x + 0.55, at.x));
            at.y = Math.max(f.y + 0.1, Math.min(f.y + (f.crouching ? 1.15 : 2.15), at.y));
            at.z = Math.max(0.1, Math.min(0.45, at.z));
          }
          pendingHits.push({ event: e, at });
        } else if (e.type === 'attack') {
          if (e.move === 'light' || e.move === 'airLight') rightHand[e.side] = !rightHand[e.side];
          if (e.move === 'laser') sound.zap();
          else if (e.move === 'bubble' || e.move === 'puke') sound.splat();
          else sound.whoosh();
        } else if (e.type === 'roundEnd') sound.knockOut();
        else if (e.type === 'matchEnd') { sound.fanfare(); sound.music(false); }
        else if (e.type === 'fight' || e.type === 'round') sound.round();
      }
    },
    render(previous: DuelState, state: DuelState, alpha: number, dt: number) {
      for (const [side, dressed] of cast.entries()) {
        const f = state.fighters[side]!;
        const p = previous.fighters[side]!;
        const c = dressed.chog;
        const sameRound = previous.round === state.round && previous.phase !== 'roundResult';
        const x = sameRound ? p.x + (f.x - p.x) * alpha : f.x;
        const y = sameRound ? p.y + (f.y - p.y) * alpha : f.y;
        c.g.position.set(x, y + 0.09, 0);
        const shadow = c.g.getObjectByName('duel-shadow');
        if (shadow) shadow.position.y = (0.06 - c.g.position.y) / c.g.scale.y;
        c.g.rotation.y = facingAngle(f, rightHand[side]!);
        c.walking = !f.attack && !f.stun && !f.blocking && !f.blockstun && f.y === 0 ? Math.min(0.65, Math.abs(f.x - p.x) / DUEL_RULES.walkSpeed * 0.65) : 0;
        c.setPose(pose(f, state, side), f.attack || f.stun ? 32 : 18);
        c.face(f.hp === 0 ? 'ko' : f.stun ? 'hurt' : f.attack?.move === 'laser' ? 'laser' : 'normal');
        c.body.rotation.z = f.hp === 0 ? -f.facing * Math.PI / 2 : 0;
        if (f.attack && f.hp > 0 && !f.stun) {
          const frame = f.attack.frame + (state.paused ? 0 : alpha);
          applyPose(c, sampleAttackPose({ ...f.attack, frame }, rightHand[side]!));
        } else updateChog(c, dt);
        if (f.crouching || f.attack?.move === 'sweep') c.body.scale.y = 0.74;
        groundBody(c, f.y === 0 && f.hp > 0);
        const attack = f.attack;
        const spraying = attack?.move === 'puke' && attack.frame >= DUEL_MOVES.puke.startup && attack.frame < DUEL_MOVES.puke.startup + DUEL_MOVES.puke.active;
        bursts[side]!.forEach((mesh, i) => {
          mesh.visible = spraying;
          mesh.position.set(x + f.facing * (0.8 + i * 0.27), y + 1.25 - i * 0.07, 0.05);
          mesh.scale.set(1.5, 0.65 + i * 0.13, 0.7);
        });
      }
      for (const { event: e, at } of pendingHits.splice(0)) {
        if (e.blocked) { sound.block(); fx.puff(at, 3, 0.7); }
        else { sound.hit(e.damage >= 12); fx.impact(at, e.damage >= 12); }
      }
      const live = new Set(state.projectiles.map((p) => p.id));
      for (const [id, mesh] of projectiles) if (!live.has(id)) { scene.remove(mesh); projectiles.delete(id); }
      for (const p of state.projectiles) {
        let mesh = projectiles.get(p.id);
        if (!mesh) { mesh = new Mesh(projectileGeometry, projectileMaterials[p.move]); projectiles.set(p.id, mesh); scene.add(mesh); }
        const old = previous.projectiles.find((o) => o.id === p.id);
        mesh.position.set(old ? old.x + (p.x - old.x) * alpha : p.x, 1.0, 0.15);
        mesh.scale.set(p.move === 'laser' ? 2 : 1, p.move === 'coin' ? 0.75 : 1, p.move === 'coin' ? 0.3 : 1);
        mesh.rotation.y += dt * 8;
      }
      const [a, b] = state.fighters;
      const mid = (a.x + b.x) / 2;
      const top = Math.max(a.y, b.y) + 2.4;
      const aspect = camera.aspect;
      const fov = camera.fov * Math.PI / 360;
      // Reserve the top for health bars and bottom for touch controls.
      const distance = Math.max(7.5, (Math.abs(a.x - b.x) / 2 + 2) / (Math.tan(fov) * aspect * 0.86), (top + 1.6) / (2 * Math.tan(fov) * 0.64));
      const target = new Vector3(mid * 0.65, 2.3 + top * 0.08, distance);
      camera.position.lerp(target, cut ? 1 : 1 - Math.exp(-7 * dt)); cut = false;
      if (fx.state.shakeAmt > 0.001) {
        camera.position.x += (Math.random() - 0.5) * fx.state.shakeAmt * 0.3;
        fx.state.shakeAmt *= Math.pow(0.002, dt);
      }
      camera.lookAt(mid * 0.65, 1.9 + top * 0.08, 0);
    },
  };
}
