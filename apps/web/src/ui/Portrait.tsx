import type { FighterView } from '../playback/fold';
import { portraitUrl, shortName } from './names';

export function Portrait({ fighter, className }: { fighter: FighterView; className: string }) {
  const url = portraitUrl(fighter);
  return url ? (
    <img src={url} alt={fighter.name} decoding="async" className={`block object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-portrait font-display text-xs ${className}`}>{shortName(fighter.name)}</div>
  );
}
