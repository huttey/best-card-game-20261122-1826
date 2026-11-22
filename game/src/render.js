// Tidecaller painting: every pixel on one canvas, 1280x720 logical, scaled to the
// window. Cards are drawn, not images: rounded rects, a tide symbol (crescent,
// wave or shell — colour and shape both tell the tide apart), cost, name, text,
// attack and health. The layout is shared with input.js through layout(state).
import { FIELD, FONT, PALETTE, TIDES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HAND_CARD = { w: 132, h: 186 };
const BOARD_CARD = { w: 118, h: 164 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size, y + size * 0.1, x - size * 0.4, y - size * 0.8, x, y - size * 0.15);
  ctx.bezierCurveTo(x + size * 0.4, y - size * 0.8, x + size, y + size * 0.1, x, y + size * 0.9);
  ctx.fill();
}

function drawSword(ctx, x, y, size, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.45, y + size * 0.2);
  ctx.lineTo(x + size * 0.18, y + size * 0.2);
  ctx.lineTo(x + size * 0.18, y + size);
  ctx.lineTo(x - size * 0.18, y + size);
  ctx.lineTo(x - size * 0.18, y + size * 0.2);
  ctx.lineTo(x - size * 0.45, y + size * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawShell(ctx, x, y, size, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.5);
    ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size * 0.9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y + size * 0.5, size * 0.95, Math.PI, 0);
  ctx.stroke();
}

/** The tide's own shape, drawn at (x, y) with radius `size`, in its own colour. */
export function drawTideSymbol(ctx, tide, x, y, size) {
  const colour = TIDES[tide].colour;
  if (tide === 'moon') {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101a33';
    ctx.beginPath();
    ctx.arc(x + size * 0.45, y - size * 0.2, size * 0.85, 0, Math.PI * 2);
    ctx.fill();
  } else if (tide === 'wave') {
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.lineCap = 'round';
    for (let row = -1; row <= 1; row += 1) {
      ctx.beginPath();
      const yy = y + row * size * 0.55;
      for (let px = -size; px <= size; px += 4) {
        const py = yy + Math.sin((px / size) * Math.PI) * size * 0.35;
        if (px === -size) ctx.moveTo(x + px, py);
        else ctx.lineTo(x + px, py);
      }
      ctx.stroke();
    }
  } else {
    drawShell(ctx, x, y, size, colour);
  }
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#1d2b52';
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 7);
  ctx.strokeStyle = '#33406b';
  ctx.stroke();
  drawTideSymbol(ctx, 'moon', x + w / 2, y + h / 2, Math.min(w, h) * 0.22);
}

function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const tide = TIDES[card.tide];
  ctx.save();
  if (opts.selected) {
    ctx.shadowColor = tide.colour;
    ctx.shadowBlur = 18;
  }
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = opts.dim ? '#141b31' : '#f4efe4';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = opts.selected ? 4 : 2;
  ctx.strokeStyle = opts.selected ? tide.colour : tide.dark;
  ctx.stroke();
  ctx.restore();

  const ink = opts.dim ? '#5a6480' : '#1a2340';
  // Cost: gold circle, top left.
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(x + 18, y + 18, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a2340';
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 18, y + 19);
  // Tide symbol, top right.
  drawTideSymbol(ctx, card.tide, x + w - 20, y + 19, 11);
  // Name.
  ctx.fillStyle = ink;
  ctx.font = `bold ${Math.max(11, w * 0.085)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(card.name, x + w / 2, y + 46);
  // Art: the tide symbol big, with a guard ring for guards.
  if (card.guard) {
    ctx.strokeStyle = tide.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.45, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawTideSymbol(ctx, card.tide, x + w / 2, y + h * 0.45, 26);
  // Rule text.
  ctx.fillStyle = ink;
  ctx.font = `${Math.max(10, w * 0.075)}px ${FONT}`;
  ctx.fillText(card.text, x + w / 2, y + h - 52, w - 14);
  if (card.guard) {
    ctx.fillStyle = tide.dark;
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('GUARD', x + w / 2, y + h - 36);
  }
  // Attack bottom left, health bottom right (creatures).
  if (card.kind === 'creature') {
    drawSword(ctx, x + 20, y + h - 22, 11, '#c24a3a');
    ctx.fillStyle = ink;
    ctx.font = `bold 19px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(card.atk), x + 34, y + h - 16);
    drawHeart(ctx, x + w - 34, y + h - 24, 10, PALETTE.life);
    ctx.fillStyle = ink;
    ctx.textAlign = 'right';
    ctx.fillText(String(card.hp), x + w - 14, y + h - 16);
    ctx.textAlign = 'center';
  } else {
    // Spells show their one number in the middle bottom.
    const num = card.damage || card.heal || card.draw || card.sweep || 0;
    const label = card.damage ? 'DMG' : card.heal ? 'HEAL' : card.draw ? 'DRAW' : 'SWEEP';
    ctx.fillStyle = tide.dark;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`${label} ${num}`, x + w / 2, y + h - 16);
  }
}

/** Where everything sits, from the state alone. Input uses this for hit-testing. */
export function layout(state) {
  const you = state.you;
  const foe = state.foe;
  const hand = [];
  const n = you ? you.hand.length : 0;
  const totalW = n * (HAND_CARD.w + 8) - 8;
  const startX = (FIELD.width - totalW) / 2;
  for (let i = 0; i < n; i += 1) {
    hand.push({ uid: you.hand[i].uid, x: startX + i * (HAND_CARD.w + 8), y: 516, w: HAND_CARD.w, h: HAND_CARD.h });
  }
  const boardYou = [];
  for (let i = 0; i < 3; i += 1) {
    boardYou.push({ x: 440 + i * (BOARD_CARD.w + 14), y: 336, w: BOARD_CARD.w, h: BOARD_CARD.h });
  }
  const boardFoe = [];
  for (let i = 0; i < 3; i += 1) {
    boardFoe.push({ x: 440 + i * (BOARD_CARD.w + 14), y: 148, w: BOARD_CARD.w, h: BOARD_CARD.h });
  }
  return {
    hand,
    boardYou,
    boardFoe,
    endTurn: { x: 1090, y: 330, w: 150, h: 56 },
    restart: { x: 565, y: 470, w: 150, h: 52 },
    foeHand: { x: 1090, y: 96, w: 150, h: 44 },
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  /** uid -> {x, y} for the slide animation; cards glide toward their slot. */
  const positions = new Map();

  function place(uid, tx, ty) {
    const p = positions.get(uid) ?? { x: tx, y: ty - 40 };
    p.x += (tx - p.x) * 0.3;
    p.y += (ty - p.y) * 0.3;
    positions.set(uid, p);
    return p;
  }

  function drawBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#0d1330');
    g.addColorStop(0.55, PALETTE.lagoon);
    g.addColorStop(1, PALETTE.lagoonDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Moon and its path on the water, kept clear of the log line at y=100.
    ctx.fillStyle = '#f5eeda';
    ctx.beginPath();
    ctx.arc(640, 66, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245, 238, 218, 0.12)';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(610 - i * 5, 122 + i * 14, 60 + i * 10, 3);
    }
    // Gentle wave lines across the table.
    ctx.strokeStyle = 'rgba(127, 227, 208, 0.14)';
    ctx.lineWidth = 2;
    for (const yy of [120, 330, 510]) {
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 8) {
        const y = yy + Math.sin((x / 90) + yy) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawLife(ctx2, x, y, life, label, colour) {
    ctx2.textAlign = 'left';
    ctx2.textBaseline = 'middle';
    drawHeart(ctx2, x + 12, y, 12, PALETTE.life);
    ctx2.fillStyle = PALETTE.text;
    ctx2.font = `bold 30px ${FONT}`;
    ctx2.fillText(String(Math.max(0, life)), x + 30, y + 1);
    ctx2.fillStyle = PALETTE.muted;
    ctx2.font = `13px ${FONT}`;
    ctx2.fillText(label, x, y + 26);
  }

  function drawShells(ctx2, x, y, shells, maxShells) {
    ctx2.textAlign = 'left';
    ctx2.font = `13px ${FONT}`;
    ctx2.fillStyle = PALETTE.muted;
    ctx2.fillText('SHELLS', x, y - 14);
    for (let i = 0; i < maxShells; i += 1) {
      drawShell(ctx2, x + 12 + i * 24, y + 8, 8, i < shells ? PALETTE.shell : '#2a3352');
    }
  }

  function drawTitle(state, best) {
    drawBackdrop();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawTideSymbol(ctx, 'moon', 640, 150, 44);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('TIDECALLER', 640, 250);
    ctx.fillStyle = PALETTE.shell;
    ctx.font = `26px ${FONT}`;
    ctx.fillText('A duel of shells and tides on a moonlit lagoon', 640, 310);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText('Play cards for shells. Creatures strike at the end of your turn.', 640, 380);
    ctx.fillText('Guards soak hits first. Two cards of one tide in a turn: the second gains +1.', 640, 408);
    ctx.fillText('First tidecaller to 0 life loses the lagoon.', 640, 436);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(`Best score: ${best}`, 640, 486);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText('Click or press Space to begin', 640, 540);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('Keys 1–7 pick a card · Enter plays it · Space ends your turn · R restarts · M mutes', 640, 580);
  }

  function drawOver(state, best) {
    drawBackdrop();
    const won = state.winner === 'you';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = won ? PALETTE.gold : PALETTE.enemy;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText(won ? 'THE LAGOON IS YOURS' : 'THE TIDE TAKES YOU', 640, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `24px ${FONT}`;
    ctx.fillText(
      won
        ? `Nixie yields. You kept ${Math.max(0, state.you.life)} life after ${state.turn} turns.`
        : `Nixie keeps the lagoon. You lasted ${state.turn} turns.`,
      640, 320,
    );
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 28px ${FONT}`;
    const score = won
      ? Math.max(0, state.you.life) * 10 + Math.max(0, 30 - state.turn) * 5 + state.stats.cardsPlayed * 2
      : 0;
    ctx.fillText(won ? `Score: ${score}` : 'No score — the lagoon keeps its own', 640, 360);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText(`Cards played: ${state.stats.cardsPlayed} · Damage dealt: ${state.stats.damageDealt}`, 640, 400);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(`Best score: ${best}`, 640, 440);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText('Press Space or click to play again', 640, 510);
  }

  function drawPlay(state, screen, selectedIndex) {
    drawBackdrop();
    const L = layout(state);
    const you = state.you;
    const foe = state.foe;

    // Top bar: turn, tide, log.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`Turn ${state.turn}`, 24, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(state.current === 'you' ? 'Your move — play cards, then end your turn' : "Nixie is thinking…", 24, 56);
    if (state.lastTide) {
      drawTideSymbol(ctx, state.lastTide, 1200, 30, 13);
      ctx.fillStyle = TIDES[state.lastTide].colour;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${TIDES[state.lastTide].name} tide this turn`, 1176, 30);
      ctx.textAlign = 'left';
    }
    const lastLog = state.log[state.log.length - 1] ?? '';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(lastLog, 640, 100);
    ctx.textAlign = 'left';

    // Foe: name, life, hand backs, board.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText('Nixie — Tidecaller of the North Reef', 24, 96);
    drawLife(ctx, 24, 140, foe.life, 'LIFE', PALETTE.enemy);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`DECK ${foe.deck.length}`, 24, 198);
    for (let i = 0; i < Math.min(foe.hand.length, 5); i += 1) {
      drawCardBack(ctx, 1090 + i * 12, 96, 44, 62);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${foe.hand.length} cards in hand`, 1090, 176);
    foe.board.forEach((card, i) => {
      const slot = L.boardFoe[i];
      const p = place(card.uid, slot.x, slot.y);
      drawCard(ctx, card, p.x, p.y, slot.w, slot.h);
    });
    for (let i = foe.board.length; i < 3; i += 1) {
      const slot = L.boardFoe[i];
      ctx.strokeStyle = 'rgba(154, 165, 196, 0.35)';
      ctx.setLineDash([6, 6]);
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Your board.
    you.board.forEach((card, i) => {
      const slot = L.boardYou[i];
      const p = place(card.uid, slot.x, slot.y);
      drawCard(ctx, card, p.x, p.y, slot.w, slot.h);
    });
    for (let i = you.board.length; i < 3; i += 1) {
      const slot = L.boardYou[i];
      ctx.strokeStyle = 'rgba(154, 165, 196, 0.35)';
      ctx.setLineDash([6, 6]);
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // End Turn button (only on your turn).
    const btn = L.endTurn;
    const myTurn = state.current === 'you' && screen === SCREEN_PLAY;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fillStyle = myTurn ? PALETTE.buttonHot : PALETTE.button;
    ctx.fill();
    ctx.fillStyle = myTurn ? PALETTE.text : PALETTE.muted;
    ctx.font = `bold 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(myTurn ? 'End Turn ⏎' : 'Nixie…', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
    ctx.textAlign = 'left';

    // Your life, shells, deck.
    drawLife(ctx, 24, 380, you.life, 'YOUR LIFE', PALETTE.life);
    drawShells(ctx, 24, 440, you.shells, you.maxShells);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`DECK ${you.deck.length}`, 24, 480);

    // Your hand.
    you.hand.forEach((card, i) => {
      const slot = L.hand[i];
      const selected = selectedIndex === i;
      const p = place(card.uid, slot.x, selected ? slot.y - 26 : slot.y);
      const affordable = card.cost <= you.shells && state.current === 'you';
      drawCard(ctx, card, p.x, p.y, slot.w, slot.h, { selected, dim: !affordable });
    });

    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8, 12, 26, 0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 48px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', 640, 340);
      ctx.font = `20px ${FONT}`;
      ctx.fillText('Press Space or click to carry on', 640, 390);
      ctx.textAlign = 'left';
    }
  }

  function draw(state, screen, best, selectedIndex = -1) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else drawPlay(state, screen, selectedIndex);
  }

  return { draw, layout };
}
