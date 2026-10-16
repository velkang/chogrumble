import { createStore, useStore } from 'zustand';
import type { DuelState, FighterSpec } from '@chog/sim';
interface DuelUi {
  state: DuelState | null;
  roster: readonly [FighterSpec, FighterSpec] | null;
  combo: { side: 0 | 1; count: number; until: number } | null;
  pause: () => void;
  resume: () => void;
  menu: () => void;
}
export const duelUi = createStore<DuelUi>()(() => ({ state: null, roster: null, combo: null, pause: () => {}, resume: () => {}, menu: () => {} }));
export function useDuel<T>(select: (s: DuelUi) => T): T { return useStore(duelUi, select); }
