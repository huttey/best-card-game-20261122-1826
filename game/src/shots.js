// The screenshot scenes behind ?shot=title|table|win|loss. Each one plays the real
// rules forward from a fresh world, steered by the same greedy autopilot for you
// and the foe's own heuristic, so the frame is what a real game looks like and
// the same seed always gives the same frame. For win/loss it tries seeds in order
// until the outcome matches, still by the rules alone.
import { createRandom } from './random.js';
import { createWorld, PHASE_OVER, SIDE_YOU } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const MAX_TURNS = 14;

/** You, on autopilot: play every affordable card, cheapest first. */
function playGreedy(world) {
  const state = world.state;
  let played = true;
  while (played && state.phase !== PHASE_OVER) {
    played = false;
    for (let i = 0; i < state.you.hand.length; i += 1) {
      const card = state.you.hand[i];
      if (card.cost <= state.you.shells && (card.kind === 'spell' || state.you.board.length < 3)) {
        world.playCard(state.you, i);
        played = true;
        break;
      }
    }
  }
}

/** One full round (your turn, then the foe's) by the rules. */
function playRound(world) {
  const state = world.state;
  if (state.phase === PHASE_OVER) return;
  playGreedy(world);
  if (state.phase === PHASE_OVER) return;
  world.endTurn();
  if (state.phase === PHASE_OVER) return;
  while (world.foeStep() && state.phase !== PHASE_OVER) {}
  if (state.phase === PHASE_OVER) return;
  world.endTurn();
}

/** Play from a seed until `stop(state)` is true or the game ends. */
function simulate(seed, stop) {
  const world = createWorld(createRandom(seed));
  world.startGame();
  let rounds = 0;
  while (world.state.phase !== PHASE_OVER && rounds < MAX_TURNS) {
    playRound(world);
    rounds += 1;
    if (stop && stop(world.state)) break;
  }
  return world;
}

function tableLooksGood(state) {
  return (
    state.phase !== PHASE_OVER &&
    state.turn >= 4 &&
    state.you.board.length >= 1 &&
    state.foe.board.length >= 1 &&
    state.you.hand.length >= 3 &&
    state.foe.hand.length >= 3
  );
}

/**
 * Stage the named scene (title, table, win or loss; any other name is title) and
 * return the state to draw, the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'table') {
    for (let seed = 1; seed <= 40; seed += 1) {
      const sim = simulate(seed, tableLooksGood);
      if (tableLooksGood(sim.state)) {
        return { screen: SCREEN_PLAY, best: 0, state: sim.state };
      }
    }
    const fallback = simulate(1, null);
    return { screen: SCREEN_PLAY, best: 0, state: fallback.state };
  }
  if (name === 'win' || name === 'loss') {
    const wantYou = name === 'win';
    for (let seed = 1; seed <= 60; seed += 1) {
      const sim = simulate(seed, null);
      if (sim.state.phase === PHASE_OVER && (sim.state.winner === SIDE_YOU) === wantYou) {
        return { screen: SCREEN_OVER, best: 0, state: sim.state };
      }
    }
    const fallback = simulate(1, null);
    return { screen: SCREEN_OVER, best: 0, state: fallback.state };
  }
  world.reset();
  return { screen: SCREEN_TITLE, best: 0, state: world.state };
}
