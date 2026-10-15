import { ui, useUi } from './store';
import { Portrait } from './Portrait';
import { shortName } from './names';

export function Results() {
  const playback = useUi((s) => s.playback);
  const play = useUi((s) => s.play);
  const chosen = useUi((s) => s.chosen);
  const toMenu = () => ui.setState({ phase: 'ready' });
  if (!playback) return null;
  const ranked = [...playback.fighters].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
  const mine = chosen === null ? undefined : playback.fighters.find((f) => f.tokenId === chosen);
  const [champ, ...rest] = ranked;
  if (!champ) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="grid max-h-full w-full max-w-3xl animate-pop grid-cols-1 gap-4 overflow-auto rounded-2xl border border-line bg-panel/95 p-4 sm:grid-cols-[auto_1fr] sm:p-5">
        <div className="grid justify-items-center gap-2 text-center">
          <Portrait fighter={champ} className="size-24 rounded-xl border-4 border-gold shadow-[0_0_24px_var(--color-gold)] sm:size-32" />
          <div className="font-display text-xl text-gold sm:text-2xl">{mine && mine.id === champ.id ? 'YOU WIN!' : 'WINNER'}</div>
          {mine && mine.id !== champ.id ? (
            <div className="rounded-full bg-black/40 px-3 py-1 text-sm font-bold">
              You finished <span className="font-display text-gold">#{mine.placement}</span> with {mine.kills} KO{mine.kills === 1 ? '' : 's'}
            </div>
          ) : null}
          <div className="font-display text-lg">{champ.name}</div>
          <div className="text-sm text-muted">{champ.kills} KOs{champ.house ? ' · house Chog' : ''}</div>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => play(chosen)}
              className="cursor-pointer rounded-full bg-pink px-5 py-2 font-extrabold text-ink hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              {chosen === null ? 'Watch another' : 'Play again'}
            </button>
            <button
              type="button"
              onClick={toMenu}
              className="cursor-pointer rounded-full border-2 border-line px-4 py-2 font-extrabold text-fg hover:border-pink focus-visible:outline-3 focus-visible:outline-fg"
            >
              Pick another Chog
            </button>
          </div>
        </div>
        <ol className="m-0 grid list-none grid-cols-2 content-start gap-1.5 p-0 sm:grid-cols-3">
          {rest.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5">
              <span className="w-6 font-display text-gold">#{f.placement}</span>
              <Portrait fighter={f} className="size-8 rounded-md" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{shortName(f.name)}</span>
              {f.kills > 0 ? <span className="text-xs text-muted">{f.kills} KO</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
