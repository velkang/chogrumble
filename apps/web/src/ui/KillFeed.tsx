import { useUi } from './store';
import { shortName } from './names';

const CAUSE: Record<string, string> = { giant: 'plucked', zone: 'squeezed', mishap: 'tripped' };

export function KillFeed() {
  const knockOuts = useUi((s) => s.knockOuts);
  const playback = useUi((s) => s.playback);
  if (!playback || knockOuts.length === 0) return null;
  const name = (id: string | null) => shortName(playback.fighters.find((f) => f.id === id)?.name ?? '');
  return (
    <ol className="pointer-events-none absolute top-14 right-[max(10px,env(safe-area-inset-right))] m-0 grid list-none justify-items-end gap-1 p-0 short:top-11 short:gap-0.5">
      {knockOuts.slice(-4).map((k) => (
        <li key={`${k.id}-${k.at}`} className="animate-pop rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-fg backdrop-blur-sm sm:text-sm short:text-[11px]">
          {k.by ? (
            <>
              <span className="text-pink">{name(k.by)}</span> <span className="opacity-60">KO</span> {name(k.id)}
            </>
          ) : (
            <>
              {name(k.id)} <span className="opacity-60">{CAUSE[k.cause] ?? 'out'}</span>
            </>
          )}
          <span className="ml-1.5 font-display text-gold">#{k.placement}</span>
        </li>
      ))}
    </ol>
  );
}
