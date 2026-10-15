// NFT traits → a 3D look. Every trait value gets a specific look or a sensible fallback, and
// the fallbacks are reported so coverage can be tracked.
import { AURAS, BODIES, SKINS } from './body-tables';
import { EYES, MOUTHS } from './face-tables';
import { HEADS } from './head-tables';
import type { FurSpec, LookSpec } from './types';

type Traits = Readonly<Record<string, string>>;

/** Traits with no 3D meaning (or shown elsewhere, like Background in the 2D portrait). */
const PASSIVE: Readonly<Record<string, readonly string[] | 'any'>> = {
  Background: 'any',
  Tier: 'any',
  Naked: ['Yes', 'No'],
  Side: ['Left', 'Right'],
  Form: ['Chog', 'Skull'],
  Base: ['Origin', 'Skull', 'Radioactive'],
};

const DEFAULT_FUR: FurSpec = { color: null, finish: 'normal' };

function furOf(t: Traits): FurSpec {
  if (t['Base'] === 'Skull' || t['Form'] === 'Skull') return { color: 0xe8e2d0, finish: 'bone' };
  if (t['Base'] === 'Radioactive') return { color: 0x7dff6a, finish: 'radioactive' };
  return SKINS[t['Skin'] ?? ''] ?? DEFAULT_FUR;
}

function isMapped(type: string, value: string): boolean {
  const passive = PASSIVE[type];
  if (passive) return passive === 'any' || passive.includes(value);
  const table = { Eyes: EYES, Mouth: MOUTHS, Skin: SKINS, Body: BODIES, Head: HEADS, Aura: AURAS }[type];
  return table !== undefined && value in table;
}

/** Trait types that affect the look; anything else (unknown types) is ignored. */
const KNOWN_TYPES = new Set(['Eyes', 'Mouth', 'Skin', 'Body', 'Head', 'Aura', 'Accessory', ...Object.keys(PASSIVE)]);

export function lookOf(t: Traits): LookSpec {
  const unmapped = Object.entries(t)
    .filter(([type, value]) => KNOWN_TYPES.has(type) && !isMapped(type, value))
    .map(([type, value]) => `${type}=${value}`);
  const naked = t['Naked'] === 'Yes';
  const aura = AURAS[t['Aura'] ?? ''];
  return {
    eyes: EYES[t['Eyes'] ?? ''] ?? { family: 'round', tint: null },
    mouth: MOUTHS[t['Mouth'] ?? ''] ?? { family: 'smile', tint: null },
    fur: furOf(t),
    shirt: naked ? null : (BODIES[t['Body'] ?? ''] ?? null),
    head: HEADS[t['Head'] ?? ''] ?? null,
    aura: aura ?? (t['Base'] === 'Radioactive' ? 0x7dff6a : null),
    mirror: t['Side'] === 'Left',
    unmapped,
  };
}

export interface LookCoverage {
  total: number;
  fullyMapped: number;
  fullyMappedPct: number;
  /** Distinct "Type=Value" traits still using a fallback look. */
  unmappedValues: string[];
}

export function lookCoverage(all: readonly Traits[]): LookCoverage {
  const looks = all.map(lookOf);
  const fullyMapped = looks.filter((l) => l.unmapped.length === 0).length;
  return {
    total: all.length,
    fullyMapped,
    fullyMappedPct: (100 * fullyMapped) / Math.max(1, all.length),
    unmappedValues: [...new Set(looks.flatMap((l) => l.unmapped))].sort(),
  };
}
