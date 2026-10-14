// Tailwind utility classes for elements the game creates at runtime (Tailwind scans this file).

export const FEED_ITEM =
  'rounded-lg border-l-4 border-line bg-white/4 px-3 py-2 text-[clamp(15px,1.9vw,20px)] leading-[1.4] font-semibold opacity-55 nth-2:opacity-80 first:animate-pop first:border-l-fg first:bg-white/8 first:text-[clamp(17px,2.3vw,25px)] first:opacity-100 data-[kind=arena]:border-l-pink data-[kind=ko]:border-l-gold data-[kind=win]:border-l-gold';

export const NAME_MINE = 'font-extrabold text-pink';
export const NAME_FOE = 'font-extrabold text-foe';

export const HIT_TAG =
  'ml-[.2em] inline-block rounded-md bg-hp-lo px-[.35em] font-display text-[.85em] font-normal text-white';

// the popup's position and transform are driven inline by its tween
export const DAMAGE_POPUP =
  'pointer-events-none absolute font-display text-[clamp(20px,3.4vw,44px)] text-white [paint-order:stroke_fill] [-webkit-text-stroke:2px_#000]';
export const DAMAGE_POPUP_CRIT =
  'pointer-events-none absolute font-display text-[clamp(26px,4.4vw,58px)] text-gold [paint-order:stroke_fill] [-webkit-text-stroke:2px_#000]';

export const MOVE_BUTTON =
  'cursor-pointer rounded-full border-2 border-line bg-transparent px-3 py-1.5 text-sm font-extrabold text-fg hover:border-pink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg data-on:border-pink data-on:bg-pink data-on:text-ink';

export const STAGE_MESSAGE =
  'absolute inset-0 grid place-items-center p-5 text-center font-extrabold text-muted';
