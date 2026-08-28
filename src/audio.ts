import { HUES } from "./hues";
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
  clap: `${BASE}audio/sfx-clap.wav`,
  cheer: `${BASE}audio/kids-cheer.wav`,
  wrong: `${BASE}audio/sfx-wrong.wav`,
  bonk: `${BASE}audio/sfx-bonk.wav`,
  roar: `${BASE}audio/sfx-roar.wav`,
  circle: `${BASE}audio/game-circle.wav`,
  square: `${BASE}audio/game-square.wav`,
  triangle: `${BASE}audio/game-triangle.wav`,
  star: `${BASE}audio/game-star.wav`,
  tryagain: `${BASE}audio/game-tryagain.wav`,
  nextlevel: `${BASE}audio/game-nextlevel.wav`,
} as const;

/**
 * Spoken numerals for the number levels, built rather than listed.
 *
 * Twenty hand-written entries would be twenty chances to typo a filename into silence, and
 * the range is already defined once in levels.ts.
 */
const NUMBERS: Record<string, string> = {};
for (let n = 1; n <= MAX_NUMBER; n++) {
  NUMBERS[`n${n}`] = `${BASE}audio/game-n${n}.wav`;
}

/**
 * Spoken colour names, built from the palette for the same reason as the numerals: a seventh
 * hue added to hues.ts cannot end up silently without a voice.
 */
const COLORS: Record<string, string> = {};
for (const h of HUES) {
  COLORS[`c${h.id}`] = `${BASE}audio/game-c${h.id}.wav`;
}

const FILES: Record<string, string> = { ...NAMED, ...NUMBERS, ...COLORS };

export type SoundName = keyof typeof NAMED | `n${number}` | `c${string}`;

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
