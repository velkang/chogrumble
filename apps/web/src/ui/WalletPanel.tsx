// "Use my Chog": connect a wallet, see your Chogs (verified on-chain), or enter a token number.
import { useState } from 'react';
import { useUi } from './store';
import type { Candidate } from './store';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WalletPanel({ card }: { card: (c: Candidate) => React.ReactNode }) {
  const wallet = useUi((s) => s.wallet);
  const connect = useUi((s) => s.connectWallet);
  const disconnect = useUi((s) => s.disconnectWallet);
  const checkToken = useUi((s) => s.checkToken);
  const [token, setToken] = useState('');
  const busy = wallet.status === 'connecting' || wallet.status === 'checking';

  if (!wallet.address) {
    return (
      <div className="grid justify-items-center gap-1.5">
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className="cursor-pointer rounded-full bg-pink px-5 py-2 font-display text-lg text-ink shadow-[0_4px_0_var(--color-banner-edge)] hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-wait disabled:opacity-60 short:py-1 short:text-base"
        >
          {busy ? 'Connecting…' : '🔗 Use my Chog'}
        </button>
        {wallet.message ? <p className="m-0 max-w-sm text-xs font-bold text-hp-lo-hi">{wallet.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid justify-items-center gap-2">
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <span className="rounded-full bg-black/40 px-2 py-0.5 font-mono">{short(wallet.address)}</span>
        <button type="button" onClick={disconnect} className="cursor-pointer text-muted underline hover:text-fg">
          disconnect
        </button>
      </div>
      {wallet.status === 'checking' ? <p className="m-0 text-sm font-bold text-muted">Finding your Chogs…</p> : null}
      {wallet.mine.length > 0 ? (
        <div className="flex max-w-xl flex-wrap justify-center gap-2 sm:gap-3">{wallet.mine.map((c) => card(c))}</div>
      ) : null}
      {wallet.message ? <p className="m-0 max-w-sm text-xs font-bold text-muted">{wallet.message}</p> : null}
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          checkToken(Number(token));
          setToken('');
        }}
      >
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
          placeholder="Token #"
          aria-label="Chog token number"
          className="w-24 rounded-full border-2 border-line bg-black/40 px-3 py-1 text-center text-sm font-bold text-fg outline-none focus:border-pink"
        />
        <button
          type="submit"
          disabled={!token}
          className="cursor-pointer rounded-full border-2 border-line px-3 py-1 text-sm font-extrabold text-fg hover:border-pink disabled:cursor-default disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </div>
  );
}
