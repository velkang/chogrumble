import { describe, expect, it } from 'vitest';
import { simulate } from '@chog/sim';
import { buildRoster } from './roster';
import { formatTimeline } from './feed-format';
import { LINES } from './lines';

const timelines = Array.from({ length: 200 }, (_, i) =>
  simulate(buildRoster([], `feed-${i}`), `feed-${i}`),
);

describe('formatTimeline', () => {
  it('is deterministic', () => {
    expect(formatTimeline(timelines[0]!)).toEqual(formatTimeline(timelines[0]!));
  });

  it('gives every event at least one line, in time order', () => {
    for (const t of timelines) {
      const feed = formatTimeline(t);
      t.events.forEach((_, i) => expect(feed.some((l) => l.event === i)).toBe(true));
      feed.forEach((l, i) => i > 0 && expect(l.at).toBeGreaterThanOrEqual(feed[i - 1]!.at));
    }
  });

  it('fills every placeholder', () => {
    for (const t of timelines) {
      for (const l of formatTimeline(t)) {
        expect(l.text).not.toMatch(/[{}]/);
        expect(l.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('names fighters by their Chog name and tags them for colouring', () => {
    const t = timelines[0]!;
    const names = new Set(t.roster.map((r) => r.name));
    const winLine = formatTimeline(t).find((l) => l.kind === 'win')!;
    expect([...names].some((n) => winLine.text.includes(n))).toBe(true);
    expect(winLine.ids).toContain(t.winner);
  });

  it('does not repeat the same line back to back', () => {
    for (const t of timelines) {
      const feed = formatTimeline(t);
      feed.forEach((l, i) => i > 0 && expect(l.text).not.toBe(feed[i - 1]!.text));
    }
  });
});

describe('LINES', () => {
  it('has a healthy bank for every line key', () => {
    for (const [key, lines] of Object.entries(LINES)) {
      expect(lines.length, key).toBeGreaterThanOrEqual(3);
      expect(new Set(lines).size, `${key} has duplicates`).toBe(lines.length);
    }
  });
});
