// Health bars, floating damage numbers, the battle feed, banners and trait chips.
import type { PerspectiveCamera } from 'three';
import type { Tweens } from '../engine/tween';
import { ease } from '../engine/tween';
import { headWorld } from '../chog/anchors';
import type { Chog } from '../chog/chog';
import { byId, setFlag } from './dom';
import {
  DAMAGE_POPUP,
  DAMAGE_POPUP_CRIT,
  FEED_ITEM,
  HIT_TAG,
  NAME_FOE,
  NAME_MINE,
} from './classes';

export type FeedKind = 'arena' | 'ko' | 'win';
export type ChipId = 'cHat' | 'cGum' | 'cHeart' | 'cHand';
export const CHIPS: readonly ChipId[] = ['cHat', 'cGum', 'cHeart', 'cHand'];

export interface SayOptions {
  a?: Chog;
  b?: Chog;
  hit?: number;
  kind?: FeedKind;
}

const FEED_MAX = 5;
const LOW_HP = 35;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface Hud {
  setHP(f: Chog, v: number): void;
  /** Applies damage, pops a number over the head and flashes the hurt face. */
  dmg(f: Chog, n: number, crit?: boolean): number;
  say(text: string, opts?: SayOptions): void;
  banner(text: string, gold?: boolean): void;
  bannerOff(): void;
  chip(id: ChipId, on: boolean): void;
}

/** `isMine(f)` decides which side (left/pink or right/blue) a fighter's HUD lives on. */
export function createHud(
  stage: HTMLElement,
  camera: PerspectiveCamera,
  tw: Tweens,
  isMine: (f: Chog) => boolean,
): Hud {
  const side = (f: Chog) => (isMine(f) ? 'a' : 'b');

  const setHP = (f: Chog, v: number) => {
    f.hp = Math.max(0, Math.min(100, v));
    const el = byId('hp' + side(f));
    el.style.width = f.hp + '%';
    setFlag(el, 'low', f.hp <= LOW_HP);
    byId('hpn' + side(f)).textContent = String(Math.ceil(f.hp));
  };

  const popNumber = (f: Chog, n: number, crit: boolean) => {
    const p = headWorld(f, 0.35).project(camera);
    const el = document.createElement('div');
    el.className = crit ? DAMAGE_POPUP_CRIT : DAMAGE_POPUP;
    el.dataset['dmg'] = '';
    el.textContent = '-' + n;
    el.style.left = ((p.x + 1) / 2) * 100 + '%';
    el.style.top = ((1 - p.y) / 2) * 100 + '%';
    el.style.animation = 'none';
    stage.appendChild(el);
    tw.tween(
      1.1,
      (_e, t) => {
        const k = t < 0.15 ? t / 0.15 : 1;
        const rise = -30 - 30 * k - 130 * Math.max(0, (t - 0.15) / 0.85);
        el.style.transform = `translate(-50%, ${rise}%) scale(${t < 0.15 ? 0.6 + 0.55 * k : 1})`;
        el.style.opacity = String(t < 0.15 ? k : 1 - (t - 0.15) / 0.85);
      },
      ease.lin,
    ).then(
      () => el.remove(),
      () => el.remove(),
    );
  };

  const dmg = (f: Chog, n: number, crit = false) => {
    setHP(f, f.hp - n);
    popNumber(f, n, crit);
    f.face('hurt');
    tw.wait(0.6).then(
      () => {
        if (f.hp > 0) f.face('normal');
      },
      () => {},
    );
    return n;
  };

  // battle feed: newest line on top, big and readable; {a}/{b} become coloured names
  const say = (text: string, opts: SayOptions = {}) => {
    const feed = byId('feed');
    const li = document.createElement('li');
    li.className = FEED_ITEM;
    if (opts.kind) li.dataset['kind'] = opts.kind;
    const names: Record<string, Chog | undefined> = { a: opts.a, b: opts.b };
    li.innerHTML =
      escapeHtml(text).replace(/\{(\w+)\}/g, (_, k: string) => {
        const f = names[k];
        return `<b class="${f && isMine(f) ? NAME_MINE : NAME_FOE}">${escapeHtml(f?.name ?? k)}</b>`;
      }) + (opts.hit ? ` <span class="${HIT_TAG}">-${opts.hit}</span>` : '');
    feed.prepend(li);
    while (feed.children.length > FEED_MAX) feed.lastChild?.remove();
  };

  const banner = (text: string, gold = false) => {
    const b = byId('banner');
    b.textContent = text;
    setFlag(b, 'gold', gold);
    setFlag(b, 'on', true);
  };

  return {
    setHP,
    dmg,
    say,
    banner,
    bannerOff: () => {
      setFlag(byId('banner'), 'on', false);
    },
    chip: (id, on) => {
      setFlag(byId(id), 'lit', on);
    },
  };
}
