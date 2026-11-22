// A small seeded random number generator (mulberry32) so a seed always gives the
// same shuffle, the same draws and the same staged screenshots.

export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** An integer in [0, n). */
    int(n) {
      return Math.floor(next() * n);
    },
    /** Shuffle a copy of `items` in place order and return it. */
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
      }
      return items;
    },
  };
}
