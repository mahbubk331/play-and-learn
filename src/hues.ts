/**
 * The seven colours the colour levels draw from.
 *
 * Four of the seven are picked per level attempt, so a replay is a different board. Seven is
 * enough that the four are rarely the same twice; more than that and the hues start colliding
 * with each other rather than being distinct names a child can learn.
 *
 * `deep` is the saturated version used for the hole rim and the block's outline. The mid `fill`
 * on its own is too light to hold an edge against the board.
 *
 * ON RED AND GREEN: both are here, and that is unavoidable — you cannot teach colour names
 * without them. The mitigations are the same as the Sorting Factory video's: they are never
 * adjacent in the palette order, the colour's NAME is printed under its hole, and the name is
 * spoken when the block appears. A colour-blind child can play by word and by position.
 */

export type Hue = {
  id: string;
  /** Printed under the hole and spoken when the block appears. */
  word: string;
  fill: string;
  deep: string;
};

export const HUES: Hue[] = [
  { id: "red", word: "Red", fill: "#F0464B", deep: "#B32226" },
  { id: "orange", word: "Orange", fill: "#F2913D", deep: "#B85F13" },
  { id: "yellow", word: "Yellow", fill: "#FFC53D", deep: "#B8860B" },
  { id: "green", word: "Green", fill: "#4FBF6A", deep: "#248C42" },
  { id: "blue", word: "Blue", fill: "#3D8BF5", deep: "#1B5AB8" },
  { id: "purple", word: "Purple", fill: "#8B5CF6", deep: "#5B2FBF" },
  { id: "pink", word: "Pink", fill: "#EC6BA8", deep: "#B23A73" },
];

export const HOLES_PER_BOARD = 4;
