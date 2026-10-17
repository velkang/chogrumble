import { DUEL_MOVES } from '@chog/sim';
import type { DuelAttack } from '@chog/sim';
import { BONES, POSES } from '../chog/poses';
import type { Pose, PoseName, Vec3 } from '../chog/poses';

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const k = Math.max(0, Math.min(1, t));
  if (k === 0) return a;
  if (k === 1) return b;
  return Object.fromEntries(BONES.map((name) => [name, a[name].map((v, i) => v + (b[name][i]! - v) * k) as unknown as Vec3])) as unknown as Pose;
}
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Exact frame sampling: extension is complete on the first active frame, with no spring delay. */
export function sampleAttackPose(attack: Pick<DuelAttack, 'move' | 'frame'>, rightHand: boolean): Pose {
  const { move, frame } = attack;
  const data = DUEL_MOVES[move];
  let wind: PoseName; let strike: PoseName;
  switch (move) {
    case 'light': case 'airLight': wind = rightHand ? 'windR' : 'windL'; strike = move === 'airLight' ? rightHand ? 'airPunchR' : 'airPunchL' : rightHand ? 'punchR' : 'punchL'; break;
    case 'heavy': case 'airHeavy': wind = 'windK'; strike = move === 'airHeavy' ? 'airKick' : 'kick'; break;
    case 'sweep': wind = 'crouch'; strike = 'sweep'; break;
    case 'laser': wind = 'guard'; strike = 'laser'; break;
    case 'coin': wind = 'windR'; strike = 'punchR'; break;
    case 'bubble': case 'puke': wind = 'guard'; strike = 'blow'; break;
    case 'dive': wind = 'windK'; strike = 'nuts'; break;
  }
  const rest = move === 'sweep' ? POSES.crouch : move === 'airLight' || move === 'airHeavy' ? POSES.flail : POSES.guard;
  const anticipate = Math.max(1, Math.floor(data.startup * 0.4));
  if (frame < anticipate) return mixPose(rest, POSES[wind], smooth(Math.max(0, frame) / anticipate));
  if (frame < data.startup) return mixPose(POSES[wind], POSES[strike], smooth((frame - anticipate) / (data.startup - anticipate)));
  if (frame < data.startup + data.active) return POSES[strike];
  // Air attacks recover their limbs even though their attack lock lasts until landing.
  const recovery = Math.max(10, data.recovery);
  return mixPose(POSES[strike], rest, smooth(Math.min(1, (frame - data.startup - data.active) / recovery)));
}

/** Bring the striking shoulder/hip forward so either limb clears the large head in profile. */
export function combatYaw(facing: -1 | 1, attack: DuelAttack | null, rightHand: boolean): number {
  const neutral = facing * (Math.PI / 2 - 0.22);
  if (!attack || !['light', 'heavy', 'sweep', 'airLight', 'airHeavy'].includes(attack.move)) return neutral;
  const data = DUEL_MOVES[attack.move];
  const wind = Math.min(1, attack.frame / data.startup);
  const recovery = attack.frame <= data.startup + data.active ? 1 : Math.max(0, 1 - (attack.frame - data.startup - data.active) / Math.max(10, data.recovery));
  const right = attack.move === 'light' || attack.move === 'airLight' ? rightHand : true;
  return neutral + (facing * Math.PI / 2 + (right ? 0.32 : -0.32) - neutral) * Math.min(wind, recovery);
}
