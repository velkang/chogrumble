import { useUi } from './store';
import { TopBar } from './TopBar';
import { KillFeed } from './KillFeed';
import { BattleFeed } from './BattleFeed';
import { RosterStrip } from './RosterStrip';
import { BannerView } from './BannerView';
import { Results } from './Results';
import { StartScreen } from './StartScreen';
import { RotateHint } from './RotateHint';
import { Controls } from './Controls';

export function App() {
  const phase = useUi((s) => s.phase);
  const inMatch = phase === 'playing' || phase === 'results';
  return (
    <>
      {inMatch ? (
        <>
          <TopBar />
          <KillFeed />
          <BannerView />
          {phase === 'playing' ? <Controls /> : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-2 p-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:p-3 short:gap-1 short:p-1.5">
            <div className="px-[max(0px,env(safe-area-inset-left))]">
              <BattleFeed />
            </div>
            <RosterStrip />
          </div>
        </>
      ) : (
        <StartScreen />
      )}
      {phase === 'results' ? <Results /> : null}
      <RotateHint />
    </>
  );
}
