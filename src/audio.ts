import { ANIMALS, animalClip, askClip, soundClip } from "./animals";
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
  "wonderful",
  "amazing",
  "fantastic",
] as const;

const PRAISE_FILES: Record<string, string> = {};
for (const id of PRAISE_LINES) {
  PRAISE_FILES[`p${id}`] = `${BASE}audio/game-p${id}.m4a`;
}

/**
 * The animal's own noise, played once the child has found it.
 *
 * FIVE OF THESE CONTAIN A REAL FIELD RECORDING — tiger, cat, dog, duck, horse — sourced from
 * Wikimedia Commons and level-matched to the voice; see scripts/fetch-animal-sounds.mjs and
 * ATTRIBUTION.md. The other nine are the neural voice saying "Moo! Cow.", because Commons had
 * nothing usable for them and everything else in `public/audio` is generated rather than sourced.
 * The split is audible and it is a deliberate compromise, recorded in the README.
 *
 * Swapping in a real recording for any of the nine touches this map and nothing else.
 */
const ANIMAL_FILES: Record<string, string> = {};
for (const a of ANIMALS) {
  ANIMAL_FILES[animalClip(a.id)] = `${BASE}audio/game-${animalClip(a.id)}.m4a`;
}

/**
 * The narrator's two lines per animal.
 *
 *   ask{id}  "Can you touch the cow?"     — the task
 *   snd{id}  "Can you make the sound the cow makes? Moo, moo!"
 *
 * The second one is the point of the whole section: it asks the child to make a noise out loud,
 * which is the only thing in this app that asks them to produce rather than recognise. Nothing
 * verifies they did, and nothing should.
 *
 * "the cow" rather than "a cow" throughout, and that is not a style choice — "a owl" is wrong and
 * "an owl" would need an article per animal in the roster. One definite article is correct for all
 * fourteen and costs nothing.
 */
const NARRATION: Record<string, string> = {};
for (const a of ANIMALS) {
  NARRATION[askClip(a.id)] = `${BASE}audio/game-${askClip(a.id)}.m4a`;
  NARRATION[soundClip(a.id)] = `${BASE}audio/game-${soundClip(a.id)}.m4a`;
}

/**
 * What the narrator says when the wrong animal is touched.
 *
 * Three of them, and all three are invitations. Nothing here says "no", nothing counts the miss,
 * and nothing is taken away — a wrong touch costs a two-year-old nothing but the second or so it
 * takes to say this. The question is then asked again, because the child has very likely forgotten
 * it, not ignored it.
 */
const NUDGE_LINES = ["tryagain2", "haveanotherlook", "keeplooking"] as const;

const NUDGE_FILES: Record<string, string> = {};
for (const id of NUDGE_LINES) {
  NUDGE_FILES[`nudge${id}`] = `${BASE}audio/game-nudge${id}.m4a`;
}

/** The nudge pool, in the same shape as PRAISE below. */
export const NUDGES: SoundName[] = NUDGE_LINES.map((id): SoundName => `nudge${id}`);

export const pickNudge = (previous: SoundName | null): SoundName => {
  const pool = NUDGES.filter((n) => n !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
};

const FILES: Record<string, string> = {
  ...NAMED,
  ...NUMBERS,
  ...COLORS,
  ...LETTERS,
  ...PRAISE_FILES,
  ...ANIMAL_FILES,
  ...NARRATION,
  ...NUDGE_FILES,
};

export type SoundName =
  | keyof typeof NAMED
  | `n${number}`
  | `c${string}`
  | `l${string}`
  | `p${string}`
  | `a${string}`
  | `snd${string}`
  | `nudge${string}`;

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
/**
 * Peak gain of the synthesized bubble pop. See `AudioEngine.pop`.
 *
 * Louder than the wrong-answer tone and quieter than the applause, which puts it where it
 * belongs: the pop is the thing the child did, not the reward for having done it.
 */
const POP_GAIN = 0.5;

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
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") void this.ctx.resume();

    /*
     * iOS needs more than resume(), and this is the part that is easy to miss.
     *
     * The context is created up front rather than inside the first gesture, which is what
     * lets every clip be decoded before anything is tapped (see the header). On iOS that
     * ordering has a cost: resume() reports the context as "running" and it still produces
     * no sound, because the audio session was never actually started BY a gesture. Playing
     * one real source inside the gesture is what starts it, and a single silent sample is
     * enough — it is inaudible, costs nothing, and only has to happen once.
     *
     * This does NOT defeat the iPhone's ring/silent switch. Web Audio on iOS runs in the
     * ambient session category, which that switch mutes, and the web has no way to ask for
     * a different one. The native build can and does; see native.ts.
     */
    if (!this.gestureStarted) {
      const silence = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const source = this.ctx.createBufferSource();
      source.buffer = silence;
      source.connect(this.ctx.destination);
      source.start(0);
      this.gestureStarted = true;
    }
  }

  private gestureStarted = false;

  /**
   * How long a clip runs, in seconds. 0 if it is missing or not decoded yet.
   *
   * Exists so the animal game can chain three lines of narration — the question, the praise, the
   * "make the sound" — back to back without guessing at the gaps. Timings were hard-coded first
   * and it was immediately wrong: "Can you touch the crocodile?" is half a second longer than
   * "Can you touch the cow?", so a fixed delay either talked over itself or left dead air. The
   * durations are right here in the decoded buffers, so nothing has to be estimated.
   */
  duration(name: SoundName): number {
    return this.buffers.get(name)?.duration ?? 0;
  }

  /** Returns the source so a caller can cut it short. Null if there was nothing to play. */
  play(name: SoundName, delaySeconds = 0): AudioBufferSourceNode | null {
    if (!this.ctx || !this.ready) return null;

    const buffer = this.buffers.get(name);
    if (!buffer) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = GAIN[name] ?? 1.0;

    source.connect(gain).connect(this.ctx.destination);
    source.start(this.ctx.currentTime + delaySeconds);
    return source;
  }

  /**
   * Play a clip, cutting off whatever the previous call to THIS method started.
   *
   * For the animal game, where overlapping is the default failure rather than a feature. The
   * clips run 1.7-2.6s ("Ooh ooh ah ah! Monkey." is the long one) and a two-year-old with a
   * twelve-tile grid in front of them taps far faster than that. Left to overlap, four animals
   * talking at once is mush, and mush teaches nothing — so the newest tap wins, which is what a
   * soundboard should do and what makes rapid tapping feel responsive rather than clogged.
   *
   * Deliberately NOT what the game cues use. There, a correct answer fires applause and praise
   * together on purpose, and overlapping playback is the reason this engine is Web Audio in the
   * first place.
   */
  playAlone(name: SoundName): void {
    try {
      this.alone?.stop();
    } catch {
      // Already finished. `stop()` on an ended source is harmless, but not worth relying on.
    }
    this.alone = this.play(name);
  }

  private alone: AudioBufferSourceNode | null = null;

  /**
   * A bubble popping. SYNTHESIZED, not played from a file, and that is a constraint rather than
   * a flourish.
   *
   * Every other sound in this app is a recording in `public/audio`, generated by scripts that
   * live in the Remotion project next door — which is not checked out here; `sync-shapes.mjs`
   * says so on every build. There was no way to add a `pop.m4a`. A pop also happens to be about
   * the easiest sound there is to make from an oscillator, so the shortfall costs nothing.
   *
   * TWO VOICES, because neither is convincing alone:
   *
   *   the body   a sine sweeping steeply DOWN, ~800Hz to 150Hz in 90ms. The downward sweep is
   *              the whole illusion — it reads as a cavity losing its air. Sweeping up sounds
   *              like a drip, and a fixed pitch sounds like a woodblock.
   *   the click  30ms of noise through a bandpass at 1.9kHz: the film giving way. Without it the
   *              pop is soft and underwater; with it the front of the sound has an edge.
   *
   * The start frequency is jittered a few hundred Hz per call, for the same reason the praise
   * pool never repeats a line: a chain of identical pops stops sounding like popping and starts
   * sounding like one sample being retriggered.
   *
   * Needs no `ready` check — it decodes nothing, so it works from the first gesture, before the
   * recorded clips have finished loading.
   */
  pop(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(700 + Math.random() * 420, now);
    /* Exponential rather than linear: pitch is heard logarithmically, so a linear ramp spends
       most of its time in the bottom octave and lands as a thud instead of a pop. */
    body.frequency.exponentialRampToValueAtTime(150, now + 0.09);

    const bodyGain = ctx.createGain();
    /* Ramped from a tiny non-zero value, because exponentialRampToValueAtTime cannot begin or
       end at 0 — it throws on some engines and silently produces nothing on others. */
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(POP_GAIN, now + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    body.connect(bodyGain).connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.13);

    const samples = Math.floor(ctx.sampleRate * 0.03);
    const noise = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      // Faded across the buffer, so the click decays rather than stopping dead on a click of
      // its own.
      data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
    }

    const click = ctx.createBufferSource();
    click.buffer = noise;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1900;
    band.Q.value = 0.8;

    const clickGain = ctx.createGain();
    clickGain.gain.value = POP_GAIN * 0.35;

    click.connect(band).connect(clickGain).connect(ctx.destination);
    click.start(now);
  }
}
