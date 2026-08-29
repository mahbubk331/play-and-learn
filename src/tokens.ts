/**
 * A token is the thing on a block and the thing a hole wants.
 *
 * There are four kinds, in the order the tracks use them — which is also the order a child
 * acquires them: **colour**, then **shape**, then **number**, then **letter**. THE FOUR GAMES
 * ARE FOUR LEVEL LISTS, NOT FOUR GAMES: everything downstream (the board, the block, the drag,
 * the matching, the scoring, the spoken cue) works on tokens, and a level only says which kind
 * it deals in. Picking "Letters" on the menu selects a level list, not a code path.
 *
 * The kinds differ in what carries the cue, and each choice is forced:
 *
 *   shape   the hole is a CUT-OUT of that shape, so the outline is the cue and the printed word
 *           underneath is a bonus.
 *   number  the hole is a cut-out of the DIGITS, so a "7" block drops into a 7-shaped hole.
 *           Matching a numeral's form is where numeral recognition starts.
 *   letter  the same, one letter at a time: an "R" block drops into an R-shaped hole. Uppercase
 *           only, for reasons that are partly pedagogical and partly about descenders — see
 *           letters.ts.
 *   colour  every hole is the same circle, because a colour cannot be a shape. The cue is the
 *           hole's coloured rim, and the name is printed and spoken. This is the one kind where
 *           a block physically fits any hole — unavoidable, and exactly how the Sorting Factory
 *           video works.
 */

import type { SoundName } from "./audio";
import { HUES } from "./hues";
import { ALPHABET } from "./letters";
import { SHAPES } from "./stage";

export type Token =
  | { kind: "shape"; shape: number }
  | { kind: "number"; value: number }
  | { kind: "color"; color: number }
  /** `letter` is an INDEX into ALPHABET rather than a character, so it draws like `color` does. */
  | { kind: "letter"; letter: number };

/** Stable identity, for comparing and for React keys. */
export const tokenKey = (t: Token): string => {
  switch (t.kind) {
    case "shape":
      return `s${t.shape}`;
    case "number":
      return `n${t.value}`;
    case "color":
      return `c${t.color}`;
    case "letter":
      return `l${t.letter}`;
  }
};

export const sameToken = (a: Token, b: Token): boolean =>
  tokenKey(a) === tokenKey(b);

/**
 * Printed under the hole.
 *
 * Numbers and letters print nothing — Board checks `tokenGlyph` for that, not this. Their hole
 * IS the character, so a printed copy underneath would be the same information twice.
 */
export const tokenLabel = (t: Token): string => {
  switch (t.kind) {
    case "shape":
      return SHAPES[t.shape].word;
    case "number":
      return String(t.value);
    case "color":
      return HUES[t.color].word;
    case "letter":
      return ALPHABET[t.letter];
  }
};

/**
 * Polygon for the block and hole outline. Null for numbers and letters, which are drawn as a
 * glyph instead.
 */
export const tokenPoints = (t: Token): [number, number][] | null => {
  switch (t.kind) {
    case "shape":
      return SHAPES[t.shape].points;
    case "number":
    case "letter":
      return null;
    // Colour blocks are circles, like the balls in the Sorting Factory video.
    case "color":
      return SHAPES[0].points;
  }
};

/**
 * The character, when the token IS a character — a numeral or a letter.
 *
 * Such a block is drawn as its own glyph and drops into a glyph-shaped cut-out. Number holes
 * started as identical squares with the numeral printed underneath, which meant a block fitted
 * any of them and only a label told the holes apart. Cutting the glyph restores the
 * fits/doesn't-fit fiction the shape levels have, and the letter track inherited it for free.
 *
 * Returning non-null is also how the rest of the app asks "is this token text?": Board skips the
 * printed word under the hole, and Block skips the gloss highlight, since a shine sitting on a
 * mostly-outline glyph reads as a smudge rather than as a shine.
 */
export const tokenGlyph = (t: Token): string | null => {
  switch (t.kind) {
    case "number":
      return String(t.value);
    case "letter":
      return ALPHABET[t.letter];
    default:
      return null;
  }
};

/**
 * Font size for a glyph token, relative to the base shape size.
 *
 * Two digits are roughly twice as wide as one, and at full size "11" or "20" would run into the
 * neighbouring hole. The resulting height difference between "7" and "17" reads as two different
 * tiles, which they are.
 *
 * Letters sit just under the single-digit size for the same collision reason at the other
 * extreme: "W" and "M" are the widest glyphs in the font by some margin, and 1.0 keeps their
 * hole — cut at HOLE_SCALE, so 16% wider again — clear of the gap to the next hole. Sizing them
 * per letter was the alternative and it is worse: the holes would then be visibly different
 * sizes, which is a cue about which letter it is that has nothing to do with reading it.
 */
export const tokenFontScale = (t: Token): number => {
  if (t.kind === "letter") return 1.0;
  return t.kind === "number" && String(t.value).length > 1 ? 0.74 : 1.05;
};

/**
 * The block's fill, and the colour of its hole's rim.
 *
 * Null means "use the default": one orange for every shape, number and letter block. That
 * default is load-bearing on the shape levels — colour-coding the shapes would let a child solve
 * them by matching colour to colour without ever looking at an outline — and it carries the same
 * weight on the letter levels, where a per-letter colour would be learnable long before the
 * letter is. On a COLOUR level the colour is the entire point, so it comes from the token.
 */
export const tokenHue = (t: Token): { fill: string; deep: string } | null =>
  t.kind === "color"
    ? { fill: HUES[t.color].fill, deep: HUES[t.color].deep }
    : null;

/** Audio clip id for the spoken cue. See src/kids/gamevoice.ts in the Remotion project. */
export const tokenClip = (t: Token): SoundName => {
  switch (t.kind) {
    case "shape":
      return SHAPES[t.shape].id as SoundName;
    case "number":
      return `n${t.value}`;
    case "color":
      return `c${HUES[t.color].id}`;
    // No recorded clip for these yet; AudioEngine speaks them instead. See audio.ts.
    case "letter":
      return `l${ALPHABET[t.letter]}`;
  }
};
