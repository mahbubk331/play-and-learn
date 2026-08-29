/**
 * Level progression, in four separate tracks.
 *
 * The game used to be one thirteen-level ladder: three colour levels, three shape levels, then
 * seven number levels, in the order a child acquires the skills. That ordering was right about
 * the skills and wrong about the child in front of the tablet — a two-year-old who is working
 * on colours had to be walked past the shape and number levels by an adult, and a four-year-old
 * who wanted numbers had to sit through six levels of things they already knew.
 *
 * So the ladder is cut into four tracks — COLOURS, SHAPES, NUMBERS, LETTERS — each with its own
 * levels, its own level numbering and its own saved progress, and the picker (see
 * components/Menu.tsx) is the home screen. The acquisition order is still stated: it is the
 * order the tracks appear in TRACKS, which is a recommendation rather than a gate.
 *
 * What did NOT change is that this is still one game. Every track runs the same engine on the
 * same token model; a track is a level list and a title, not a fork. See tokens.ts.
 *
 * The ramp inside each track:
 *
 *   COLOURS  no range to ramp — four of the seven hues are drawn per attempt, so a replay is a
 *            different board and the difficulty is the board being unfamiliar. Level 1 keeps
 *            the holes in palette order; after that they shuffle.
 *
 *   SHAPES   "harder" cannot mean "more shapes", there are only four. It means removing the
 *            crutches, in the order a child stops needing them:
 *              1. Holes in a fixed order. Solvable by position once seen a couple of times,
 *                 which is a real intermediate step and not cheating.
 *              2. Holes shuffled. Position tells you nothing; you have to read the outline.
 *              3. Shuffled, and the block arrives rotated — the outline now has to be
 *                 recognised independently of its orientation, a distinct skill and the last
 *                 to arrive.
 *
 *   NUMBERS  the ramp is the range: 1-5, then 1-10, widening to 1-20. The board still shows
 *            four at a time, because four is what fits and four is what a child can scan. A
 *            wider range does not mean a busier board — it means the four could be any of more
 *            numbers, so recognising them matters more than remembering where they were.
 *
 *   LETTERS  the same shape of ramp as numbers, over A-E, A-J, A-P, A-U, A-Z. Same reasoning:
 *            four holes throughout, a widening pool to draw them from.
 *
 * Rotation is on for exactly one level, the last shape level. A rotated numeral or letter is a
 * different and much harder question than a rotated triangle — 6 and 9 stop being
 * distinguishable at all, and so do M and W — and it is not the skill those tracks are for.
 */

import { MAX_LETTER } from "./letters";

/** Which kind of token a track deals in. A track id IS its mode; there is no second list. */
export type Mode = "color" | "shape" | "number" | "letter";

export type Level = {
  /** Level number WITHIN its track, so every track starts at 1. */
  n: number;
  rounds: number;
  /** Shuffle which token sits at which hole, so position stops being a cue. */
  shuffleHoles: boolean;
  /** Maximum absolute rotation applied to a block, in degrees. 0 = upright. */
  maxRotation: number;
  /** What the blocks carry. Always the mode of the track this level belongs to. */
  mode: Mode;
  /** Number levels draw their four holes from 1..numberMax. */
  numberMax?: number;
  /** Letter levels draw their four holes from the first `letterMax` letters. */
  letterMax?: number;
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

/**
 * A letter level.
 *
 * Level 1 is the one that does not shuffle, for the same reason colour and shape level 1 do
 * not: `drawDistinct` returns its draw in ascending order, so an unshuffled letter board reads
 * left-to-right in alphabetical order. That is a crutch a child can lean on before they can
 * read a letter, and taking it away is what level 2 is for.
 */
const letterLevel = (
  n: number,
  letterMax: number,
  rounds = 8,
  shuffleHoles = true,
): Level => ({
  n,
  rounds,
  shuffleHoles,
  maxRotation: 0,
  mode: "letter",
  letterMax,
});

export const COLOR_LEVELS: Level[] = [
  colorLevel(1, 6, false),
  colorLevel(2, 8, true),
  colorLevel(3, 8, true),
];

export const SHAPE_LEVELS: Level[] = [
  { n: 1, rounds: 6, shuffleHoles: false, maxRotation: 0, mode: "shape" },
  { n: 2, rounds: 8, shuffleHoles: true, maxRotation: 0, mode: "shape" },
  { n: 3, rounds: 8, shuffleHoles: true, maxRotation: 32, mode: "shape" },
];

export const NUMBER_LEVELS: Level[] = [
  numberLevel(1, 5, 6),
  numberLevel(2, 10),
  numberLevel(3, 12),
  numberLevel(4, 14),
  numberLevel(5, 16),
  numberLevel(6, 18),
  numberLevel(7, 20),
];

export const LETTER_LEVELS: Level[] = [
  letterLevel(1, 5, 6, false),
  letterLevel(2, 10),
  letterLevel(3, 16),
  letterLevel(4, 21),
  letterLevel(5, MAX_LETTER),
];

/**
 * Bump this whenever any track's level list changes what its INDICES MEAN.
 *
 * Saved progress stores an index into a track's level list, so inserting or reordering levels
 * silently repoints it: adding the three colour levels at the front of the old single ladder
 * turned a saved "index 4" from a number level into shape level 5, and anyone with progress
 * skipped the new levels entirely without a hint that it had happened. A version stamp makes
 * that a reset instead of a wrong resume — losing a few banked stars is the cheaper failure by
 * far.
 *
 * Appending a level to the END of a track is the one safe change, since existing indices keep
 * their meaning. ADDING A WHOLE TRACK is also safe: progress is stored per track id and a track
 * with no stored entry simply starts at level 1. Anything else: bump.
 *
 *   1  three shape levels, then seven number levels
 *   2  three colour levels inserted at the front
 *   3  split into four tracks; progress is per track, and level numbers restart at 1
 */
export const LEVELS_VERSION = 3;

/** Largest numeral any level can ask for. Bounds the spoken clips that must exist. */
export const MAX_NUMBER = 20;

/**
 * Wrong drops allowed per level attempt before it restarts.
 *
 * Note what this does NOT reset: the levels already finished in this track, or their stars. A
 * restart costs the current level and nothing else, which is the difference between "try that
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
