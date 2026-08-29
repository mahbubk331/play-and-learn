/**
 * Generates the spoken letter and praise clips in public/audio.
 *
 *   node scripts/gen-voice.mjs            # write the clips
 *   node scripts/gen-voice.mjs --check    # verify pronunciation, write nothing
 *
 * WHY THIS EXISTS HERE, when every other clip comes from the Remotion project's pipeline: the
 * letter track and the varied praise lines were added after this repo was split off, and that
 * pipeline is not checked in. Rather than ship the letter track silent — or fall back to
 * `window.speechSynthesis`, which was tried and sounded like a screen reader — the clips are
 * generated from the same source the others came from: Microsoft Edge neural voices over the
 * read-aloud endpoint. Same provenance, so the letter track matches the rest of the game rather
 * than sitting next to it. The same redistribution caveat therefore applies; see the README.
 *
 * DEPENDENCIES ARE DELIBERATELY NOT IN package.json. This runs approximately never — the clips
 * are committed — and neither package belongs in the app's dependency tree:
 *
 *     bun add -d msedge-tts playwright-core
 *
 * Playwright is here only as an audio decoder. The endpoint serves mp3 or opus (`riff` PCM is
 * rejected), the only ffmpeg likely to be on a dev machine is Playwright's own video-only build
 * with no mp3 decoder, and Chromium decodes mp3 natively via decodeAudioData. It also resamples
 * to the context rate on the way through, which is how the output lands at 48kHz to match every
 * clip already in public/audio.
 *
 * TRIMMING IS NOT OPTIONAL. The endpoint pads short clips with silence — up to 1.25s of it,
 * which on a one-syllable letter is most of the file. In a video that padding is load-bearing;
 * in a game a cue that starts a quarter-second after the block appears reads as lag, which is
 * exactly why export-game-audio.py strips it for the clips that came from the video pipeline.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "public", "audio");
const CHECK_ONLY = process.argv.includes("--check");

/**
 * Chosen by ear from a seven-voice audition spanning child and adult, US and GB.
 *
 * Being a GB voice is not incidental: it gives "zed" and "aitch" for Z and H without either
 * being hard-coded, which is the whole reason the letters below are fed in as bare characters.
 */
const VOICE = "en-GB-LibbyNeural";

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/**
 * What to send for each letter, where the bare character is not right.
 *
 * The bare character is right for 24 of the 26: the voice says the letter NAME, in its own
 * locale. The exceptions are the two whose bare character is also a common English word, and
 * which of the two needs help depends on the accent — measured by cross-correlating the two
 * renderings, since identical input phonemes produce byte-identical audio from this engine:
 *
 *   US voices   bare "A" is the indefinite article ("uh"). Needs "ay". Bare "I" is fine.
 *   GB voices   bare "I" is not "eye" (corr -0.07). Needs "eye". Bare "A" already is "ay".
 *
 * Each is only wrong on one side of the Atlantic, so this one table is correct for any voice —
 * which is why "ay" is kept for A even though this GB voice does not need it.
 */
const LETTER_TEXT = { A: "ay", I: "eye" };

/**
 * Independent spellings of each letter name, used ONLY by --check.
 *
 * If the bare character and the spelled name produce the same audio, the bare character is
 * saying the letter name. Note that a mismatch indicts whichever side is more doubtful, and
 * these respellings are often the doubtful one: the first pass used "jee" for G and "double you"
 * for W, both of which mismatched, and both of which were the error rather than the letter.
 */
const PHONETIC = {
  A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "gee",
  H: "aitch", I: "eye", J: "jay", K: "kay", L: "ell", M: "em", N: "enn",
  O: "oh", P: "pee", Q: "cue", R: "ar", S: "ess", T: "tee", U: "ewe",
  V: "vee", W: "double-you", X: "ex", Y: "why", Z: "zed",
};

/** Must stay in step with PRAISE_LINES in src/audio.ts — the id IS the filename. */
const PRAISE = [
  ["goodjob", "Good job!"],
  ["greatwork", "Great work!"],
  ["keepitup", "Keep it up!"],
  ["welldone", "Well done!"],
  ["niceone", "Nice one!"],
  ["yougotit", "You got it!"],
  ["brilliant", "Brilliant!"],
  ["thatsit", "That's it!"],
];

/** Longest a cue may be. CORRECT_HOLD is 1.7s and the applause has to fit in it too. */
const MAX_SECONDS = 1.4;

const collect = (stream) =>
  new Promise((res, rej) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => res(Buffer.concat(chunks)));
    stream.on("error", rej);
  });

/** One socket per clip. Reusing a connection across clips gets it closed mid-synthesis. */
const synth = async (text, attempt = 1) => {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text);
    const bytes = await collect(audioStream);
    if (bytes.length === 0) throw new Error("empty response");
    return bytes;
  } catch (e) {
    if (attempt < 4) return synth(text, attempt + 1);
    throw new Error(`"${text}" failed after 4 attempts: ${e.message}`);
  } finally {
    try {
      tts.close();
    } catch {
      // Already closed by the server. Nothing to do.
    }
  }
};

/** 16-bit mono WAV, matching the clips already in public/audio. */
const wav = (samples, rate) => {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
};

/** Sample-aligned correlation. Identical input phonemes give exactly 1.00 from this engine. */
const corr = (a, b) => {
  const n = Math.min(a.length, b.length);
  let sa = 0;
  let sb = 0;
  let sab = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i] * a[i];
    sb += b[i] * b[i];
    sab += a[i] * b[i];
  }
  return sab / Math.sqrt(sa * sb || 1);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");

const decodeTrim = async (bytes) =>
  page.evaluate(async (b64) => {
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

    // 48000, not the mp3's native 24000: decodeAudioData resamples to the context rate, and
    // every clip already in public/audio is mono 48kHz 16-bit.
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const buf = await ctx.decodeAudioData(arr.buffer);
    const d = buf.getChannelData(0);

    const FLOOR = 0.012;
    let first = 0;
    let last = d.length - 1;
    while (first < d.length && Math.abs(d[first]) < FLOOR) first++;
    while (last > first && Math.abs(d[last]) < FLOOR) last--;
    if (first >= last) return { samples: [], rate: buf.sampleRate };

    // A breath either side, so the attack is not clipped and the tail is not cut dead.
    first = Math.max(0, first - Math.round(buf.sampleRate * 0.02));
    last = Math.min(d.length - 1, last + Math.round(buf.sampleRate * 0.06));
    return { samples: Array.from(d.slice(first, last + 1)), rate: buf.sampleRate };
  }, bytes.toString("base64"));

const make = async (text) => {
  const { samples, rate } = await decodeTrim(await synth(text));
  return { samples, rate, seconds: samples.length / rate };
};

const suspect = [];

for (const ch of ALPHABET) {
  const clip = await make(LETTER_TEXT[ch] ?? ch);
  if (clip.samples.length === 0) {
    suspect.push(`${ch}: silent`);
    continue;
  }
  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-l${ch}.wav`), wav(clip.samples, clip.rate));
  }

  const check = await make(PHONETIC[ch]);
  const c = corr(clip.samples, check.samples);
  console.log(`${ch}  ${clip.seconds.toFixed(2)}s  corr=${c.toFixed(2)}`);

  if (clip.seconds < 0.15) suspect.push(`${ch}: only ${clip.seconds.toFixed(2)}s`);
  if (c < 0.6) {
    suspect.push(
      `${ch}: "${LETTER_TEXT[ch] ?? ch}" and "${PHONETIC[ch]}" differ (corr ${c.toFixed(2)}) — needs an ear`,
    );
  }
}

for (const [id, words] of PRAISE) {
  const clip = await make(words);
  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-p${id}.wav`), wav(clip.samples, clip.rate));
  }
  console.log(`${id.padEnd(10)} ${clip.seconds.toFixed(2)}s  "${words}"`);
  if (clip.seconds > MAX_SECONDS) {
    suspect.push(`praise ${id}: ${clip.seconds.toFixed(2)}s exceeds the ${MAX_SECONDS}s beat`);
  }
}

console.log(
  suspect.length ? `\nNEEDS AN EAR:\n${suspect.join("\n")}` : "\nall clips pass the checks",
);

await browser.close();
