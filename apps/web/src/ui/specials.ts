/** Button labels and icons for each special move. */
export const SPECIALS: Readonly<Record<string, { label: string; icon: string }>> = {
  laser: { label: 'Laser eyes', icon: '👀' },
  bubble: { label: 'Gum shot', icon: '🫧' },
  puke: { label: 'Rainbow puke', icon: '🌈' },
  coin: { label: 'Coin shot', icon: '🪙' },
  dive: { label: 'Hat dive', icon: '💥' },
};

export const specialInfo = (key: string) => SPECIALS[key] ?? { label: key, icon: '⭐' };
