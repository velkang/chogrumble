import { useEffect, useRef } from 'react';
import type { DuelControl } from '../duel/input';
import { duelInput } from '../duel/input';
import { useDuel } from '../duel/store';
import { useUi } from './store';
import { specialInfo } from './specials';
import { MuteButton } from './MuteButton';
import { FullscreenButton } from './FullscreenButton';

function Action({ control, label, children, disabled = false }: { control: DuelControl; label: string; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className={`duel-action duel-action-${control}`} disabled={disabled} aria-label={label}
    onContextMenu={(e) => e.preventDefault()}
    onPointerDown={(e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      duelInput.down(`pointer:${e.pointerId}`, control);
    }}
    onPointerUp={(e) => duelInput.up(`pointer:${e.pointerId}`)}
    onPointerCancel={(e) => duelInput.up(`pointer:${e.pointerId}`)}
    onLostPointerCapture={(e) => duelInput.up(`pointer:${e.pointerId}`)}
    onKeyDown={(e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) duelInput.down(`button:${control}:${e.code}`, control);
    }}
    onKeyUp={(e) => { duelInput.up(`button:${control}:${e.code}`); }}
    onBlur={() => { duelInput.up(`button:${control}:Space`); duelInput.up(`button:${control}:Enter`); }}
    onClick={(e) => { if (e.detail === 0) duelInput.tap(control); }}
  >{children}</button>;
}

function Overlay({ title, children }: { title: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0]!; const last = buttons[buttons.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); document.getElementById('stage')?.focus({ preventScroll: true }); };
  }, []);
  return <div className="duel-overlay"><div ref={panel} className="duel-dialog" role="dialog" aria-modal="true" aria-label={title}>
    <h1>{title}</h1>{children}
  </div></div>;
}

export function DuelView() {
  const state = useDuel((s) => s.state);
  const roster = useDuel((s) => s.roster);
  const combo = useDuel((s) => s.combo);
  const pause = useDuel((s) => s.pause);
  const resume = useDuel((s) => s.resume);
  const menu = useDuel((s) => s.menu);
  const play = useUi((s) => s.play);
  const chosen = useUi((s) => s.chosen);
  if (!state || !roster) return null;
  const finished = state.phase === 'matchResult';
  const special = specialInfo(state.fighters[0].special);
  const fighting = state.phase === 'fight' && !state.paused;
  const announcement = state.phase === 'intro' ? `ROUND ${state.round}` : state.phase === 'roundResult'
    ? state.finish === 'draw' ? 'DRAW · TRY AGAIN' : state.finish === 'timeout' ? 'TIME UP' : 'KNOCKOUT!' : state.phase === 'fight' && state.phaseFrame < 50 ? 'FIGHT!' : '';
  return <>
    <div className="duel-hud">
      {roster.map((spec, i) => {
        const f = state.fighters[i]!;
        return <section key={spec.id} className={`duel-fighter duel-fighter-${i}`} aria-label={`${i === 0 ? 'You' : 'AI'}: ${spec.name}`}>
          <img src={`${import.meta.env.BASE_URL}portraits/${spec.tokenId}.webp`} alt="" className="duel-portrait" />
          <div className="duel-vitals">
            <div className="duel-name"><span>{spec.name}</span><span>{i === 0 ? 'YOU' : 'CPU'}</span></div>
            <div className="duel-health" role="progressbar" aria-label={`${spec.name} health`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.hp}>
              <div style={{ transform: `scaleX(${f.hp / 100})` }} /><span>{f.hp}</span>
            </div>
            <div className="duel-meter" role="progressbar" aria-label={`${spec.name} special meter`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.meter}>
              <div style={{ width: `${f.meter}%` }} /><span className="duel-meter-half" />
            </div>
            <div className="duel-rounds" aria-label={`${state.wins[i]} rounds won`}>
              <span data-won={state.wins[i]! >= 1} /><span data-won={state.wins[i]! >= 2} />
              <small>{i === 0 ? `${special.label} · ${f.meter}/100` : 'First to two'}</small>
            </div>
          </div>
        </section>;
      })}
      <div className="duel-clock" aria-label={`${Math.ceil(state.remaining / 60)} seconds remaining`}>
        <strong>{Math.ceil(state.remaining / 60)}</strong><span>ROUND {state.round}</span>
      </div>
    </div>
    <div className="duel-tools"><MuteButton /><FullscreenButton />
      {!finished && <button type="button" onClick={pause} className="duel-tool" aria-label="Pause match">Ⅱ</button>}
    </div>
    <div className="duel-announcement" role="status" aria-live="polite">{announcement}</div>
    {combo && combo.until > state.frame && combo.count > 1 && <div className={`duel-combo duel-combo-${combo.side}`} aria-live="polite"><strong>{combo.count}</strong> HIT COMBO</div>}
    {!finished && !state.paused && <div className="duel-controls" aria-label="Fight controls">
      <div className="duel-pad">
        <Action control="jump" label="Jump (W or up arrow)" disabled={!fighting}>↑</Action>
        <Action control="left" label="Move left (A or left arrow)" disabled={!fighting}>←</Action>
        <Action control="right" label="Move right (D or right arrow)" disabled={!fighting}>→</Action>
        <Action control="crouch" label="Crouch (S or down arrow)" disabled={!fighting}>↓</Action>
      </div>
      <p className="duel-key-guide">WASD / arrows · J light · K heavy<br />L special · Space block · Esc pause</p>
      <div className="duel-attacks">
        <Action control="block" label="Hold block (Space)" disabled={!fighting}><span>BLOCK</span><small>HOLD</small></Action>
        <Action control="light" label="Light attack (J)" disabled={!fighting}><span>LIGHT</span><small>J</small></Action>
        <Action control="heavy" label="Heavy attack (K)" disabled={!fighting}><span>HEAVY</span><small>K</small></Action>
        <Action control="special" label={`${special.label} (L), costs 50 meter`} disabled={!fighting || state.fighters[0].meter < 50}><span>SPECIAL</span><small>50 METER</small></Action>
      </div>
    </div>}
    {state.paused && !finished && <Overlay title="Paused">
      <p>Take a breath. The sack can wait.</p>
      <button type="button" className="duel-primary" onClick={() => { resume(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}>Resume fight</button>
      <button type="button" className="duel-secondary" onClick={menu}>Character select</button>
    </Overlay>}
    {finished && <Overlay title={state.winner === 0 ? 'YOU WIN!' : 'CHOG DOWN!'}>
      <img className="duel-winner" src={`${import.meta.env.BASE_URL}portraits/${roster[state.winner ?? 0].tokenId}.webp`} alt={roster[state.winner ?? 0].name} />
      <p>{roster[state.winner ?? 0].name} takes the sack.</p>
      <div className="duel-score">{state.wins[0]} — {state.wins[1]}</div>
      <button type="button" className="duel-primary" onClick={() => play(chosen)}>Rematch</button>
      <button type="button" className="duel-secondary" onClick={menu}>Character select</button>
    </Overlay>}
  </>;
}
