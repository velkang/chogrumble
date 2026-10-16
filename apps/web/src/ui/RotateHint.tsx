export function RotateHint() {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 hidden place-items-center bg-bg p-6 text-center portrait:max-lg:grid">
      <div className="grid justify-items-center gap-3">
        <div className="animate-[spin_2.4s_ease-in-out_infinite] text-5xl" aria-hidden>
          📱
        </div>
        <p className="m-0 font-display text-2xl">Turn your phone sideways</p>
        <p className="m-0 text-sm text-muted">The duel plays in landscape. Your fight is paused.</p>
      </div>
    </div>
  );
}
