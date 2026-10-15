// The player's two buttons: SPECIAL (trait move) and DODGE, with cooldown rings.
// Keyboard: Space or J = special, K or Shift = dodge.
import { useEffect } from 'react';
import { press, useUi } from './store';
import { specialInfo } from './specials';

const RING = 2 * Math.PI * 44;

function ActionButton(props: { label: string; icon: string; readyIn: number; total: number; big?: boolean; onPress: () => void }) {
  const { label, icon, readyIn, total, big, onPress } = props;
  const ready = readyIn <= 0;
  const left = ready ? 0 : Math.min(1, readyIn / total);
  return (
    <button
      type="button"
      aria-label={ready ? label : `${label} (cooling down)`}
      data-ready={ready || undefined}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`pointer-events-auto relative grid cursor-pointer touch-none place-items-center rounded-full border-4 border-frame/70 bg-black/55 font-display text-fg backdrop-blur-sm transition-transform select-none active:scale-90 data-ready:border-pink data-ready:bg-pink/80 data-ready:shadow-[0_0_18px_var(--color-pink)] ${big ? 'size-24 text-4xl sm:size-28 short:size-20' : 'size-16 text-2xl sm:size-20 short:size-14'}`}
    >
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="8" strokeDasharray={RING} strokeDashoffset={RING * (1 - left)} />
      </svg>
      <span className="relative leading-none">{icon}</span>
      <span className="absolute -bottom-5 text-[11px] tracking-wide text-fg [text-shadow:0_1px_0_#000] short:-bottom-4 short:text-[10px]">{label}</span>
    </button>
  );
}

export function Controls() {
  const player = useUi((s) => s.player);
  const playback = useUi((s) => s.playback);
  const me = playback?.fighters.find((f) => f.id === player?.id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'KeyJ') press('special');
      if (e.code === 'KeyK' || e.key === 'Shift') press('dodge');
      if (e.code === 'Space') e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!player || !me || me.out) return null;
  const s = specialInfo(player.special);
  return (
    <div className="pointer-events-none absolute right-[max(14px,env(safe-area-inset-right))] bottom-[max(84px,calc(env(safe-area-inset-bottom)+84px))] flex items-end gap-4 short:bottom-[72px] short:gap-3">
      <ActionButton label="DODGE" icon="💨" readyIn={player.dodgeReadyIn} total={3500} onPress={() => press('dodge')} />
      <ActionButton label={s.label.toUpperCase()} icon={s.icon} readyIn={player.specialReadyIn} total={6000} big onPress={() => press('special')} />
    </div>
  );
}
