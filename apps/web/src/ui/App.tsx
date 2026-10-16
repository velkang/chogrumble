import { useUi } from './store';
import { StartScreen } from './StartScreen';
import { RotateHint } from './RotateHint';
import { DuelView } from './DuelView';

export function App() {
  const phase = useUi((s) => s.phase);
  return <>
    {phase === 'playing' || phase === 'results' ? <DuelView /> : <StartScreen />}
    <RotateHint />
  </>;
}
