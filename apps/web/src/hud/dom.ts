/** Looks up a required element by id, failing loudly if the markup is missing it. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in the page`);
  return el as T;
}
