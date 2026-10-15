// UI state, written by the director and the app shell, read by the React HUD.
import { createStore, useStore } from 'zustand';
import type { EliminationCause } from '@chog/sim';
import type { FeedLine } from '@chog/content';
import type { PlaybackState } from '../playback/fold';

export type Phase = 'loading' | 'ready' | 'playing' | 'results' | 'error';
export type BannerTone = 'pink' | 'gold';

export interface Banner {
  text: string;
  tone: BannerTone;
  /** Changes on every show, so the same text can pop again. */
  key: number;
}

export interface KnockOut {
  id: string;
  by: string | null;
  cause: EliminationCause;
  placement: number;
  at: number;
}

/** The player's Chog and button cooldowns (ms until ready). */
export interface PlayerHud {
  id: string;
  special: string;
  specialReadyIn: number;
  dodgeReadyIn: number;
}

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
  playback: PlaybackState | null;
  feed: readonly FeedLine[];
  knockOuts: readonly KnockOut[];
  banner: Banner | null;
  player: PlayerHud | null;
  /** Button presses waiting for the next match tick. */
  pressed: { special: boolean; dodge: boolean };
  /** Chogs offered on the start screen. */
  candidates: readonly Candidate[];
  /** The Chog you picked, kept for "play again". */
  chosen: number | null;
  /** Set by the app shell: starts a match playing as this token (null = just watch). */
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
  playback: null,
  feed: [],
  knockOuts: [],
  banner: null,
  player: null,
  pressed: { special: false, dodge: false },
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

let bannerKey = 0;
export function showBanner(text: string, tone: BannerTone = 'pink'): void {
  ui.setState({ banner: { text, tone, key: ++bannerKey } });
}
export function hideBanner(): void {
  ui.setState({ banner: null });
}
export function press(button: 'special' | 'dodge'): void {
  ui.setState((s) => ({ pressed: { ...s.pressed, [button]: true } }));
}

/** Hands pending presses to the match and clears them. */
export function takePresses(): { special: boolean; dodge: boolean } {
  const p = ui.getState().pressed;
  if (p.special || p.dodge) ui.setState({ pressed: { special: false, dodge: false } });
  return p;
}

export function failWith(message: string): void {
  ui.setState({ phase: 'error', error: message });
}

export function setWallet(changes: Partial<WalletState>): void {
  ui.setState((s) => ({ wallet: { ...s.wallet, ...changes } }));
}
