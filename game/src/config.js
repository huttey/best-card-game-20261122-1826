// Tidecaller — every tuning number, colour and card in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIFE_START = 20;
export const HAND_START = 5;
export const HAND_MAX = 7;
export const BOARD_MAX = 3;
export const DECK_SIZE = 30;
export const SHELLS_MAX = 10;
export const FATIGUE_DAMAGE = 1;

/** A tide bonus is +1 to a card's numbers when the previous card played this turn shares its tide. */
export const TIDE_BONUS = 1;

/** Tides: each card carries one. Colour and shape both tell it apart, never text alone. */
export const TIDES = {
  moon: { name: 'Moon', colour: '#b79cff', dark: '#6d4fd0' },
  wave: { name: 'Wave', colour: '#4fd8e8', dark: '#1d7f92' },
  coral: { name: 'Coral', colour: '#ff8fb0', dark: '#c24a72' },
};

/**
 * The card catalogue. kind: 'creature' stays on the board and attacks at the end of
 * its owner's turn; 'spell' acts at once and is gone. guard creatures soak damage
 * before life does. text is the rule a player reads on the card.
 */
export const CARDS = [
  { id: 'minnow', name: 'Lagoon Minnow', kind: 'creature', cost: 1, atk: 1, hp: 1, tide: 'wave', text: 'Small, quick, everywhere.' },
  { id: 'jelly', name: 'Moon Jelly', kind: 'creature', cost: 2, atk: 2, hp: 2, tide: 'moon', text: 'Drifts in glowing.' },
  { id: 'guard', name: 'Coral Guard', kind: 'creature', cost: 2, atk: 1, hp: 3, tide: 'coral', guard: true, text: 'Guard: soaks hits first.' },
  { id: 'heron', name: 'Tide Heron', kind: 'creature', cost: 3, atk: 3, hp: 2, tide: 'wave', text: 'Strikes from the shallows.' },
  { id: 'singer', name: 'Shell Singer', kind: 'creature', cost: 3, atk: 2, hp: 4, tide: 'coral', text: 'Sings the reef awake.' },
  { id: 'eel', name: 'Dusk Eel', kind: 'creature', cost: 4, atk: 4, hp: 3, tide: 'moon', text: 'Slips through the dark.' },
  { id: 'turtle', name: 'Reef Turtle', kind: 'creature', cost: 4, atk: 2, hp: 6, tide: 'coral', guard: true, text: 'Guard: a wall that swims.' },
  { id: 'gull', name: 'Storm Gull', kind: 'creature', cost: 5, atk: 5, hp: 4, tide: 'wave', text: 'Rides the gale down.' },
  { id: 'whale', name: 'Moonwhale', kind: 'creature', cost: 6, atk: 6, hp: 6, tide: 'moon', text: 'The lagoon itself, surfacing.' },
  { id: 'crash', name: 'Wave Crash', kind: 'spell', cost: 2, damage: 3, tide: 'wave', text: 'Deal 3 to the foe.' },
  { id: 'mend', name: 'Coral Mend', kind: 'spell', cost: 2, heal: 4, tide: 'coral', text: 'Heal 4 life.' },
  { id: 'dive', name: 'Pearl Dive', kind: 'spell', cost: 2, draw: 2, tide: 'moon', text: 'Draw 2 cards.' },
  { id: 'surge', name: 'Storm Surge', kind: 'spell', cost: 4, sweep: 2, tide: 'wave', text: 'Deal 2 to every foe creature.' },
];

/** How many copies of each card go into a 30-card deck. */
export const DECKLIST = {
  minnow: 2, jelly: 2, guard: 2, heron: 2, singer: 2, eel: 2, turtle: 2, gull: 2, whale: 2,
  crash: 3, mend: 3, dive: 3, surge: 3,
};

export const PALETTE = {
  backdrop: '#0b1020',
  lagoon: '#101a33',
  lagoonDeep: '#0a1226',
  sand: '#2a2f45',
  panel: '#1a2340',
  panelLine: '#33406b',
  text: '#eef1f5',
  muted: '#9aa5c4',
  gold: '#f2c94c',
  shell: '#7fe3d0',
  life: '#ff6b81',
  enemy: '#e5534b',
  ally: '#4fc3f7',
  button: '#2b3a6b',
  buttonHot: '#3d5296',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'tidecaller.best';
