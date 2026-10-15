import type { FighterView } from '../playback/fold';

/** "CHOG #1462" reads as "#1462" in tight spots. */
export const shortName = (name: string) => name.replace(/^CHOG\s*/i, '');

export const portraitUrl = (f: Pick<FighterView, 'tokenId'>) =>
  f.tokenId === null ? null : `${import.meta.env.BASE_URL}portraits/${f.tokenId}.webp`;

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Damage is shown ×10 ("-50" instead of "-5"); purely presentation, the sim works in 100-HP units. */
export const DAMAGE_DISPLAY_SCALE = 10;
export const shownDamage = (n: number) => n * DAMAGE_DISPLAY_SCALE;
