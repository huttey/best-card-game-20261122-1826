// Tidecaller: a turn-based card duel on a moonlit lagoon. Two tidecallers trade
// cards across the water — currents, moon phases and hand management decide each
// duel. This file is the entrypoint that hands the game in: it checks game/ and
// screenshots/ against the bounty gate first, then copies both into the output
// directory and writes dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// Run it locally with `node serve.ts` for the game itself, or hand it in with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's own caps (reference/gate.json), checked here before anything is
// copied so a bad entry fails loudly in this file instead of deep in the
// dossier builder: 3 or 4 screenshots, each at most 256 KiB; game/ at most
// 993 entries (files and directories, the platform's count) and 48 MiB of
// files in all.
const MIN_SCREENSHOTS = 3;
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

// Walk game/ once: how many entries it holds (files plus directories) and
// how many bytes its files come to.
function gameTotals(dir: string): { entries: number; bytes: number } {
  let entries = 0;
  let bytes = 0;
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      entries += 1;
      const path = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        bytes += statSync(path).size;
      } else {
        throw new Error(`Tidecaller: game/${path.slice(gameDir.length + 1)} is not a plain file or directory — game/ holds plain files and directories only`);
      }
    }
  };
  walk(dir);
  return { entries, bytes };
}

// Every plain file screenshots/ holds, by name, with its size.
function shotFiles(dir: string): { name: string; bytes: number }[] {
  if (!existsSync(dir)) return [];
  const out: { name: string; bytes: number }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    out.push({ name: entry.name, bytes: statSync(join(dir, entry.name)).size });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// --- Validate first: nothing is copied until the entry is one the gate accepts.

if (!existsSync(join(gameDir, 'index.html')) || !statSync(join(gameDir, 'index.html')).isFile()) {
  throw new Error('Tidecaller: game/index.html is missing — a game needs its page at game/index.html');
}

const game = gameTotals(gameDir);
if (game.entries > GAME_MAX_FILES) {
  throw new Error(`Tidecaller: game/ holds ${game.entries} entries, over the ${GAME_MAX_FILES} the gate allows`);
}
if (game.bytes > GAME_MAX_BYTES) {
  throw new Error(`Tidecaller: game/ comes to ${game.bytes} bytes, over the ${GAME_MAX_BYTES} the gate allows`);
}

const shots = shotFiles(shotsDir);
if (shots.length < MIN_SCREENSHOTS) {
  throw new Error(`Tidecaller: screenshots/ holds ${shots.length} image(s) — the gate needs at least ${MIN_SCREENSHOTS}`);
}
if (shots.length > MAX_SCREENSHOTS) {
  throw new Error(`Tidecaller: screenshots/ holds ${shots.length} images — the gate allows at most ${MAX_SCREENSHOTS}`);
}
for (const shot of shots) {
  if (shot.bytes > MAX_SCREENSHOT_BYTES) {
    throw new Error(`Tidecaller: screenshots/${shot.name} is ${shot.bytes} bytes, over the ${MAX_SCREENSHOT_BYTES} a screenshot may be`);
  }
}

// --- Copy and write the dossier.

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const shotBytes = shots.reduce((n, s) => n + s.bytes, 0);
const dossierBytes = statSync(dossierPath).size;
console.log(`Tidecaller handed in to ${out}`);
console.log(`  game: ${game.entries} entries, ${game.bytes} bytes`);
console.log(`  screenshots: ${shots.length} files, ${shotBytes} bytes`);
console.log(`  dossier.json: ${dossierBytes} bytes`);
