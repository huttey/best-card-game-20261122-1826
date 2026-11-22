// Tidecaller rules, as pure state: no DOM here, so the same code runs in the browser
// and in a Node test. Two tidecallers duel on a lagoon. Each turn a player refills
// shells, draws a card, plays cards from hand, then their creatures attack: the
// foe's guards soak the damage first and the rest hits the foe's life. First to 0
// life loses. Playing two cards of the same tide in one turn gives the second +1.
import {
  BOARD_MAX, DECK_SIZE, FATIGUE_DAMAGE, HAND_MAX, HAND_START, LIFE_START,
  SHELLS_MAX, TIDE_BONUS,
} from './config.js';
import { buildDeck, freshCard } from './deck.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_OVER = 'over';

export const SIDE_YOU = 'you';
export const SIDE_FOE = 'foe';

function newSide(random) {
  return {
    life: LIFE_START,
    shells: 0,
    maxShells: 0,
    deck: buildDeck(random),
    hand: [],
    board: [],
    discard: [],
  };
}

export function createWorld(random) {
  let uid = 0;
  const state = {
    phase: PHASE_TITLE,
    turn: 0,
    current: SIDE_YOU,
    you: null,
    foe: null,
    winner: null,
    lastTide: null,
    log: [],
    stats: { cardsPlayed: 0, damageDealt: 0, turnsPlayed: 0 },
  };

  function log(message) {
    state.log.push(message);
    if (state.log.length > 5) state.log.shift();
  }

  function drawCard(side, who) {
    if (side.deck.length === 0) {
      side.life -= FATIGUE_DAMAGE;
      log(`${who} draws from an empty deck and loses ${FATIGUE_DAMAGE} life.`);
      return null;
    }
    const card = freshCard(side.deck.pop(), uid);
    uid += 1;
    if (side.hand.length >= HAND_MAX) {
      side.discard.push(card);
      log(`${who}'s hand is full — ${card.name} sinks.`);
      return null;
    }
    side.hand.push(card);
    return card;
  }

  function startSideTurn(side, who) {
    side.maxShells = Math.min(state.turn, SHELLS_MAX);
    side.shells = side.maxShells;
    drawCard(side, who);
    state.lastTide = null;
  }

  function reset() {
    uid = 0;
    state.phase = PHASE_TITLE;
    state.turn = 1;
    state.current = SIDE_YOU;
    state.you = newSide(random);
    state.foe = newSide(random);
    state.winner = null;
    state.lastTide = null;
    state.log = [];
    state.stats = { cardsPlayed: 0, damageDealt: 0, turnsPlayed: 0 };
    for (let i = 0; i < HAND_START; i += 1) {
      drawCard(state.you, 'You');
      drawCard(state.foe, 'Nixie');
    }
    log('The lagoon is still. Tidecaller, begin.');
  }

  function startGame() {
    reset();
    state.phase = PHASE_PLAY;
    startSideTurn(state.you, 'You');
    log(`Turn 1 — you hold ${state.you.maxShells} shell.`);
  }

  /** Damage that first soaks into guards, then hits life. Returns life damage dealt. */
  function dealDamage(defender, amount, who) {
    let left = amount;
    for (const guard of defender.board) {
      if (left <= 0) break;
      if (!guard.guard || guard.hp <= 0) continue;
      const soak = Math.min(guard.hp, left);
      guard.hp -= soak;
      left -= soak;
      log(`${guard.name} soaks ${soak}.`);
    }
    defender.board = defender.board.filter((c) => c.hp > 0);
    if (left > 0) {
      defender.life -= left;
      log(`${who} loses ${left} life.`);
    }
    return left;
  }

  function checkEnd() {
    if (state.you.life <= 0 && state.foe.life <= 0) {
      state.winner = state.you.life >= state.foe.life ? SIDE_YOU : SIDE_FOE;
    } else if (state.foe.life <= 0) {
      state.winner = SIDE_YOU;
    } else if (state.you.life <= 0) {
      state.winner = SIDE_FOE;
    }
    if (state.winner) state.phase = PHASE_OVER;
    return state.winner !== null;
  }

  /** Creatures of `attacker` strike at the end of its turn. */
  function creaturesAttack(attacker, defender, who) {
    let total = 0;
    for (const creature of attacker.board) total += creature.atk;
    if (total <= 0) return;
    log(`${who}'s creatures strike for ${total}.`);
    const lifeDamage = dealDamage(defender, total, who === 'You' ? 'Nixie' : 'You');
    if (who === 'You') state.stats.damageDealt += lifeDamage;
  }

  function tideBonusFor(card) {
    return state.lastTide !== null && state.lastTide === card.tide ? TIDE_BONUS : 0;
  }

  /**
   * Play the card at `handIndex` for `side`. Returns true when it was played.
   * Spells act at once; creatures join the board. A same-tide card played right
   * after one of its tide gains +1 to its numbers.
   */
  function playCard(side, handIndex) {
    if (state.phase !== PHASE_PLAY) return false;
    const card = side.hand[handIndex];
    if (!card || side.shells < card.cost) return false;
    if (card.kind === 'creature' && side.board.length >= BOARD_MAX) return false;
    const bonus = tideBonusFor(card);
    side.shells -= card.cost;
    side.hand.splice(handIndex, 1);
    state.lastTide = card.tide;
    state.stats.cardsPlayed += 1;
    const who = side === state.you ? 'You' : 'Nixie';
    if (card.kind === 'creature') {
      card.atk += bonus;
      card.hp += bonus;
      card.maxHp += bonus;
      side.board.push(card);
      log(`${who} plays ${card.name}${bonus ? ` (+${bonus} tide)` : ''}.`);
    } else if (card.damage) {
      const amount = card.damage + bonus;
      const foe = side === state.you ? state.foe : state.you;
      const dealt = dealDamage(foe, amount, side === state.you ? 'Nixie' : 'You');
      if (side === state.you) state.stats.damageDealt += dealt;
      log(`${who} casts ${card.name} for ${amount}.`);
      side.discard.push(card);
    } else if (card.heal) {
      side.life = Math.min(LIFE_START, side.life + card.heal + bonus);
      log(`${who} mends ${card.heal + bonus} life.`);
      side.discard.push(card);
    } else if (card.draw) {
      for (let i = 0; i < card.draw + bonus; i += 1) drawCard(side, who);
      log(`${who} dives for ${card.draw + bonus} cards.`);
      side.discard.push(card);
    } else if (card.sweep) {
      const foe = side === state.you ? state.foe : state.you;
      const amount = card.sweep + bonus;
      for (const creature of foe.board) creature.hp -= amount;
      foe.board = foe.board.filter((c) => c.hp > 0);
      log(`${who} surges the reef for ${amount}.`);
      side.discard.push(card);
    }
    checkEnd();
    return true;
  }

  /** End the current side's turn: creatures attack, then the other side begins. */
  function endTurn() {
    if (state.phase !== PHASE_PLAY) return;
    const attacker = state.current === SIDE_YOU ? state.you : state.foe;
    const defender = state.current === SIDE_YOU ? state.foe : state.you;
    creaturesAttack(attacker, defender, state.current === SIDE_YOU ? 'You' : 'Nixie');
    if (checkEnd()) return;
    state.current = state.current === SIDE_YOU ? SIDE_FOE : SIDE_YOU;
    if (state.current === SIDE_YOU) {
      state.turn += 1;
      state.stats.turnsPlayed = state.turn;
    }
    const next = state.current === SIDE_YOU ? state.you : state.foe;
    startSideTurn(next, state.current === SIDE_YOU ? 'You' : 'Nixie');
    log(`Turn ${state.turn} — ${state.current === SIDE_YOU ? 'your' : "Nixie's"} move.`);
  }

  /**
   * The foe's move, one card at a time so the browser can pace it: returns true
   * when the foe still has a card worth playing, false when it ends its turn.
   * Heuristic: win now if it can, heal when hurt, guard when low, else the
   * strongest creature it can afford.
   */
  function foeStep() {
    const foe = state.foe;
    const you = state.you;
    const affordable = foe.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.cost <= foe.shells);
    if (affordable.length === 0) return false;

    const lethal = affordable.find(({ card }) => {
      if (!card.damage) return false;
      const guardHp = foeGuardHp();
      return card.damage + tideBonusFor(card) - guardHp >= you.life;
    });
    if (lethal) {
      const played = playCard(foe, lethal.index);
      return played && state.phase === PHASE_PLAY;
    }
    if (foe.life <= 8) {
      const mend = affordable.find(({ card }) => card.heal);
      if (mend) {
        const played = playCard(foe, mend.index);
        return played && state.phase === PHASE_PLAY;
      }
    }
    if (foe.life <= 10) {
      const guard = affordable.find(({ card }) => card.guard && card.kind === 'creature');
      if (guard) {
        const played = playCard(foe, guard.index);
        return played && state.phase === PHASE_PLAY;
      }
    }
    const sweep = affordable.find(({ card }) => card.sweep && you.board.length >= 2);
    if (sweep) {
      const played = playCard(foe, sweep.index);
      return played && state.phase === PHASE_PLAY;
    }
    const best = affordable
      .filter(({ card }) => card.kind === 'creature')
      .sort((a, b) => b.card.atk + b.card.hp - (a.card.atk + a.card.hp))[0];
    if (best) {
      const played = playCard(foe, best.index);
      return played && state.phase === PHASE_PLAY;
    }
    const spell = affordable.find(({ card }) => card.damage || card.draw);
    if (spell) {
      const played = playCard(foe, spell.index);
      return played && state.phase === PHASE_PLAY;
    }
    return false;

    function foeGuardHp() {
      let total = 0;
      for (const guard of you.board) if (guard.guard) total += guard.hp;
      return total;
    }
  }

  function score() {
    if (!state.winner) return 0;
    return state.you.life * 10 + Math.max(0, 30 - state.turn) * 5 + state.stats.cardsPlayed * 2;
  }

  return {
    state,
    reset,
    startGame,
    playCard,
    endTurn,
    foeStep,
    dealDamage,
    score,
  };
}

/** A fresh deck has exactly DECK_SIZE cards; used by the Node test. */
export function deckSize() {
  return DECK_SIZE;
}
