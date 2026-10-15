// Rendering quality: phones and weak machines start on 'low', and any device drops to 'low'
// if its frames stay slow.

export type Quality = 'high' | 'low';

export interface QualitySettings {
  /** Cap on devicePixelRatio; phones with 3x screens don't need 3x pixels in a busy 3D scene. */
  maxPixelRatio: number;
  shadowMapSize: number;
  /** Real shadows from the 12 fighters; otherwise each gets a cheap blob shadow. */
  fighterShadows: boolean;
  /** Decimated giant, platform hat and a thinner rope. Fixed at load time. */
  lightScenery: boolean;
}

export const SETTINGS: Readonly<Record<Quality, QualitySettings>> = {
  high: { maxPixelRatio: 1.5, shadowMapSize: 2048, fighterShadows: true, lightScenery: false },
  low: { maxPixelRatio: 1.15, shadowMapSize: 1024, fighterShadows: false, lightScenery: true },
};

export interface DeviceInfo {
  touchPoints: number;
  /** navigator.deviceMemory, when the browser exposes it. */
  memoryGb?: number;
  cores?: number;
  /** Shorter side of the screen in CSS px. */
  shortSide: number;
}

const PHONE_SHORT_SIDE = 900;
const WEAK_MEMORY_GB = 4;
const WEAK_CORES = 4;

export function detectQuality(d: DeviceInfo, requested?: string | null): Quality {
  if (requested === 'high' || requested === 'low') return requested;
  if (d.touchPoints > 0 && d.shortSide < PHONE_SHORT_SIDE) return 'low';
  if (d.memoryGb !== undefined && d.memoryGb <= WEAK_MEMORY_GB) return 'low';
  if (d.cores !== undefined && d.cores <= WEAK_CORES) return 'low';
  return 'high';
}

/** Reads the current browser's device info. */
export function deviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    touchPoints: nav.maxTouchPoints ?? 0,
    ...(nav.deviceMemory !== undefined ? { memoryGb: nav.deviceMemory } : {}),
    ...(nav.hardwareConcurrency ? { cores: nav.hardwareConcurrency } : {}),
    shortSide: Math.min(screen.width, screen.height),
  };
}

export interface FrameMonitor {
  /** Adds a frame's duration (seconds); true once a full window averaged over budget. */
  push(dtSeconds: number): boolean;
}

export function createFrameMonitor(opts: { budgetMs: number; windowSeconds: number }): FrameMonitor {
  let total = 0;
  let frames = 0;
  return {
    push(dt) {
      total += dt;
      frames++;
      if (total < opts.windowSeconds) return false;
      const avgMs = (total / frames) * 1000;
      total = 0;
      frames = 0;
      return avgMs > opts.budgetMs;
    },
  };
}
