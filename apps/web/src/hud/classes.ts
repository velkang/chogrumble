// Tailwind utility classes for elements the game creates at runtime (Tailwind scans this file).

// the popup's position and transform are driven inline by its tween
export const DAMAGE_POPUP =
  'pointer-events-none absolute font-display text-[clamp(20px,3.4vw,44px)] text-white [paint-order:stroke_fill] [-webkit-text-stroke:2px_#000]';
export const DAMAGE_POPUP_CRIT =
  'pointer-events-none absolute font-display text-[clamp(26px,4.4vw,58px)] text-gold [paint-order:stroke_fill] [-webkit-text-stroke:2px_#000]';

// comic hit-words at impacts ("POW!", "BONK!"); colour and tilt come from data attributes
export const HIT_WORD =
  'pointer-events-none absolute font-display text-[clamp(22px,3.8vw,50px)] leading-none text-gold [paint-order:stroke_fill] [-webkit-text-stroke:3px_#2a0f3a] data-[tone=pink]:text-pink data-[tone=white]:text-white data-[tone=blue]:text-foe';
