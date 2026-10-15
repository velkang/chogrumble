// Floating damage numbers over a Chog's head.
import { ease } from '../engine/tween';
import { headWorld } from '../chog/anchors';
import type { Chog } from '../chog/chog';
import { DAMAGE_POPUP, DAMAGE_POPUP_CRIT } from '../hud/classes';
import type { StageCtx } from './context';
import { shownDamage } from '../ui/names';

export function popDamage(ctx: StageCtx, c: Chog, n: number, crit = false): void {
  if (n <= 0) return;
  const p = headWorld(c, 0.35).project(ctx.camera);
  const el = document.createElement('div');
  el.className = crit ? DAMAGE_POPUP_CRIT : DAMAGE_POPUP;
  el.dataset['dmg'] = '';
  el.textContent = `-${shownDamage(n)}`;
  el.style.left = `${((p.x + 1) / 2) * 100}%`;
  el.style.top = `${((1 - p.y) / 2) * 100}%`;
  ctx.stage.appendChild(el);
  ctx.tw
    .tween(
      1.1,
      (_e, t) => {
        const k = t < 0.15 ? t / 0.15 : 1;
        const rise = -30 - 30 * k - 130 * Math.max(0, (t - 0.15) / 0.85);
        el.style.transform = `translate(-50%, ${rise}%) scale(${t < 0.15 ? 0.6 + 0.55 * k : 1})`;
        el.style.opacity = String(t < 0.15 ? k : 1 - (t - 0.15) / 0.85);
      },
      ease.lin,
    )
    .then(
      () => el.remove(),
      () => el.remove(),
    );
}

export function clearPopups(stage: HTMLElement): void {
  stage.querySelectorAll('[data-dmg]').forEach((e) => e.remove());
}
