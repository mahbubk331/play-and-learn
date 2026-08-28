/**
 * A token is the thing on a block and the thing a hole wants.
 *
 * There are three kinds, in the order the levels use them — which is also the order a child
 * acquires them: **colour**, then **shape**, then **number**. Rather than fork into three
 * games, everything downstream (the board, the block, the drag, the matching, the spoken cue)
 * works on tokens, and a level only says which kind it deals in.
 *
 * The kinds differ in what carries the cue, and each choice is forced:
 *
 *   shape   the hole is a CUT-OUT of that shape, so the outline is the cue and the printed word
 *           underneath is a bonus.
 *   number  the hole is a cut-out of the DIGITS, so a "7" block drops into a 7-shaped hole.
 *           Matching a numeral's form is where numeral recognition starts.
 *   colour  every hole is the same circle, because a colour cannot be a shape. The cue is the
 *           hole's coloured rim, and the name is printed and spoken. This is the one kind where
 *           a block physically fits any hole — unavoidable, and exactly how the Sorting Factory
 *           video works.
 */

import type { SoundName } from "./audio";
import { HUES } from "./hues";
import { SHAPES } from "./stage";

export type Token =
  | { kind: "shape"; shape: number }
  | { kind: "number"; value: number }
  | { kind: "color"; color: number };

/** Stable identity, for comparing and for React keys. */
export const tokenKey = (t: Token): string => {
  switch (t.kind) {
    case "shape":
      return `s${t.shape}`;
    case "number":
      return `n${t.value}`;
    case "color":
      return `c${t.color}`;
  }
};

export const sameToken = (a: Token, b: Token): boolean =>
  tokenKey(a) === tokenKey(b);

/** Printed under the hole. Numbers print nothing — the hole is already the numeral. */
export const tokenLabel = (t: Token): string => {
  switch (t.kind) {
    case "shape":
      return SHAPES[t.shape].word;
    case "number":
      return String(t.value);
    case "color":
      return HUES[t.color].word;
  }
};

/** Polygon for the block and hole outline. Null for numbers, which are drawn as a glyph. */
export const tokenPoints = (t: Token): [number, number][] | null => {
  switch (t.kind) {
    case "shape":
      return SHAPES[t.shape].points;
    case "number":
      return null;
    // Colour blocks are circles, like the balls in the Sorting Factory video.
    case "color":
      return SHAPES[0].points;
  }
};

/**
 * The numeral, when the token IS a numeral.
 *
 * A number block is drawn as its own digits and drops into a digit-shaped cut-out. Number holes
 * started as identical squares with the numeral printed underneath, which meant a block fitted
 * any of them and only a label told the holes apart. Cutting the glyph restores the
 * fits/doesn't-fit fiction the shape levels have.
 */
export const tokenGlyph = (t: Token): string | null =>
  t.kind === "number" ? String(t.value) : null;

/**
 * Font size for a numeral token, relative to the base shape size.
 *
 * Two digits are roughly twice as wide as one, and at full size "11" or "20" would run into the
 * neighbouring hole. The resulting height difference between "7" and "17" reads as two different
 * tiles, which they are.
 */
export const tokenFontScale = (t: Token): number =>
  t.kind === "number" && String(t.value).length > 1 ? 0.74 : 1.05;

/**
 * The block's fill, and the colour of its hole's rim.
 *
 * Null means "use the default": one orange for every shape and number block. That default is
 * load-bearing on the shape levels — colour-coding the shapes would let a child solve them by
 * matching colour to colour without ever looking at an outline. On a COLOUR level the colour is
 * the entire point, so it comes from the token.
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
  }
};
