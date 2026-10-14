// The pick screen, move chips and battle buttons for the 1v1 prototype.
import { SHOTS } from '../camera/camera-rig';
import { byId, setFlag, showError } from '../hud/dom';
import { MOVE_BUTTON } from '../hud/classes';
import { CANCELLED } from '../engine/tween';
import type { Fighter } from '../arena/world';
import type { Game } from './game';
import { fight } from './fight';
import { MOVES, movesOf } from './moves';

const NEXT_FIGHT_DELAY = 0.6;

function renderMoveChips(me: Fighter): void {
  const box = byId('moves');
  box.innerHTML = '';
  for (const k of movesOf(me)) {
    const b = document.createElement('button');
    b.className = MOVE_BUTTON;
    b.type = 'button';
    b.textContent = MOVES[k].label;
    b.dataset['k'] = k;
    b.onclick = () => {
      me.nextMove = me.nextMove === k ? null : k;
      box
        .querySelectorAll<HTMLElement>('[data-k]')
        .forEach((x) => setFlag(x, 'on', x.dataset['k'] === me.nextMove));
    };
    box.appendChild(b);
  }
}

function setupSides(game: Game, mine: Fighter): void {
  const [a, b] = game.world.fighters;
  const me = mine;
  const foe = mine === a ? b : a;
  game.match.me = me;
  game.match.foe = foe;
  game.cam.track(me, foe);
  const pa = byId<HTMLImageElement>('pa');
  const pb = byId<HTMLImageElement>('pb');
  pa.src = me.portrait;
  pb.src = foe.portrait;
  pa.alt = me.name;
  pb.alt = foe.name;
  byId('na').textContent = me.name;
  byId('nb').textContent = foe.name;
  renderMoveChips(me);
}

/** Runs fights back to back until cancelled. */
async function start(game: Game): Promise<void> {
  game.tw.cancelAll();
  byId('pickView').hidden = true;
  byId('battleView').hidden = false;
  try {
    await fight(game);
    await game.tw.wait(NEXT_FIGHT_DELAY);
    void start(game);
  } catch (error) {
    if (error === CANCELLED) return;
    showError('The fight broke: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export function choose(game: Game, f: Fighter): void {
  setupSides(game, f);
  void start(game);
}

function backToPick(game: Game): void {
  game.tw.cancelAll();
  byId('battleView').hidden = true;
  byId('pickView').hidden = false;
  setFlag(byId('hud'), 'on', false);
  game.hud.bannerOff();
  for (const f of game.world.fighters) {
    f.g.visible = false;
    f.free = false;
  }
  game.world.paw.g.visible = false;
  void game.cam.shot(...SHOTS.up, 0.8);
}

export function bindUi(game: Game): void {
  const [a, b] = game.world.fighters;
  byId<HTMLImageElement>('la').src = a.portrait;
  byId<HTMLImageElement>('lb').src = b.portrait;
  byId('lendA').onclick = () => choose(game, a);
  byId('lendB').onclick = () => choose(game, b);
  byId('own').onclick = () => {
    byId('ownNote').hidden = false;
  };
  byId('replay').onclick = () => void start(game);
  byId('change').onclick = () => backToPick(game);
  byId('meddle').onclick = () => {
    game.match.meddleQueued = true;
    byId<HTMLButtonElement>('meddle').disabled = true;
  };
}
