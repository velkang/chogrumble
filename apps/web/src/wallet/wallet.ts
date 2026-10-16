// Wallet login with Reown AppKit on Monad, and live ownership checks with viem.
// Loaded lazily, only when someone taps "Use my Chog".
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { getAccount, watchAccount } from '@wagmi/core';
import { createPublicClient, http, parseAbi } from 'viem';
import { monad } from 'viem/chains';
import { CHOG_CONTRACT } from '@chog/content/chogs';

const OWNER_OF = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);
const client = createPublicClient({ chain: monad, transport: http() });

export interface Wallet {
  /** Opens the connect modal. */
  open(): Promise<void>;
  /** Calls back with the connected address (or null) now and on every change. */
  onAccount(cb: (address: string | null) => void): () => void;
  disconnect(): Promise<void>;
}

export function createWallet(projectId: string): Wallet {
  const adapter = new WagmiAdapter({ projectId, networks: [monad] });
  type AppKitOptions = Parameters<typeof createAppKit>[0];
  const modal = createAppKit({
    // Reown's own adapter type trips our exactOptionalPropertyTypes setting; it is the documented usage
    adapters: [adapter] as unknown as NonNullable<AppKitOptions['adapters']>,
    networks: [monad],
    defaultNetwork: monad,
    projectId,
    metadata: {
      name: 'Chog Sack Rumble',
      description: 'Two Chogs, one sack. A 1v1 arcade fighter.',
      url: location.origin,
      icons: [`${location.origin}/favicon.ico`],
    },
    features: { analytics: false, email: false, socials: false, swaps: false, onramp: false },
    themeMode: 'dark',
  });
  const config = adapter.wagmiConfig;
  return {
    open: () => modal.open().then(() => undefined),
    onAccount(cb) {
      cb(getAccount(config).address ?? null);
      return watchAccount(config, { onChange: (a) => cb(a.address ?? null) });
    },
    disconnect: () => modal.disconnect(),
  };
}

/** The tokens (of those given) that `address` owns right now, checked on-chain. */
export async function ownedNow(address: string, tokenIds: readonly number[]): Promise<number[]> {
  const owners = await Promise.all(
    tokenIds.map((id) =>
      client
        .readContract({ address: CHOG_CONTRACT as `0x${string}`, abi: OWNER_OF, functionName: 'ownerOf', args: [BigInt(id)] })
        .catch(() => null),
    ),
  );
  return tokenIds.filter((_, i) => owners[i]?.toLowerCase() === address.toLowerCase());
}
