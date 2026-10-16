// Character selection, wallet and app shell state. Duel snapshots live in duel/store.ts.
import { createStore, useStore } from 'zustand';

export type Phase = 'loading' | 'ready' | 'playing' | 'results' | 'error';
/** A Chog you can pick to play as. */
export interface Candidate {
  tokenId: number;
  name: string;
  /** The trait special, e.g. 'laser', or 'dive' for Chogs without one. */
  special: string;
}

export type WalletStatus = 'off' | 'connecting' | 'checking' | 'ready' | 'error';

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  /** The connected wallet's Chogs, verified on-chain. */
  mine: readonly Candidate[];
  message: string | null;
}

export interface UiState {
  phase: Phase;
  error: string | null;
  /** Chogs offered on the start screen. */
  candidates: readonly Candidate[];
  /** The Chog you picked, kept for "play again". */
  chosen: number | null;
  /** Set by the app shell: starts a duel playing as this token (null = first candidate). */
  play: (tokenId: number | null) => void;
  /** Set by the app shell: offers a fresh set of Chogs to pick from. */
  reroll: () => void;
  muted: boolean;
  toggleMute: () => void;
  wallet: WalletState;
  connectWallet: () => void;
  disconnectWallet: () => void;
  /** Checks that the connected wallet owns this token, and adds it to "Your Chogs". */
  checkToken: (tokenId: number) => void;
}

const initial: UiState = {
  phase: 'loading',
  error: null,
  candidates: [],
  chosen: null,
  play: () => {},
  reroll: () => {},
  muted: false,
  toggleMute: () => {},
  wallet: { status: 'off', address: null, mine: [], message: null },
  connectWallet: () => {},
  disconnectWallet: () => {},
  checkToken: () => {},
};

export const ui = createStore<UiState>()(() => initial);

export function useUi<T>(select: (s: UiState) => T): T {
  return useStore(ui, select);
}

export function failWith(message: string): void {
  ui.setState({ phase: 'error', error: message });
}

export function setWallet(changes: Partial<WalletState>): void {
  ui.setState((s) => ({ wallet: { ...s.wallet, ...changes } }));
}
