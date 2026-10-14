import { STAGE_MESSAGE } from './classes';

/** Looks up a required element by id, failing loudly if the markup is missing it. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in the page`);
  return el as T;
}

/** Replaces the loading message with an error the player can see. */
export function showError(message: string): void {
  const el = document.getElementById('loading') ?? document.createElement('div');
  el.id = 'loading';
  el.className = STAGE_MESSAGE;
  el.textContent = message;
  if (!el.isConnected) byId('stage').append(el);
}

/** Turns a boolean data attribute on or off; styling reacts through Tailwind data-* variants. */
export function setFlag(el: HTMLElement, name: string, on: boolean): void {
  el.toggleAttribute(`data-${name}`, on);
}
