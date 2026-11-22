// The deck: build a fresh 30-card deck from the catalogue and deal from it.
// A card in play is a plain object copied from its catalogue entry, so one copy's
// damage never leaks into another copy of the same card.
import { CARDS, DECKLIST } from './config.js';

export function cardById(id) {
  return CARDS.find((card) => card.id === id);
}

export function freshCard(id, uid) {
  const base = cardById(id);
  return {
    uid,
    id: base.id,
    name: base.name,
    kind: base.kind,
    cost: base.cost,
    atk: base.atk ?? 0,
    hp: base.hp ?? 0,
    maxHp: base.hp ?? 0,
    damage: base.damage ?? 0,
    heal: base.heal ?? 0,
    draw: base.draw ?? 0,
    sweep: base.sweep ?? 0,
    tide: base.tide,
    guard: Boolean(base.guard),
    text: base.text,
  };
}

export function buildDeck(random) {
  const ids = [];
  for (const [id, count] of Object.entries(DECKLIST)) {
    for (let i = 0; i < count; i += 1) ids.push(id);
  }
  return random.shuffle(ids);
}
