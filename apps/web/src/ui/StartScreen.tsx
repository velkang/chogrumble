import { useUi } from './store';
import type { Candidate } from './store';
import { shortName } from './names';
import { specialInfo } from './specials';
import { WalletPanel } from './WalletPanel';

function CandidateCard({ c, onPick }: { c: Candidate; onPick: (id: number) => void }) {
  const s = specialInfo(c.special);
  return (
    <button
      type="button"
      onClick={() => onPick(c.tokenId)}
      className="group grid w-28 cursor-pointer justify-items-center gap-1 rounded-2xl border-2 border-line bg-card/90 p-2 text-fg transition-transform hover:-translate-y-1 hover:border-pink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg sm:w-32 short:w-24"
    >
      <img
        src={`${import.meta.env.BASE_URL}portraits/${c.tokenId}.webp`}
        alt={c.name}
        className="aspect-square w-full rounded-xl border-2 border-frame/80 bg-portrait"
      />
      <span className="font-display text-sm">{shortName(c.name)}</span>
      <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-muted group-hover:text-fg">
        {s.icon} {s.label}
      </span>
    </button>
  );
}

export function StartScreen() {
  const phase = useUi((s) => s.phase);
  const error = useUi((s) => s.error);
  const candidates = useUi((s) => s.candidates);
  const play = useUi((s) => s.play);
  const reroll = useUi((s) => s.reroll);
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-black/65 p-4">
      <div className="grid max-w-2xl justify-items-center gap-3 text-center short:gap-2">
        <h1 className="m-0 font-display text-[clamp(30px,6vw,60px)] leading-none font-normal [text-shadow:0_4px_0_#000] short:text-[clamp(24px,5vw,40px)]">
          Chog <span className="text-pink">Sack</span> Rumble
        </h1>
        <p className="m-0 text-sm font-semibold text-fg/85 sm:text-base short:text-xs">
          Two Chogs. One champion. Pick your fighter.
        </p>
        {phase === 'loading' ? <p className="m-0 font-extrabold text-muted">Loading the sack…</p> : null}
        {phase === 'error' ? <div role="alert" className="grid gap-2">
          <p className="m-0 rounded-lg bg-hp-lo/20 px-3 py-2 font-bold text-hp-lo-hi">{error}</p>
          <button type="button" className="duel-secondary" onClick={() => location.reload()}>Reload game</button>
        </div> : null}
        <p className="m-0 text-xs font-bold text-muted">1 vs 1 · First to two rounds · Equal stats, unique specials</p>
        {phase === 'ready' ? <WalletPanel card={(c) => <CandidateCard key={c.tokenId} c={c} onPick={play} />} /> : null}
        {phase === 'ready' && candidates.length > 0 ? (
          <>
            <p className="m-0 text-xs font-bold tracking-wide text-muted uppercase">or borrow one</p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {candidates.map((c) => (
                <CandidateCard key={c.tokenId} c={c} onPick={play} />
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={reroll}
                className="cursor-pointer rounded-full border-2 border-line bg-transparent px-4 py-1.5 text-sm font-extrabold text-fg hover:border-pink focus-visible:outline-3 focus-visible:outline-fg"
              >
                🎲 Other Chogs
              </button>

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
