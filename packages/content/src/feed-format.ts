// Turns a match timeline into battle-feed lines. Line choice is seeded from the match seed and the
// event position, so every viewer reads the same feed, and adding lines never changes outcomes.
import { createRng } from '@chog/sim';
import type { AttackHit, EnvHit, MatchEvent, Timeline } from '@chog/sim';
import { LINES } from './lines';
import { hitTime } from './timing';
import type { LineKey } from './lines';

export type FeedKind = 'info' | 'hit' | 'arena' | 'ko' | 'win';

export interface FeedLine {
  /** When the line should appear, ms from match start. */
  at: number;
  /** Index of the timeline event it describes. */
  event: number;
  text: string;
  kind: FeedKind;
  /** Fighters named in the line, for colouring. */
  ids: string[];
  dmg?: number;
  crit?: boolean;
}

interface Vars {
  a?: string | undefined;
  b?: string | undefined;
  c?: string | undefined;
  all?: string[];
  round?: number;
  place?: number;
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

interface Ctx {
  seed: string;
  names: ReadonlyMap<string, string>;
  out: FeedLine[];
}

const nameOf = (ctx: Ctx, id: string | undefined) =>
  id === undefined ? '' : (ctx.names.get(id) ?? id);

function fill(ctx: Ctx, template: string, v: Vars): string {
  return template
    .replaceAll('{a}', nameOf(ctx, v.a))
    .replaceAll('{b}', nameOf(ctx, v.b))
    .replaceAll('{c}', nameOf(ctx, v.c))
    .replaceAll('{all}', joinNames((v.all ?? []).map((id) => nameOf(ctx, id))))
    .replaceAll('{round}', String(v.round ?? ''))
    .replaceAll('{place}', v.place === undefined ? '' : ordinal(v.place));
}

/** Seeded pick from a line bank that avoids repeating the previous feed line. */
function choose(ctx: Ctx, key: LineKey, salt: string, v: Vars): string {
  const bank = LINES[key];
  const start = createRng(`feed:${ctx.seed}:${salt}`).int(bank.length);
  const prev = ctx.out.at(-1)?.text;
  for (let k = 0; k < bank.length; k++) {
    const text = fill(ctx, bank[(start + k) % bank.length]!, v);
    if (!prev?.endsWith(text) && !prev?.startsWith(text)) return text;
  }
  return fill(ctx, bank[start]!, v);
}


function attackLine(
  ctx: Ctx,
  e: MatchEvent,
  idx: number,
  h: AttackHit,
  i: number,
  n: number,
): FeedLine {
  const salt = `${idx}:${i}`;
  const v: Vars = { a: h.attacker, b: h.target };
  let text = choose(ctx, h.blocked ? 'block' : h.dodged ? 'dodge' : h.move, salt, v);
  if (h.crit) text = `${choose(ctx, 'crit', `${salt}:crit`, v)} ${text}`;
  if (!h.dodged && h.hpAfter === 1 && h.dmg > 1)
    text = `${text} ${choose(ctx, 'clinging', `${salt}:cling`, v)}`;
  const base = {
    at: hitTime(e, i, n),
    event: idx,
    text,
    kind: 'hit' as const,
    ids: [...new Set([h.attacker, h.target])],
  };
  return h.dodged || h.blocked ? base : { ...base, dmg: h.dmg, crit: h.crit };
}

function envLine(
  ctx: Ctx,
  e: MatchEvent,
  idx: number,
  key: LineKey,
  h: EnvHit,
  i: number,
  n: number,
): FeedLine {
  return {
    at: hitTime(e, i, n),
    event: idx,
    text: choose(ctx, key, `${idx}:${i}`, { b: h.target }),
    kind: 'arena',
    ids: [h.target],
    dmg: h.dmg,
  };
}

const MEDDLE_KEY = {
  heart: 'meddleHeart',
  gum: 'meddleGum',
  flick: 'meddleFlick',
  pluck: 'meddlePluck',
} as const;
const KO_KEY = { giant: 'koGiant', zone: 'koZone', mishap: 'koMishap' } as const;

/** Writes the event's lines straight into the feed, so each pick sees the line before it. */
function emitEvent(ctx: Ctx, e: MatchEvent, idx: number): void {
  const emit = (l: FeedLine) => void ctx.out.push(l);
  const line = (key: LineKey, v: Vars, kind: FeedKind, ids: string[]): FeedLine => ({
    at: e.at,
    event: idx,
    text: choose(ctx, key, `${idx}`, v),
    kind,
    ids,
  });
  const attacks = (hits: readonly AttackHit[]) =>
    hits.forEach((h, i) => emit(attackLine(ctx, e, idx, h, i, hits.length)));
  const env = (key: LineKey, hits: readonly EnvHit[]) =>
    hits.forEach((h, i) => emit(envLine(ctx, e, idx, key, h, i, hits.length)));
  switch (e.type) {
    case 'drop':
      return emit(line('drop', {}, 'info', []));
    case 'zone':
      emit(line('zone', { round: e.round }, 'arena', []));
      return env('zoneHit', e.hits);
    case 'fight':
      return attacks(e.hits);
    case 'brawl': {
      const [a, b, c] = e.ids;
      emit(line('brawl', { a, b, c }, 'info', e.ids));
      return attacks(e.hits);
    }
    case 'mishap':
      return env(e.kind, e.hits);
    case 'meddle': {
      const ids = e.hits.map((h) => h.target);
      return emit({
        ...line(MEDDLE_KEY[e.kind], { b: ids[0], all: ids }, 'arena', ids),
        dmg: e.hits.reduce((sum, h) => sum + h.dmg, 0),
      });
    }
    case 'elimination': {
      const v: Vars = { b: e.id, place: e.placement, ...(e.by ? { a: e.by } : {}) };
      const key: LineKey = e.cause === 'fight' ? (e.by ? 'koFight' : 'koSelf') : KO_KEY[e.cause];
      return emit(line(key, v, 'ko', e.by ? [e.by, e.id] : [e.id]));
    }
    case 'revive':
      return emit(line('revive', { b: e.id }, 'arena', [e.id]));
    case 'winner':
      return emit(line('winner', { a: e.id }, 'win', [e.id]));
    case 'strike':
      return attacks(e.hits);
    case 'swing':
    case 'roll':
      // the strike that follows a swing gets the line; a roll speaks for itself
      return;
  }
}

export function formatTimeline(t: Timeline): FeedLine[] {
  const ctx: Ctx = { seed: t.seed, names: new Map(t.roster.map((r) => [r.id, r.name])), out: [] };
  t.events.forEach((e, idx) => emitEvent(ctx, e, idx));
  return ctx.out;
}

/** Formats a live match's events as they arrive; `add` returns only the new lines. */
export function createFeedFormatter(seed: string, roster: readonly Timeline['roster'][number][]): { add(e: MatchEvent, index: number): FeedLine[] } {
  const ctx: Ctx = { seed, names: new Map(roster.map((r) => [r.id, r.name])), out: [] };
  return {
    add(e, index) {
      const before = ctx.out.length;
      emitEvent(ctx, e, index);
      return ctx.out.slice(before);
    },
  };
}
