// Boot and the one loop: input is read every frame, the world advances, and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over. The foe plays one card about every 0.7 s so its
// turn reads as a turn, not a jump.
//
// ?seed=N fixes the shuffle. ?shot=title|table|win|loss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_OVER, PHASE_PLAY, PHASE_TITLE, SIDE_FOE, SIDE_YOU } from './world.js';
import {
  ACTION_CONFIRM, ACTION_END_TURN, ACTION_MUTE, ACTION_RESTART, createInput,
} from './input.js';
import {
  SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';
import { createSound } from './sound.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene.state, scene.screen, scene.best, -1);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let foeTimer = 0;
  let lastYouLife = world.state.you ? world.state.you.life : 20;
  let lastFoeLife = world.state.foe ? world.state.foe.life : 20;

  function announce(message) {
    status.textContent = message;
  }

  const input = createInput(canvas, {
    state: () => world.state,
    screen: () => screen,
    play: (index) => {
      if (world.state.phase !== PHASE_PLAY || world.state.current !== SIDE_YOU) return;
      if (world.playCard(world.state.you, index)) sound.play();
    },
  });

  function startGame() {
    world.startGame();
    screen = SCREEN_PLAY;
    foeTimer = 0;
    lastYouLife = world.state.you.life;
    lastFoeLife = world.state.foe.life;
    announce('Playing. Your move — play cards, then end your turn.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.winner === SIDE_YOU) {
      const score = world.score();
      if (score > best) {
        best = score;
        saveBest(best);
      }
      sound.win();
      announce(`You win. Score ${score}. Best ${best}.`);
    } else {
      sound.lose();
      announce(`Nixie wins. Best ${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART) {
      input.clearSelection();
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      return;
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY && world.state.current === SIDE_YOU) {
      input.clearSelection();
      world.endTurn();
      foeTimer = 0;
      if (world.state.phase === PHASE_OVER) endGame();
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    if (world.state.phase !== PHASE_PLAY) return;
    if (world.state.current === SIDE_FOE) {
      foeTimer += STEP;
      if (foeTimer >= 0.7) {
        foeTimer = 0;
        const more = world.foeStep();
        if (!more) {
          world.endTurn();
          foeTimer = 0;
        }
      }
    }
    if (world.state.you.life < lastYouLife) sound.hit();
    if (world.state.foe.life < lastFoeLife) sound.hit();
    lastYouLife = world.state.you.life;
    lastFoeLife = world.state.foe.life;
    if (world.state.phase === PHASE_OVER) endGame();
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    step();
    const state = world.state;
    const drawScreen = state.phase === PHASE_TITLE
      ? SCREEN_TITLE
      : state.phase === PHASE_OVER ? SCREEN_OVER : screen;
    renderer.draw(state, drawScreen, best, input.selectedIndex);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  world.reset();
  window.__tidecaller = { world, get screen() { return screen; } };
  announce('Tidecaller. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
