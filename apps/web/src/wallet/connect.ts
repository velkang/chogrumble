// Glue between the wallet module (loaded on demand) and the UI store.
import { statsFromTraits } from '@chog/sim';
import { setWallet, ui } from '../ui/store';
import type { Candidate } from '../ui/store';

type ChogData = typeof import('@chog/content/chogs');
type WalletModule = typeof import('./wallet');

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

function toCandidate(data: ChogData, tokenId: number): Candidate | null {
  const c = data.chogByToken(tokenId);
  if (!c) return null;
  const special = statsFromTraits(c.traits).special;
  return { tokenId, name: c.name, special: special === 'none' ? 'dive' : special };
}

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function createWalletConnect(chogData: Promise<ChogData>) {
  let mod: Promise<WalletModule> | null = null;
  let wallet: ReturnType<WalletModule['createWallet']> | null = null;

  const showChogs = async (address: string | null) => {
    if (!address) {
      setWallet({ status: 'off', address: null, mine: [], message: null });
      return;
    }
    setWallet({ status: 'checking', address, message: null });
    try {
      const [data, m] = await Promise.all([chogData, mod!]);
      const owned = await m.ownedNow(address, data.tokensOwnedBy(address));
      const mine = owned.flatMap((id) => toCandidate(data, id) ?? []);
      setWallet({
        status: 'ready',
        mine,
        message: mine.length ? null : 'No Chogs found in this wallet. Bought one recently? Enter its number below.',
      });
    } catch (e) {
      setWallet({ status: 'error', message: `Could not check your Chogs: ${reason(e)}` });
    }
  };

  const connect = async () => {
    if (!projectId) {
      setWallet({ status: 'error', message: 'Wallet login is not set up yet (VITE_REOWN_PROJECT_ID is missing).' });
      return;
    }
    setWallet({ status: 'connecting', message: null });
    try {
      mod ??= import('./wallet');
      const m = await mod;
      if (!wallet) {
        wallet = m.createWallet(projectId);
        wallet.onAccount((a) => void showChogs(a));
      }
      await wallet.open();
      if (!ui.getState().wallet.address) setWallet({ status: 'off' });
    } catch (e) {
      setWallet({ status: 'error', message: `Could not open the wallet: ${reason(e)}` });
    }
  };

  const checkToken = async (tokenId: number) => {
    const { address, mine } = ui.getState().wallet;
    if (!address || !mod) return;
    if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 1969) {
      setWallet({ message: 'Chog token numbers go from 1 to 1969.' });
      return;
    }
    if (mine.some((c) => c.tokenId === tokenId)) return;
    try {
      const [data, m] = await Promise.all([chogData, mod]);
      const owned = await m.ownedNow(address, [tokenId]);
      const c = owned.length ? toCandidate(data, tokenId) : null;
      if (!c) setWallet({ message: `Chog #${tokenId} isn't in this wallet.` });
      else setWallet({ mine: [...mine, c], message: null });
    } catch (e) {
      setWallet({ message: `Could not check that Chog: ${reason(e)}` });
    }
  };

  return {
    connect: () => void connect(),
    disconnect: () => void wallet?.disconnect(),
    checkToken: (id: number) => void checkToken(id),
  };
}
