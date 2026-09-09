import { HUES } from "./hues";
import { ALPHABET } from "./letters";
import { MAX_NUMBER } from "./levels";

/**
 * Sound playback.
 *
 * Web Audio rather than <audio> elements, for one reason that matters here: a correct
 * answer plays the applause and the "Hooray!" at the same instant, and overlapping
 * playback of the same or different clips is exactly what HTMLAudioElement is worst
 * at. Decoded buffers can be fired as many times as we like with no allocation and no
 * latency.
 *
 * The context is created immediately, in `suspended` state, and the clips are decoded
 * straight away — `decodeAudioData` works fine on a suspended context. Only `resume()`
 * needs a user gesture. Doing it the other way round (waiting for the gesture to
 * create the context and then decoding) means the very first correct answer in a
 * session plays silently while it decodes, which is the one answer you most want to
 * reward.
 */

/*
 * Every URL goes through BASE_URL.
 *
 * Vite rewrites the asset URLs it can see — imports, CSS references — but these are
 * hand-written strings it never touches. Hardcoding a leading "/" worked on a domain
 * root and 404ed every clip the moment the app was served from a subdirectory
 * (GitHub Pages project sites, or any path-prefixed host). BASE_URL is "/" by default
 * and whatever `base` is set to otherwise, so this is correct in both cases.
 */
const BASE = import.meta.env.BASE_URL;

/*
 * Keys for the shape names are the shape ids from the shared shapes.ts, so a round can play
 * its cue with `play(token.id)` and adding a fifth shape cannot silently leave it without a
 * voice — TypeScript will not let the key be missing.
 */
const NAMED = {
  clap: `${BASE}audio/sfx-clap.m4a`,
  cheer: `${BASE}audio/kids-cheer.m4a`,
  wrong: `${BASE}audio/sfx-wrong.m4a`,
  bonk: `${BASE}audio/sfx-bonk.m4a`,
  roar: `${BASE}audio/sfx-roar.m4a`,
  circle: `${BASE}audio/game-circle.m4a`,
  square: `${BASE}audio/game-square.m4a`,
  triangle: `${BASE}audio/game-triangle.m4a`,
  star: `${BASE}audio/game-star.m4a`,
  tryagain: `${BASE}audio/game-tryagain.m4a`,
  nextlevel: `${BASE}audio/game-nextlevel.m4a`,
} as const;

/**
 * Spoken numerals for the number levels, built rather than listed.
 *
 * Twenty hand-written entries would be twenty chances to typo a filename into silence, and
 * the range is already defined once in levels.ts.
 */
const NUMBERS: Record<string, string> = {};
for (let n = 1; n <= MAX_NUMBER; n++) {
  NUMBERS[`n${n}`] = `${BASE}audio/game-n${n}.m4a`;
}

/**
 * Spoken colour names, built from the palette for the same reason as the numerals: a seventh
 * hue added to hues.ts cannot end up silently without a voice.
 */
const COLORS: Record<string, string> = {};
for (const h of HUES) {
  COLORS[`c${h.id}`] = `${BASE}audio/game-c${h.id}.m4a`;
}

/**
 * The twenty-six letter names, built from the alphabet for the same reason as the numerals and
 * the colours: a clip cannot end up silently missing because a filename was typed wrong.
 *
 * These are recorded, like everything else. An earlier cut of the letter track had no clips and
 * fell back to `window.speechSynthesis`, which was rejected for the reason it deserved to be —
 * it sounded like a screen reader. Voice *selection* could only choose from whatever a device
 * happened to have installed, so on a machine without the neural voices it was David or Zira and
 * no amount of rate and pitch tuning helped.
 *
 * ON PRONUNCIATION, which is the interesting part of generating these: the bare character is the
 * right input for almost every letter. The voice says the letter NAME, and says it in its own
 * locale, so this British voice gives "zed" and "aitch" without either being hard-coded. Two
 * letters need spelling out because the bare character is also a common English word — and that
 * was measured, not guessed, by cross-correlating the two renderings of each letter:
 *
 *   - "A" is read as the indefinite article by the US voices. Needs "ay".
 *   - "I" is not read as "eye" by the GB voices. Needs "eye".
 *
 * Each is only wrong on one side of the Atlantic, so one table is right for any voice. 24 of the
 * 26 were confirmed by an independent spelling producing byte-identical audio ("G" == "gee",
 * "N" == "enn", "U" == "ewe", and so on); E and W matched no spelling tried, but W is 0.75s — the
 * longest of the twenty-six, which is what "double-you" requires — and E is 0.33s, one long
 * vowel. See scripts/gen-voice.mjs.
 */
const LETTERS: Record<string, string> = {};
for (const ch of ALPHABET) {
  LETTERS[`l${ch}`] = `${BASE}audio/game-l${ch}.m4a`;
}

/**
 * The lines a correct answer can be praised with.
 *
 * Variety is the whole point. One fixed response — which is what the recorded "Hooray!" was on
 * its own — stops being information after the third time you hear it, and the reward beat is the
 * one thing in this game most worth keeping alive. Eight lines plus the cheer means a child has
 * to get nine right before anything can repeat, and `pickPraise` never repeats back-to-back even
 * then.
 *
 * Short, and exclamations rather than sentences. The beat is CORRECT_HOLD (1.7s), shared with the
 * applause and an animal running on and clapping; the longest of these is 0.86s, so nothing is
 * still talking when the next block arrives.
 *
 * THE ID IS THE FILENAME, which is why these are ids rather than array positions. Praise used to
 * be keyed by index, so reordering this list would have silently repointed every clip.
 */
const PRAISE_LINES = [
  "goodjob",
  "greatwork",
  "keepitup",
  "welldone",
  "niceone",
  "yougotit",
  "brilliant",
  "thatsit",
] as const;

const PRAISE_FILES: Record<string, string> = {};
for (const id of PRAISE_LINES) {
  PRAISE_FILES[`p${id}`] = `${BASE}audio/game-p${id}.m4a`;
}

const FILES: Record<string, string> = {
  ...NAMED,
  ...NUMBERS,
  ...COLORS,
  ...LETTERS,
  ...PRAISE_FILES,
};

export type SoundName =
  | keyof typeof NAMED
  | `n${number}`
  | `c${string}`
  | `l${string}`
  | `p${string}`;

/**
 * What a correct answer can play, recorded and spoken together.
 *
 * The recorded "Hooray!" stays IN the rotation rather than being replaced by it. It is the only
 * one of these in the child's voice used everywhere else in the app, so it is the best of them —
 * it just should not be the only one.
 */
export const PRAISE: SoundName[] = [
  "cheer",
  ...PRAISE_LINES.map((id): SoundName => `p${id}`),
];

/**
 * A praise line, never the same one twice running.
 *
 * Same shape as `pickSpecies` in critters/registry.tsx, and for the same reason: back-to-back
 * repeats are what make a random reward read as a canned one, and they are exactly what an
 * unfiltered random pick produces one time in nine.
 */
export const pickPraise = (previous: SoundName | null): SoundName => {
  const pool = PRAISE.filter((p) => p !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Per-sound gain, with 1.0 for anything not listed — which is every spoken cue.
 *
 * The reward is louder than the correction, deliberately and by a wide margin. A game that
 * punishes louder than it praises teaches a three-year-old to stop guessing, and guessing is
 * the entire activity. These sit on top of the peak levels already baked into the files by
 * scripts/gen-kids-sfx.py.
 */
const GAIN: Record<string, number> = {
  clap: 0.85,
  cheer: 1.0,
  wrong: 0.55,
  bonk: 0.7,
  roar: 0.8,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private ready = false;

  async load(): Promise<void> {
    if (this.ctx) return;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Ctor) return;

    this.ctx = new Ctor();

    await Promise.all(
      Object.keys(FILES).map(async (name) => {
        try {
          const response = await fetch(FILES[name]);
          const bytes = await response.arrayBuffer();
          const buffer = await this.ctx!.decodeAudioData(bytes);
          this.buffers.set(name, buffer);
        } catch {
          // A missing clip must not take the game down; it just plays silently.
        }
      }),
    );

    this.ready = true;
  }

  /** Call from a real user gesture. Browsers will not start audio without one. */
  unlock(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  play(name: SoundName, delaySeconds = 0): void {
    if (!this.ctx || !this.ready) return;

    const buffer = this.buffers.get(name);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = GAIN[name] ?? 1.0;

    source.connect(gain).connect(this.ctx.destination);
    source.start(this.ctx.currentTime + delaySeconds);
  }
}
