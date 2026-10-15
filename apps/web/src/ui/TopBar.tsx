import { useUi } from './store';
import { clock } from './names';
import { FullscreenButton } from './FullscreenButton';
import { MuteButton } from './MuteButton';

export function TopBar() {
  const playback = useUi((s) => s.playback);
  if (!playback) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-[max(8px,env(safe-area-inset-top))] px-[max(10px,env(safe-area-inset-left))]">
      <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 font-display text-sm tracking-wide text-fg backdrop-blur-sm sm:text-base">
        <span className="text-gold">{playback.round === 0 ? 'THE DROP' : `ROUND ${playback.round}`}</span>
        <span className="opacity-60">·</span>
        <span>{playback.alive} LEFT</span>
      </div>
      <div className="rounded-full bg-black/45 px-3 py-1 font-display text-sm text-muted tabular-nums backdrop-blur-sm sm:text-base">
        {clock(playback.t)}
      </div>
      <div className="flex gap-2">
        <MuteButton />
        <FullscreenButton />
      </div>
    </div>
  );
}
