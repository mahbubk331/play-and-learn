/**
 * Level progression: three colour levels, three shape levels, then seven number levels.
 *
 * That order is the order a child acquires the skills — colour matching comes before shape
 * matching, which comes before recognising numerals — so the game opens with the easiest
 * discrimination and the first level is winnable immediately.
 *
 * Within the shape levels (4-6), "harder" cannot mean "more shapes" — there are only four. It
 * means removing the crutches, in the order a child stops needing them:
 *
 *   1. Holes in a fixed order. A child can solve by position once they have seen it a
 *      couple of times, which is a real intermediate step and not cheating.
 *   2. Holes shuffled. Position tells you nothing; you have to read the outline.
 *   3. Shuffled, and the block arrives rotated — now the outline has to be recognised
 *      independently of its orientation, which is a distinct skill and the last to arrive.
 *
 * From level 7 the game switches to numerals and the ramp is the range they are drawn from:
 * 1-5, then 1-10, then widening to 1-20 by level 13. The board still shows four at a time,
 * because four is what fits and four is what a child can scan. A wider range does not mean
 * a busier board — it means the four could be any of more numbers, so recognising them
 * matters more than remembering where they were.
 *
 * Rotation stays off for the number levels. A rotated numeral is a different and much
 * harder question than a rotated triangle — 6 and 9 stop being distinguishable at all — and
 * it is not the skill these levels are for.
 */

export type Level = {
  n: number;
  rounds: number;
  /** Shuffle which token sits at which hole, so position stops being a cue. */
  shuffleHoles: boolean;
  /** Maximum absolute rotation applied to a block, in degrees. 0 = upright. */
  maxRotation: number;
  /** What the blocks carry. */
  mode: "color" | "shape" | "number";
  /** Number levels draw their four holes from 1..numberMax. */
  numberMax?: number;
};

/**
 * A colour level. Four of the seven hues, drawn at random per attempt, so a replay is a
 * different board — which is why there is no "range" to ramp: the difficulty comes from the
 * board being unfamiliar, not from more colours being on it.
 */
const colorLevel = (n: number, rounds: number, shuffleHoles: boolean): Level => ({
  n,
  rounds,
  shuffleHoles,
  maxRotation: 0,
  mode: "color",
});

const numberLevel = (n: number, numberMax: number, rounds = 8): Level => ({
  n,
  rounds,
  shuffleHoles: true,
  maxRotation: 0,
  mode: "number",
  numberMax,
});

export const LEVELS: Level[] = [
  colorLevel(1, 6, false),
  colorLevel(2, 8, true),
  colorLevel(3, 8, true),
  { n: 4, rounds: 6, shuffleHoles: false, maxRotation: 0, mode: "shape" },
  { n: 5, rounds: 8, shuffleHoles: true, maxRotation: 0, mode: "shape" },
  { n: 6, rounds: 8, shuffleHoles: true, maxRotation: 32, mode: "shape" },
  numberLevel(7, 5, 6),
  numberLevel(8, 10),
  numberLevel(9, 12),
  numberLevel(10, 14),
  numberLevel(11, 16),
  numberLevel(12, 18),
  numberLevel(13, 20),
];

/**
 * Bump this whenever the LEVELS array changes what its indices MEAN.
 *
 * Saved progress stores an INDEX into LEVELS, so inserting or reordering levels silently
 * repoints it: adding the three colour levels at the front turned a saved "index 4" from
 * a number level into shape level 5, and anyone with progress skipped the new levels
 * entirely without a hint that it had happened. A version stamp makes that a reset instead
 * of a wrong resume - losing a few banked stars is the cheaper failure by far.
 *
 * Appending a level to the END is the one safe change, since existing indices keep their
 * meaning. Anything else: bump.
 *
 *   1  three shape levels, then seven number levels
 *   2  three colour levels inserted at the front
 */
export const LEVELS_VERSION = 2;

/** Largest numeral any level can ask for. Bounds the spoken clips that must exist. */
export const MAX_NUMBER = 20;

/**
 * Wrong drops allowed per level attempt before it restarts.
 *
 * Note what this does NOT reset: the levels already finished, or their stars. A restart
 * costs the current level and nothing else, which is the difference between "try that
 * again" and "start over".
 */
export const MAX_WRONG = 3;

/**
 * Stars for finishing a level, from the number of wrong drops taken.
 *
 * Because a third wrong restarts the level, a *completed* level has 0, 1 or 2 wrong drops —
 * so this is always 3, 2 or 1. Never 0: a level you finished is a level you finished, and a
 * zero-star result for completing something reads as a failure.
 */
export const starsFor = (wrong: number): number =>
  Math.max(1, 3 - Math.min(wrong, MAX_WRONG - 1));

export const MAX_STARS = LEVELS.length * 3;
