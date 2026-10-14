// Pacing keeps every match near three minutes: fighters may only be eliminated while more are
// standing than the alive-count curve allows, and damage ramps up when the match falls behind it.

export const PACING = {
  /** Nobody can be eliminated during the drop. */
  graceMs: 6_000,
  /** The curve reaches one survivor here. */
  killEndMs: 156_000,
  /** Hard cap on the match length; the finale is sized to end before it. */
  endCapMs: 189_000,
  /** Damage % when on the curve with a crowded sack. */
  onCurveScale: 120,
  /** Damage % on the curve once only a few are left, so the final duel wears both down. */
  fewLeftScale: 150,
  fewLeft: 3,
  /** Damage % after the kill window opens, so the last duel ends quickly. */
  finaleScale: 320,
  /** Extra damage % per fighter above the curve. */
  perUrgency: 60,
  maxScale: 340,
} as const;

/** How many fighters should still be standing at sim time `t` (ms) in an `n`-fighter match. */
export function targetAlive(t: number, n: number): number {
  if (t < PACING.graceMs) return n;
  if (t >= PACING.killEndMs) return 1;
  return n - Math.floor(((n - 1) * (t - PACING.graceMs)) / (PACING.killEndMs - PACING.graceMs));
}

/** How many fighters above the curve the match is (0 when on it). */
export function urgency(t: number, alive: number, n: number): number {
  return Math.max(0, alive - targetAlive(t, n));
}

export interface ScaleInput {
  urgency: number;
  t: number;
  standing: number;
}

/** Damage multiplier in percent. */
export function damageScale({ urgency: u, t, standing }: ScaleInput): number {
  if (t >= PACING.killEndMs) return PACING.finaleScale;
  if (u > 0) return Math.min(PACING.maxScale, 100 + PACING.perUrgency * u);
  return standing <= PACING.fewLeft ? PACING.fewLeftScale : PACING.onCurveScale;
}
