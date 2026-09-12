/**
 * Encodes the WAV masters in audio-src/ to AAC in public/audio/.
 *
 *   node scripts/encode-audio.mjs           # encode what is stale
 *   node scripts/encode-audio.mjs --force   # re-encode everything
 *
 * WHY THIS EXISTS: the masters are mono 48kHz 16-bit WAV, which is the right format to KEEP
 * audio in and the wrong one to ship it in. Three minutes of clips came to 16.8MB, and every
 * byte of it was downloaded before the splash screen would lift, because AudioEngine.load()
 * decodes the whole set up front (deliberately — see src/audio.ts). At 64kbps mono AAC the
 * same three minutes is 1.8MB, so that design stays affordable.
 *
 * AAC RATHER THAN OPUS, which is smaller at equal quality: this ships as a Capacitor iOS app
 * as well as a web build, and Safari's decodeAudioData support for Opus has a long history of
 * not being there. AAC is decoded by everything.
 *
 * The masters stay in audio-src/ and are COMMITTED, because they are not reproducible —
 * scripts/gen-voice.mjs renders from a network TTS endpoint that returns different audio for
 * the same text often enough to matter, and five animal clips are Wikimedia field recordings.
 * public/audio/ is generated, gitignored, and safe to delete.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "audio-src");
const OUT = join(root, "public", "audio");
const FORCE = process.argv.includes("--force");

const BITRATE = "64k";

/**
 * How many clips there should be.
 *
 * Checked rather than trusted, because 54 of the 126 masters were untracked for a while and a
 * CI checkout therefore built an app whose animal park was silent, whose every wrong-answer
 * nudge was silent, and whose praise line was silent one time in four. None of that fails a
 * build or shows up in a screenshot — it is only audible, on a device, by someone playing the
 * game. A wrong count here should stop the build instead.
 *
 * Update this when clips are added. That is the point: adding audio should require saying so.
 */
const EXPECTED = 126;

if (!existsSync(SRC)) {
  console.error(`No masters at ${SRC}`);
  process.exit(1);
}

const wavs = readdirSync(SRC).filter((f) => f.endsWith(".wav"));

if (wavs.length !== EXPECTED) {
  console.error(
    `Expected ${EXPECTED} masters in audio-src/, found ${wavs.length}.\n` +
      `If clips were added or removed on purpose, update EXPECTED in this script.\n` +
      `If not, masters are missing — check that audio-src/ is fully committed.`,
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

let encoded = 0;
let skipped = 0;

for (const wav of wavs) {
  const from = join(SRC, wav);
  const to = join(OUT, wav.replace(/\.wav$/, ".m4a"));

  // Skip anything already newer than its master. Full set is ~20s to encode; a no-op run
  // should not cost that on every `bun run dev`.
  if (!FORCE && existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) {
    skipped++;
    continue;
  }

  execFileSync(
    "ffmpeg",
    ["-nostdin", "-loglevel", "error", "-y", "-i", from, "-c:a", "aac", "-b:a", BITRATE, "-ac", "1", to],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  encoded++;
}

console.log(`audio: ${encoded} encoded, ${skipped} up to date -> public/audio/`);
