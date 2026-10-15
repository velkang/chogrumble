import { useUi } from './store';

export function MuteButton() {
  const muted = useUi((s) => s.muted);
  const toggle = useUi((s) => s.toggleMute);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Sound on' : 'Mute'}
      className="pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-full bg-black/45 text-lg text-fg backdrop-blur-sm hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-fg"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
