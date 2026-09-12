/**
 * Generates the spoken letter and praise clips in audio-src.
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
 * clip already in audio-src.
 *
 * TRIMMING IS NOT OPTIONAL. The endpoint pads short clips with silence — up to 1.25s of it,
 * which on a one-syllable letter is most of the file. In a video that padding is load-bearing;
 * in a game a cue that starts a quarter-second after the block appears reads as lag, which is
 * exactly why export-game-audio.py strips it for the clips that came from the video pipeline.
 *
 * THIS IS NOT BYTE-REPRODUCIBLE, and it matters more than it sounds. The endpoint is *mostly*
 * deterministic — the same text usually returns identical audio, which is what the --check
 * correlation relies on — but not always. A re-run to add the animal clips silently rewrote
 * game-lW.wav and all eight praise lines with fresh renderings of the same words: same duration,
 * different bytes, and audio that had already been listened to and signed off.
 *
 * So: run this, then `git diff --stat audio-src` and `git checkout` anything you did not mean
 * to change. Regenerating one clip means regenerating all of them, and approved audio is worth
 * more than a tidy pipeline.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "audio-src");
const CHECK_ONLY = process.argv.includes("--check");

/**
 * Chosen by ear, twice.
 *
 * The first audition was over single WORDS — letters and praise — and picked en-GB-LibbyNeural.
 * The second was over SENTENCES, once the animal game needed narration, and Libby lost: it is a
 * "General" tier voice and it reads a sentence flatly. Emma is one of the newest generation
 * (Microsoft's "Conversation" tier) and paces a sentence far more naturally — it renders the same
 * line in 2.9s where Libby takes 3.8s, which is most of what "sounds like a robot" actually was.
 *
 * THE COST OF THE SWITCH is that Emma is American, so the letters now say "zee" rather than
 * "zed". If the British accent matters more than the sentences do, en-GB-SoniaNeural was the best
 * GB alternative and this is the one line to change.
 */
const VOICE = "en-US-EmmaNeural";

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
 * Each is only wrong on one side of the Atlantic, so this one table is correct for any voice. On
 * the current US voice it is the "A" entry that is load-bearing; on the GB voice it was the "I".
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
  V: "vee", W: "double-you", X: "ex", Y: "why", Z: "zee",
};

/**
 * The animal park's clips, READ OUT OF src/animals.ts rather than restated here.
 *
 * Twelve animals with a name and a noise each is too much to keep in step by hand, and the
 * failure mode is silent — a typo'd id is a file nobody fetches and an animal that says nothing.
 * So the roster is parsed from the source of truth. Same instinct as sync-shapes.mjs: one
 * definition, and a loud failure if it moves.
 *
 * A regex rather than an import because this is a .mjs script and that is a .ts module. It
 * asserts on what it finds, so a change to the shape of that array stops the script instead of
 * quietly generating a subset.
 */
const readAnimals = () => {
  const src = readFileSync(join(root, "src", "animals.ts"), "utf8");
  const block = src.match(/export const ANIMALS = \[([\s\S]*?)\] as const/);
  if (!block) throw new Error("src/animals.ts: could not find the ANIMALS array");

  const found = [...block[1].matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*sound:\s*"([^"]+)"/g)]
    .map(([, id, name, sound]) => ({ id, name, sound }));

  const declared = (block[1].match(/\{\s*id:/g) ?? []).length;
  if (found.length !== declared) {
    throw new Error(
      `src/animals.ts: parsed ${found.length} animals but the array has ${declared} entries`,
    );
  }
  if (found.length === 0) throw new Error("src/animals.ts: no animals parsed");
  return found;
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
  ["wonderful", "Wonderful!"],
  ["amazing", "Amazing!"],
  ["fantastic", "Fantastic!"],
];

/**
 * The animal game's nudges, for a wrong touch. Must stay in step with NUDGE_LINES in audio.ts.
 *
 * All three are invitations. None of them says "no", and none of them mentions being wrong: the
 * child is two, they have very likely forgotten the question rather than ignored it, and the
 * question gets asked again straight after.
 */
const NUDGES = [
  ["tryagain2", "Try again!"],
  ["haveanotherlook", "Have another look!"],
  ["keeplooking", "Keep looking, you can do it!"],
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
/**
 * THE ONLY SSML THIS ENDPOINT ACCEPTS IS `<prosody>`.
 *
 * Verified, and worth writing down because it shapes everything else: `<break>`, `<emphasis>` and
 * the expressive `<mstts:express-as>` styles (cheerful, friendly) each close the websocket
 * mid-synthesis. The levers for making a line sound human are the voice, the prosody and the
 * spelling. Nothing else is available.
 *
 * `inner` is raw SSML rather than plain text, which is what lets one clip slow and raise just its
 * onomatopoeia while the question wrapped around it stays conversational.
 */
const synth = async (inner, attempt = 1) => {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const lang = VOICE.slice(0, 5);
    const ssml =
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
      `<voice name="${VOICE}">${inner}</voice></speak>`;
    const { audioStream } = await tts.rawToStream(ssml);
    const bytes = await collect(audioStream);
    if (bytes.length === 0) throw new Error("empty response");
    return bytes;
  } catch (e) {
    if (attempt < 4) return synth(inner, attempt + 1);
    throw new Error(`"${inner}" failed after 4 attempts: ${e.message}`);
  } finally {
    try {
      tts.close();
    } catch {
      // Already closed by the server. Nothing to do.
    }
  }
};

/** 16-bit mono WAV, matching the clips already in audio-src. */
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

/**
 * `pad` is [head, tail] in seconds, and a WORD wants different padding from a SENTENCE.
 *
 * A one-syllable letter is trimmed tight (20ms/60ms) because a cue that starts late reads as lag.
 * A sentence has a soft onset and a decaying tail, and that same tight trim clips both — which was
 * itself part of why the narration sounded abrupt. Sentences get 70ms/200ms.
 */
const decodeTrim = async (bytes, pad) =>
  page.evaluate(
    async ({ b64, pad }) => {
      const raw = atob(b64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

      // 48000, not the mp3's native 24000: decodeAudioData resamples to the context rate, and
      // every clip already in audio-src is mono 48kHz 16-bit.
      const ctx = new OfflineAudioContext(1, 1, 48000);
      const buf = await ctx.decodeAudioData(arr.buffer);
      const d = buf.getChannelData(0);

      const FLOOR = 0.01;
      let first = 0;
      let last = d.length - 1;
      while (first < d.length && Math.abs(d[first]) < FLOOR) first++;
      while (last > first && Math.abs(d[last]) < FLOOR) last--;
      if (first >= last) return { samples: [], rate: buf.sampleRate };

      // A breath either side, so the attack is not clipped and the tail is not cut dead.
      first = Math.max(0, first - Math.round(buf.sampleRate * pad[0]));
      last = Math.min(d.length - 1, last + Math.round(buf.sampleRate * pad[1]));
      return { samples: Array.from(d.slice(first, last + 1)), rate: buf.sampleRate };
    },
    { b64: bytes.toString("base64"), pad },
  );

const WORD_PAD = [0.02, 0.06];
const SENTENCE_PAD = [0.07, 0.2];

const make = async (inner, pad = WORD_PAD) => {
  const { samples, rate } = await decodeTrim(await synth(inner), pad);
  return { samples, rate, seconds: samples.length / rate };
};

/**
 * Slow the onomatopoeia down and pitch it up, inside the sentence that introduces it.
 *
 * This is the fix for the thing that sounded most robotic. Text-to-speech has no idea it is
 * imitating an animal: left alone it reads "Moooo! Moooo!" as a word, at conversational speed, in
 * the same breath as the question. Slowing it 24% and raising it 18% — plus the stretched vowels in
 * the roster's spelling — is what turns it into something a child hears as a moo and copies.
 *
 * Only <prosody> can do this; the expressive styles that would have been the obvious tool are
 * rejected by the endpoint.
 */
const drawl = (text) => `<prosody rate="-24%" pitch="+18%">${text}</prosody>`;

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
  const clip = await make(words, SENTENCE_PAD);
  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-p${id}.wav`), wav(clip.samples, clip.rate));
  }
  console.log(`${id.padEnd(10)} ${clip.seconds.toFixed(2)}s  "${words}"`);
  if (clip.seconds > MAX_SECONDS) {
    suspect.push(`praise ${id}: ${clip.seconds.toFixed(2)}s exceeds the ${MAX_SECONDS}s beat`);
  }
}

for (const [id, words] of NUDGES) {
  const clip = await make(words, SENTENCE_PAD);
  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-nudge${id}.wav`), wav(clip.samples, clip.rate));
  }
  console.log(`${id.padEnd(16)} ${clip.seconds.toFixed(2)}s  "${words}"`);
  if (clip.seconds > 2.2) suspect.push(`nudge ${id}: ${clip.seconds.toFixed(2)}s`);
}

/*
 * The animal game's narration: two lines per animal.
 *
 * "the cow" rather than "a cow" throughout, and that is not a style choice — "a owl" is wrong, and
 * "an owl" would mean carrying an article per animal in the roster. One definite article is
 * correct for all fourteen and costs nothing.
 */
for (const { id, name, sound } of readAnimals()) {
  const ask = await make(
    `<prosody rate="-6%" pitch="+6%">Can you touch the ${name}?</prosody>`,
    SENTENCE_PAD,
  );
  const snd = await make(
    `Can you make the sound the ${name} makes? ${drawl(sound)}`,
    SENTENCE_PAD,
  );

  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-ask${id}.wav`), wav(ask.samples, ask.rate));
    writeFileSync(join(OUT, `game-snd${id}.wav`), wav(snd.samples, snd.rate));
  }
  console.log(
    `${id.padEnd(10)} ask ${ask.seconds.toFixed(2)}s  snd ${snd.seconds.toFixed(2)}s  "${sound}"`,
  );

  /*
   * These are the longest clips in the app by a wide margin, and both bounds matter. Too short
   * means the voice swallowed the onomatopoeia; too long and a two-year-old has stopped listening
   * before the question ends. 5s is roughly the ceiling for a sentence a toddler will sit through.
   */
  if (ask.seconds < 0.9) suspect.push(`ask ${id}: only ${ask.seconds.toFixed(2)}s`);
  if (ask.seconds > 3.0) suspect.push(`ask ${id}: ${ask.seconds.toFixed(2)}s — too long a question`);
  if (snd.seconds < 1.8) suspect.push(`snd ${id}: only ${snd.seconds.toFixed(2)}s`);
  if (snd.seconds > 6.5) {
    suspect.push(`snd ${id}: ${snd.seconds.toFixed(2)}s — check the spelling of "${sound}"`);
  }
}

/*
 * The animal park. "<Noise>! <Name>." in one clip, so the two can never arrive out of order.
 *
 * These are the same voice saying "Moo!", not a recording of a cow — see the note on
 * ANIMAL_FILES in src/audio.ts for why, and for how to swap in real recordings if that ever
 * becomes the right call.
 */
for (const { id, name, sound } of readAnimals()) {
  const clip = await make(`${drawl(sound)} ${name}.`, SENTENCE_PAD);
  if (!CHECK_ONLY) {
    writeFileSync(join(OUT, `game-a${id}.wav`), wav(clip.samples, clip.rate));
  }
  console.log(`${id.padEnd(10)} ${clip.seconds.toFixed(2)}s  "${sound} ${name}."`);

  if (clip.seconds < 0.4) suspect.push(`animal ${id}: only ${clip.seconds.toFixed(2)}s`);
  /*
   * 2.8, not 2.2. There is no beat to fit inside here — the park is free play and nothing is
   * waiting on the clip — so this is only looking for a voice that made a MEAL of the
   * onomatopoeia rather than saying it, which is the real risk with "Grrr!" and "Ooh ooh ah ah!".
   *
   * 2.2 was the first guess and it was wrong: it flagged "Cluck cluck! Chicken.",
   * "Woof woof! Dog." and "Snap! Crocodile.", all of which are five or six syllables and are
   * simply that long. A check that fires on correct output trains you to ignore it.
   */
  if (clip.seconds > 4.2) {
    suspect.push(`animal ${id}: ${clip.seconds.toFixed(2)}s — check the spelling of "${sound}"`);
  }
}

console.log(
  suspect.length ? `\nNEEDS AN EAR:\n${suspect.join("\n")}` : "\nall clips pass the checks",
);

/*
 * This script writes a VOICE clip for all twelve animals, including the five that are supposed to
 * hold a real field recording. Running it is therefore how you silently undo those five, which is
 * a trap worth shouting about rather than leaving in a comment.
 */
if (!CHECK_ONLY) {
  console.log(
    "\n" +
      "NOTE: game-atiger, acat, adog, aduck and ahorse have just been overwritten with\n" +
      "      voice imitations. Run `node scripts/fetch-animal-sounds.mjs` to put the real\n" +
      "      recordings back.",
  );
}

await browser.close();
