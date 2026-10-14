// Win-rate statistics over many simulated matches, grouped by special, tier and trait value.
import { createRng, simulate, statsFromTraits } from '@chog/sim';
import { CHOGS, toFighter } from './chogs';

export interface GroupStat {
  group: string;
  appearances: number;
  wins: number;
  /** Wins per appearance minus the fair rate (1 / roster size), in percentage points. */
  edgePp: number;
}

export interface BalanceReport {
  matches: number;
  fairRatePct: number;
  groups: GroupStat[];
}

const ROSTER = 12;

/** Groups a Chog counts toward: its special, its tier, and each of its trait values. */
function groupsOf(traits: Readonly<Record<string, string>>): string[] {
  const special = statsFromTraits(traits).special;
  return [
    `special=${special}`,
    `tier=${traits['Tier'] ?? 'none'}`,
    ...Object.entries(traits).map(([k, v]) => `${k}=${v}`),
  ];
}

export function runBalance(matches: number, seed = 'balance'): BalanceReport {
  const rng = createRng(seed);
  const tally = new Map<string, { appearances: number; wins: number }>();
  for (let m = 0; m < matches; m++) {
    const picked = new Set<number>();
    while (picked.size < ROSTER) picked.add(rng.int(CHOGS.length));
    const roster = [...picked].map((i) => toFighter(CHOGS[i]!));
    const { winner } = simulate(roster, `${seed}:${m}`);
    for (const f of roster) {
      for (const g of groupsOf(f.traits)) {
        const t = tally.get(g) ?? { appearances: 0, wins: 0 };
        tally.set(g, { appearances: t.appearances + 1, wins: t.wins + (f.id === winner ? 1 : 0) });
      }
    }
  }
  const fair = 100 / ROSTER;
  const groups = [...tally].map(([group, t]) => ({
    group,
    ...t,
    edgePp: (100 * t.wins) / t.appearances - fair,
  }));
  return { matches, fairRatePct: fair, groups: groups.sort((a, b) => b.edgePp - a.edgePp) };
}
