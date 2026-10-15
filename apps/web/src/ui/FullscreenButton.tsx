import { useEffect, useState } from 'react';

const supported = () => typeof document !== 'undefined' && document.fullscreenEnabled;

export function FullscreenButton() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!supported()) return <div className="size-9" aria-hidden />;
  const toggle = () => {
    const request = on ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    request.catch(() => setOn(document.fullscreenElement !== null));
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Exit full screen' : 'Full screen'}
      className="pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-full bg-black/45 text-lg text-fg backdrop-blur-sm hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-fg"
    >
      {on ? '⤡' : '⤢'}
    </button>
  );
}
