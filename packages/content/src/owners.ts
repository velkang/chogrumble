// Who owned each Chog when the snapshot was taken (scripts/snapshot-owners.mjs). The contract can't
// list a wallet's tokens, so the game looks wallets up here and then re-checks ownership live.
import { z } from 'zod';
import raw from '../data/owners.json' with { type: 'json' };

const Snapshot = z.object({
  contract: z.string(),
  chainId: z.literal(143),
  block: z.number().int().positive(),
  owners: z.record(z.string(), z.string().regex(/^0x[0-9a-f]{40}$/)),
});

const snapshot = Snapshot.parse(raw);
export const OWNERS_BLOCK = snapshot.block;

const byOwner = new Map<string, number[]>();
for (const [id, owner] of Object.entries(snapshot.owners)) {
  byOwner.set(owner, [...(byOwner.get(owner) ?? []), Number(id)]);
}

export function ownerAtSnapshot(tokenId: number): string | undefined {
  return snapshot.owners[String(tokenId)];
}

/** Tokens the address held at snapshot time (lowest first). Ownership must still be checked live. */
export function tokensOwnedBy(address: string): number[] {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return [];
  return [...(byOwner.get(address.toLowerCase()) ?? [])].sort((a, b) => a - b);
}
