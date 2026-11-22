// Mouse and keyboard: click a card to pick it up, click it again (or press Enter)
// to play it; keys 1-7 pick a hand card; Space starts, ends the turn, or plays
// again; R restarts; M mutes; Esc drops the picked card. Actions are bits so the
// main loop can read several keys at once.
import { layout } from './render.js';

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas, hooks) {
  let actions = 0;
  let selectedIndex = -1;

  function pointIn(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function clickAt(x, y) {
    const state = hooks.state();
    const screen = hooks.screen();
    if (screen === 'title' || screen === 'over') {
      actions |= ACTION_CONFIRM;
      return;
    }
    if (screen === 'paused') {
      actions |= ACTION_CONFIRM;
      return;
    }
    if (state.phase !== 'play' || state.current !== 'you') return;
    const L = layout(state);
    if (pointIn(L.endTurn, x, y)) {
      actions |= ACTION_END_TURN;
      return;
    }
    for (let i = 0; i < L.hand.length; i += 1) {
      const slot = L.hand[i];
      const raised = selectedIndex === i;
      const rect = raised ? { ...slot, y: slot.y - 26 } : slot;
      if (pointIn(rect, x, y)) {
        if (selectedIndex === i) {
          hooks.play(i);
          selectedIndex = -1;
        } else {
          selectedIndex = i;
        }
        return;
      }
    }
    selectedIndex = -1;
  }

  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(event);
    clickAt(p.x, p.y);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const state = hooks.state();
    const screen = hooks.screen();
    if (event.key >= '1' && event.key <= '7') {
      const index = Number(event.key) - 1;
      if (screen === 'play' && state.phase === 'play' && index < state.you.hand.length) {
        selectedIndex = selectedIndex === index ? -1 : index;
      }
      return;
    }
    if (event.key === 'Enter') {
      if (screen === 'title' || screen === 'over' || screen === 'paused') {
        actions |= ACTION_CONFIRM;
      } else if (selectedIndex >= 0) {
        hooks.play(selectedIndex);
        selectedIndex = -1;
      } else {
        actions |= ACTION_END_TURN;
      }
      event.preventDefault();
      return;
    }
    if (event.key === ' ') {
      if (screen === 'title' || screen === 'over' || screen === 'paused') {
        actions |= ACTION_CONFIRM;
      } else {
        actions |= ACTION_END_TURN;
      }
      event.preventDefault();
      return;
    }
    if (event.key === 'r' || event.key === 'R') actions |= ACTION_RESTART;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
    if (event.key === 'Escape') selectedIndex = -1;
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    get selectedIndex() {
      return selectedIndex;
    },
    clearSelection() {
      selectedIndex = -1;
    },
  };
}
