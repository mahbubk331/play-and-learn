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
  BUBBLE_LEVELS,
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

/**
 * The bubble game, described the way a track is so the picker can render its card from the same
 * component and show the same star line.
 *
 * NOT IN `TRACKS`, and that is the point of it being separate rather than a fifth entry. A Track
 * is a level list the drag engine runs; this is a level list a different screen runs, and
 * `trackById` must never hand it to App's track code. What it shares with a track is only what
 * the picker needs: a title, a blurb, levels to count, and a progress key.
 */
export const BUBBLES = {
  id: "bubbles" as const,
  title: "Bubbles",
  blurb: "Pop the one you are asked for",
  levels: BUBBLE_LEVELS,
};

/** Three stars a level, so this is the perfect score for one game. */
export const maxStars = (game: { levels: Level[] }): number =>
  game.levels.length * 3;

/**
 * Perfect score across everything the picker scores. Shown beside the title.
 *
 * The bubble game counts. It has levels and stars and the same three-try rule, so leaving it out
 * would make a full house read as less than 100%.
 */
export const TOTAL_STARS =
  TRACKS.reduce((sum, t) => sum + maxStars(t), 0) + maxStars(BUBBLES);
