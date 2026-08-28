/**
 * Round generation and game rules.
 *
 * On the restart rule: this game DOES have a fail state, and it is worth being explicit
 * that it cuts against how the rest of the series is built. The videos and the first
 * cut of this game deliberately had no way to lose, because a two-to-five year old who
 * is told they have failed tends to stop playing. It was added on request, so the work
 * here is all in keeping the cost small and legible:
 *
 *   - the three tries are on screen the whole time, so running out is never a surprise
 *   - a restart costs the current level only; finished levels and their stars stay
 *   - it is announced as "let's try again", not as a loss
 *   - a level you complete never scores zero
 *
 * If it does turn out to end sessions early, MAX_WRONG in levels.ts is the one number
 * to change, and raising it high restores the original no-lose behaviour.
 */

import type { Level } from "./levels";
import { SHAPES } from "./stage";
import { HOLES_PER_BOARD, HUES } from "./hues";
import type { Token } from "./tokens";

export type Round = {
  token: Token;
  /** Degrees. Only ever non-zero on level 3. */
  rotation: number;
};

/**
 * Which token sits at which hole: `arrangement[position]`.
 *
 * Level 1 is the shapes in their authored order, so the circle hole is the first hole — the
 * same promise the video series makes, and what lets a new player answer by position before
 * they can answer by shape. Later levels shuffle it.
 *
 * Number levels draw four DISTINCT numerals from 1..numberMax. Distinct matters: two holes
 * wanting the same number would make one of them unreachable and the other ambiguous.
 *
 * Shuffled once per attempt, not per round. Per-round would be re-teaching the board every
 * few seconds instead of testing recognition.
 */
export const makeArrangement = (level: Level): Token[] => {
  const slots = HOLES_PER_BOARD;

  const tokens: Token[] =
    level.mode === "shape"
      ? SHAPES.map((_, i) => ({ kind: "shape", shape: i }))
      : level.mode === "color"
        ? // Four of the seven hues, in palette order so the board is not also scrambled
          // before shuffleHoles has had its say.
          drawDistinct(HUES.length, slots).map((i) => ({
            kind: "color",
            color: i - 1,
          }))
        : drawDistinct(level.numberMax ?? 5, slots).map((value) => ({
            kind: "number",
            value,
          }));

  if (!level.shuffleHoles) return tokens;

  for (let i = tokens.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
  }
  return tokens;
};

/**
 * `count` distinct values from 1..max, by partial shuffle, returned in ascending order.
 *
 * Distinct matters for both the colour and the number levels: two holes wanting the same thing
 * would make one of them unreachable and the other ambiguous.
 */
const drawDistinct = (max: number, count: number): number[] => {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, max)).sort((a, b) => a - b);
};

/**
 * A running order over the tokens ON THE BOARD, with none twice in a row.
 *
 * Drawn from the arrangement rather than from the whole token space, which is what stops a
 * number level asking for a numeral that is not on the board.
 *
 * Of the tokens with the most draws left, excluding whatever came last, pick one at random.
 * "Most left" is what makes this correct rather than merely likely: always taking from the
 * largest remaining group is the standard greedy arrangement for this problem and cannot
 * paint itself into a corner while a valid order exists. Randomising *within* that group is
 * what keeps it varied.
 *
 * Two earlier versions were wrong in ways only measurement showed:
 *
 *   - Shuffle the pool, then repair adjacent duplicates by swapping them forward. Satisfied
 *     the rule and produced circle-square-circle-square-triangle-star-triangle-star: no
 *     repeats, obvious pattern.
 *   - Draw weighted by remaining count. Varied, but hit the endgame trap — the last two
 *     draws being the one token nobody had used — in 9% of playthroughs.
 *
 * The no-repeat rule is the video's rule for the video's reason: a repeat teaches "do what
 * you just did" instead of "look at the block".
 */
export const makeRounds = (level: Level, arrangement: Token[]): Round[] => {
  const perToken = Math.ceil(level.rounds / arrangement.length);
  const remaining = arrangement.map(() => perToken);
  const order: number[] = [];
  let previous = -1;

  for (let n = 0; n < level.rounds; n++) {
    const eligible = remaining
      .map((count, index) => ({ index, count }))
      .filter((o) => o.count > 0 && o.index !== previous);

    // Unreachable for any level in LEVELS, but throwing would be a worse outcome than one
    // repeat.
    const pool =
      eligible.length > 0
        ? eligible
        : remaining
            .map((count, index) => ({ index, count }))
            .filter((o) => o.count > 0);

    if (pool.length === 0) break;

    const most = Math.max(...pool.map((o) => o.count));
    const top = pool.filter((o) => o.count === most);
    const pick = top[Math.floor(Math.random() * top.length)].index;

    order.push(pick);
    remaining[pick] -= 1;
    previous = pick;
  }

  return order.map((slot) => ({
    token: arrangement[slot],
    rotation:
      level.maxRotation === 0
        ? 0
        : // Kept away from zero: a 3-degree tilt reads as a rendering artefact rather than
          // as a variation the child is meant to work around.
          (Math.random() < 0.5 ? -1 : 1) *
          (level.maxRotation * 0.45 + Math.random() * level.maxRotation * 0.55),
  }));
};

export type Phase =
  /** Block is at home or being dragged. */
  | "playing"
  /** Right hole: block seats, celebration plays. */
  | "correct"
  /** Wrong hole: red X, block springs home. */
  | "wrong"
  /** Third wrong: the level is about to restart. */
  | "restarting"
  /** Level finished: stars awarded, next level offered. */
  | "levelDone"
  /** Every level finished. */
  | "gameDone";

/** How long each feedback beat holds before the game moves on, in ms. */

/**
 * A critter applauds on a CORRECT answer, so the reward beat is the long one now.
 *
 * 1500ms of animation plus a breath. It was the wrong beat that had to be stretched when
 * the dinosaur roared at mistakes; moving it to the reward puts the long, elaborate beat
 * on the thing worth repeating and lets the correction go back to being brief.
 *
 * CRITTER_ANIM_MS and the four CSS animation durations in index.css have to stay in step.
 */
export const CRITTER_ANIM_MS = 1500;
export const CORRECT_HOLD = CRITTER_ANIM_MS + 200;

/**
 * Back down to 900ms now that no dinosaur has to fit inside it. A wrong answer should cost
 * as little time as possible — the faster the block is back in reach, the more likely the
 * next thing that happens is another guess.
 */
export const WRONG_HOLD = 900;
export const RESTART_HOLD = 2000;
