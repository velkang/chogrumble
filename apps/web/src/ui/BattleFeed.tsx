import { useUi } from './store';
import { shownDamage } from './names';

export function BattleFeed() {
  const feed = useUi((s) => s.feed);
  const lines = feed.slice(-3).reverse();
  if (lines.length === 0) return null;
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none m-0 grid max-w-[min(560px,62vw)] list-none gap-1 p-0 short:max-w-[48vw] short:gap-0.5"
    >
      {lines.map((l) => (
        <li
          key={`${l.event}-${l.at}-${l.text}`}
          data-kind={l.kind}
          className="rounded-md border-l-4 border-line bg-black/50 px-2.5 py-1 text-xs leading-snug font-semibold text-fg/75 backdrop-blur-sm first:animate-pop first:text-sm first:text-fg data-[kind=arena]:border-pink data-[kind=ko]:border-gold data-[kind=win]:border-gold sm:text-sm sm:first:text-base short:py-0.5 short:text-[11px] short:first:text-xs short:nth-3:hidden"
        >
          {l.text}
          {l.dmg ? (
            <span className="ml-1.5 inline-block rounded bg-hp-lo px-1 font-display text-[.85em] font-normal text-white">
              -{shownDamage(l.dmg)}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
