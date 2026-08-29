/**
 * The four games, and what the picker needs to know about each.
 *
 * A track is a level list plus a title. It is deliberately NOT a game: every track runs the
 * same engine over the same token model (tokens.ts), so the board, the block, the drag, the
 * matching, the scoring and the spoken cue are one implementation and a fifth track would be
 * an entry in this array.
 *
 * ORDER MATTERS, and it is the only thing left of the old single ladder: colours, then shapes,
 * then numbers, then letters, which is the order a child acquires the skills. Nothing enforces
 * it — every track is unlocked from the first launch, because the alternative is a
 * three-year-old who is ready for numbers being made to finish colours first, and because the
 * person choosing is usually the adult holding the tablet. The order is the recommendation.
 *
 * Letters come after numbers rather than before, which is the one arguable placement. Numerals
 * are a set of ten and letters a set of twenty-six, and 1-5 is a smaller first ask than A-E is,
 * so numbers is the gentler of the two.
 */

import {
  COLOR_LEVELS,
  LETTER_LEVELS,
  NUMBER_LEVELS,
  SHAPE_LEVELS,
  type Level,
  type Mode,
} from "./levels";

export type Track = {
  /** Also the token kind the track deals in, and the key its saved progress is stored under. */
  id: Mode;
  /** On the picker card, and in the HUD while the track is being played. */
  title: string;
  /**
   * One line under the title.
   *
   * Written for the ADULT choosing on the child's behalf, because the child cannot read it. It
   * says what the track actually asks for, not what it is called.
   */
  blurb: string;
  levels: Level[];
};

export const TRACKS: Track[] = [
  {
    id: "color",
    title: "Colours",
    blurb: "Drop the ball in the matching colour",
    levels: COLOR_LEVELS,
  },
  {
    id: "shape",
    title: "Shapes",
    blurb: "Circle, square, triangle, star",
    levels: SHAPE_LEVELS,
  },
  {
    id: "number",
    title: "Numbers",
    blurb: "Numerals, 1 to 20",
    levels: NUMBER_LEVELS,
  },
  {
    id: "letter",
    title: "Letters",
    blurb: "Capitals, A to Z",
    levels: LETTER_LEVELS,
  },
];

/**
 * Throws on an unknown id rather than falling back to the first track.
 *
 * A silent fallback here would show the colour game to someone who asked for letters, which is
 * a bug that looks like a design decision. The only ids that reach this come from TRACKS itself
 * or from saved progress, and saved progress is validated before it gets this far.
 */
export const trackById = (id: Mode): Track => {
  const found = TRACKS.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown track "${id}"`);
  return found;
};

/** Three stars a level, so this is the perfect score for one track. */
export const maxStars = (track: Track): number => track.levels.length * 3;

/** Perfect score across all four tracks. Shown on the picker. */
export const TOTAL_STARS = TRACKS.reduce((sum, t) => sum + maxStars(t), 0);
