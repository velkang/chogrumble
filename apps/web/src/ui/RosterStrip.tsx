import { useUi } from './store';
import { Portrait } from './Portrait';
import { shortName } from './names';

export function RosterStrip() {
  const playback = useUi((s) => s.playback);
  const playerId = useUi((s) => s.player?.id);
  if (!playback) return null;
  return (
    <ul className="pointer-events-none m-0 flex list-none flex-wrap justify-center gap-1 p-0 sm:gap-1.5">
      {playback.fighters.map((f) => {
        const pct = Math.round((100 * f.hp) / f.maxHp);
        return (
          <li
            key={f.id}
            data-out={f.out || undefined}
            data-winner={playback.winner === f.id || undefined}
            data-you={playerId === f.id || undefined}
            className="relative w-9 transition-all duration-500 data-out:opacity-45 data-out:grayscale sm:w-11 lg:w-13 short:w-8"
            title={f.name}
          >
            <Portrait
              fighter={f}
              className="aspect-square w-full rounded-md border-2 border-frame/80 bg-portrait in-data-you:border-pink in-data-you:shadow-[0_0_10px_var(--color-pink)] in-data-winner:border-gold in-data-winner:shadow-[0_0_12px_var(--color-gold)]"
            />
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-track">
              <div
                className="h-full bg-gold transition-[width] duration-500 data-low:bg-hp-lo"
                data-low={pct <= 35 || undefined}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="truncate text-center text-[9px] leading-tight font-bold text-fg/80 sm:text-[10px] short:hidden">
              {shortName(f.name)}
            </div>
            {f.out && f.placement !== null ? (
              <span className="absolute -top-1 -right-1 rounded-full bg-black/80 px-1 font-display text-[10px] text-gold">
                #{f.placement}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
