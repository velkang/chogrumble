import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import { DUEL_MOVES } from '@chog/sim';
import type { DuelEvent, DuelFighter, DuelState, FighterSpec } from '@chog/sim';
import type { Models } from '../engine/assets';
import type { QualitySettings } from '../engine/quality';
import type { Sound } from '../audio/sound';
import type { Fx } from '../fx/fx';
import type { PoseName } from '../chog/poses';
import { updateChog } from '../chog/animate';
import { singleMaterial } from '../chog/chog';
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
  const wind = a.frame < DUEL_MOVES[a.move].startup - 2;
  switch (a.move) {
    case 'light': return wind ? a.chain === 2 ? 'windL' : 'windR' : a.chain === 2 ? 'punchL' : 'punchR';
    case 'heavy': case 'airHeavy': return wind ? 'windK' : 'kick';
    case 'sweep': return wind ? 'crouch' : 'sweep';
    case 'airLight': return 'punchR';
    case 'laser': return 'laser';
    case 'coin': return 'punchR';
    case 'bubble': case 'puke': return 'blow';
    case 'dive': return wind ? 'windK' : 'nuts';
  }
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
  function clearProjectiles() { for (const m of projectiles.values()) scene.remove(m); projectiles.clear(); }
  function disposeCast() {
    cast.forEach((d) => { scene.remove(d.chog.g); singleMaterial(d.chog.mesh).dispose(); d.chog.mesh.skeleton.dispose(); d.dispose(); });
    cast = []; clearProjectiles(); bursts.flat().forEach((m) => { m.visible = false; });
  }
  return {
    play(roster: readonly [FighterSpec, FighterSpec], settings: QualitySettings) {
      disposeCast(); cut = true;
      cast = roster.map((f) => {
        const d = dressFighter(f, models, 2.4);
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
          const at = new Vector3(f.x, f.y + 1.3, 0.3);
          if (e.blocked) { sound.block(); fx.puff(at, 3, 0.7); }
          else { sound.hit(e.damage >= 12); fx.impact(at, e.damage >= 12); }
        } else if (e.type === 'attack') {
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
        c.g.rotation.y = f.facing * Math.PI / 2;
        c.walking = !f.attack && !f.stun && f.y === 0 && Math.abs(f.x - p.x) > 0.015 ? 0.65 : 0;
        c.setPose(pose(f, state, side), f.attack || f.stun ? 32 : 18);
        c.face(f.hp === 0 ? 'ko' : f.stun ? 'hurt' : f.attack?.move === 'laser' ? 'laser' : 'normal');
        c.body.rotation.z = f.hp === 0 ? -f.facing * Math.PI / 2 : 0;
        updateChog(c, dt);
        if (f.crouching) c.body.scale.y = 0.62;
        const attack = f.attack;
        const spraying = attack?.move === 'puke' && attack.frame >= DUEL_MOVES.puke.startup && attack.frame < DUEL_MOVES.puke.startup + DUEL_MOVES.puke.active;
        bursts[side]!.forEach((mesh, i) => {
          mesh.visible = spraying;
          mesh.position.set(x + f.facing * (0.8 + i * 0.27), y + 1.25 - i * 0.07, 0.05);
          mesh.scale.set(1.5, 0.65 + i * 0.13, 0.7);
        });
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
