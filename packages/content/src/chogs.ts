// Every Chog Genesis token, baked from the chain and IPFS by scripts/bake-chog-metadata.mjs.
import { z } from 'zod';
import { statsFromTraits } from '@chog/sim';
import type { FighterSpec } from '@chog/sim';
import raw from '../data/chogs.json' with { type: 'json' };

const ChogSchema = z.object({
  tokenId: z.number().int().positive(),
  file: z.number().int().positive(),
  name: z.string().min(1),
  image: z.string().startsWith('ipfs://'),
  traits: z.record(z.string(), z.string()),
});

const FileSchema = z.object({
  contract: z.string().regex(/^0x[0-9a-f]{40}$/),
  chainId: z.literal(143),
  supply: z.number().int().positive(),
  chogs: z.array(ChogSchema),
});

export type Chog = z.infer<typeof ChogSchema>;

const parsed = FileSchema.parse(raw);

export const CHOG_CONTRACT = parsed.contract;
export const CHOGS: readonly Chog[] = parsed.chogs;
const byToken = new Map(CHOGS.map((c) => [c.tokenId, c]));

export function chogByToken(tokenId: number): Chog | undefined {
  return byToken.get(tokenId);
}

/** A sim fighter for this Chog. Display name is the metadata name, which follows the shuffled reveal. */
export function toFighter(c: Chog, opts: { house?: boolean } = {}): FighterSpec {
  return {
    id: `token:${c.tokenId}`,
    name: c.name,
    tokenId: c.tokenId,
    traits: c.traits,
    ...(opts.house ? { house: true } : {}),
  };
}

/** How much of the collection the trait tables touch; used to track trait-to-gameplay coverage. */
export function traitCoverage(): {
  total: number;
  withSpecial: number;
  withAnyMod: number;
  mappedValues: number;
} {
  const base = statsFromTraits({});
  const changes = (traits: Record<string, string>) =>
    JSON.stringify(statsFromTraits(traits)) !== JSON.stringify(base);
  const values = new Set(
    CHOGS.flatMap((c) => Object.entries(c.traits).map(([k, v]) => `${k}=${v}`)),
  );
  const mappedValues = [...values].filter((kv) => {
    const [k, v] = kv.split('=') as [string, string];
    return changes({ [k]: v });
  }).length;
  return {
    total: CHOGS.length,
    withSpecial: CHOGS.filter((c) => statsFromTraits(c.traits).special !== 'none').length,
    withAnyMod: CHOGS.filter((c) => changes(c.traits)).length,
    mappedValues,
  };
}
