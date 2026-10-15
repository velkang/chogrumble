// Pushes live match state into the UI store when something visible changes: new feed lines,
// a knock-out, the player's cooldowns, or the clock ticking over a second. Never every frame.
import type { LiveMatch, MatchEvent } from '@chog/sim';
import { createFeedFormatter } from '@chog/content';
import type { FeedLine } from '@chog/content';
import { foldTo } from '../playback/fold';
import { ui } from '../ui/store';
import type { KnockOut } from '../ui/store';

const MAX_FEED = 30;

export interface HudSync {
  /** Feeds new events in as the match produces them. */
  add(events: readonly MatchEvent[]): void;
  /** Updates the store for match time t (ms). */
  sync(t: number): void;
}

export function createHudSync(match: LiveMatch): HudSync {
  const formatter = createFeedFormatter(match.seed, match.roster);
  let pending: FeedLine[] = [];
  let shown: FeedLine[] = [];
  const knockOuts: KnockOut[] = [];
  let indexed = 0;
  let lastKey = '';
  return {
    add(events) {
      for (const e of events) {
        pending.push(...formatter.add(e, indexed++));
        if (e.type === 'elimination') knockOuts.push({ id: e.id, by: e.by, cause: e.cause, placement: e.placement, at: e.at });
      }
    },
    sync(t) {
      const due = pending.filter((l) => l.at <= t);
      if (due.length) {
        pending = pending.filter((l) => l.at > t);
        shown = [...shown, ...due].slice(-MAX_FEED);
      }
      const kos = knockOuts.filter((k) => k.at <= t);
      const p = match.player();
      const key = `${shown.length}:${shown.at(-1)?.at}:${kos.length}:${Math.floor(t / 1000)}:${p ? Math.ceil(p.specialReadyIn / 250) + '/' + Math.ceil(p.dodgeReadyIn / 250) : ''}`;
      if (key === lastKey) return;
      lastKey = key;
      const log = { roster: match.roster, events: match.events(), duration: Number.POSITIVE_INFINITY };
      ui.setState({
        playback: foldTo(log, t),
        feed: shown,
        knockOuts: kos,
        player: p ? { id: p.id, special: p.special, specialReadyIn: p.specialReadyIn, dodgeReadyIn: p.dodgeReadyIn } : null,
      });
    },
  };
}
