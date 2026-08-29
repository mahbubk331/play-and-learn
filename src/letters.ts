/**
 * The alphabet the letter levels draw from.
 *
 * UPPERCASE ONLY, and that is a decision rather than a shortcut. Two reasons, and the second
 * one is mechanical:
 *
 *   1. Capitals are the forms a two-to-five year old meets first, and they are far more
 *      distinct from each other than lowercase is — b, d, p and q are four rotations of one
 *      shape, and a game whose entire premise is "does this fit that hole" would be teaching
 *      the confusion rather than the letters.
 *   2. Every capital sits on the baseline inside one cap height. A hole is a CUT-OUT of its
 *      letter, so a descender (g, j, p, q, y) would punch through the bottom edge of the board
 *      and into the strip where the printed labels go. Uppercase keeps every hole on the board
 *      face without special-casing nine letters.
 *
 * No letter is left out. I and O are the thin ones and their cut-outs are narrow slots, but
 * that is only a visual matter: the drop test is distance to the hole CENTRE (see stage.ts),
 * never whether the block is inside the outline, so a narrow hole is exactly as easy to hit as
 * a wide one.
 */

export const ALPHABET: string[] = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

/** How many letters any level can ask for. Bounds the spoken cues that must exist. */
export const MAX_LETTER = ALPHABET.length;
