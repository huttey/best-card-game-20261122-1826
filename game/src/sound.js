// Tiny original sounds, made with the Web Audio oscillator — no audio files.
// A soft pluck when a card is played, a low thud when life is lost, a little
// rising arpeggio when the lagoon is won.
export function createSound() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      ctx = new AudioCtx();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, when, dur, type, gain) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime + when);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur + 0.05);
  }

  return {
    play() {
      tone(520, 0, 0.18, 'triangle', 0.12);
      tone(780, 0.05, 0.22, 'triangle', 0.08);
    },
    draw() {
      tone(660, 0, 0.08, 'sine', 0.06);
    },
    hit() {
      tone(140, 0, 0.25, 'sawtooth', 0.1);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.12));
    },
    lose() {
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.4, 'sine', 0.1));
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
