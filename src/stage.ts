/**
 * Logical geometry and hit testing.
 *
 * The game is laid out in a fixed 1000x720 logical stage and scaled to fit whatever
 * screen it is on (see App.tsx). Fixed-then-scaled rather than a fluid layout because
 * a fluid one has to be correct at every width, and this one only has to be correct
 * once — which matters when the thing being positioned is a drop target a two-year-old
 * has to hit.
 */

import { SHAPES } from "./shared/shapes";

export { SHAPES, HOLE_SCALE, pointsAttr, scaledPoints } from "./shared/shapes";
export type { Shape, ShapeId } from "./shared/shapes";

export const STAGE = { width: 1000, height: 720 };

/**
 * Drawing size for blocks and holes, in logical units.
 *
 * 140 rather than the video's proportions: this one is a drag target for a hand with
 * poor aim, so it is sized up until the holes are almost touching. Raising it further
 * starts eating the gap between holes, which is what bounds SNAP_RADIUS below.
 */
export const SHAPE_PX = 140;

const HOLE_EXTENT = SHAPE_PX * 1.16;

export const BOARD = {
  left: 40,
  top: 400,
  width: 920,
  height: 300,
  padding: 30,
};

export const HOLE_Y = BOARD.top + 130;

const HOLE_GAP =
  (BOARD.width - BOARD.padding * 2 - SHAPES.length * HOLE_EXTENT) /
  (SHAPES.length - 1);

export const holeCenterX = (index: number): number =>
  BOARD.left + BOARD.padding + HOLE_EXTENT / 2 + index * (HOLE_EXTENT + HOLE_GAP);

/**
 * Where the T-rex stands when it arrives, in logical units.
 *
 * Upper right, and deliberately NOT over the board: the child has to be able to see
 * where to try next while the dinosaur is still on screen. It laps slightly over the HUD
 * and the board's top edge, which is fine for a one-second event and is what lets it be
 * big enough to be worth showing.
 *
 * Sized and placed so the whole animal stays inside the stage and above the board:
 * 570 + 400 = 970 < 1000, and the lunge scales to 1.12 about x=770, putting the right
 * edge at 992. At 600/420 the tail tip was being clipped off by the stage's overflow, and
 * the lunge clipped more. The head starts at viewBox x=40, i.e. screen 650, which keeps it
 * clear of the block's right edge at 570.
 */
export const CRITTER = { x: 570, y: 60, width: 400 };

/** Where the block waits to be picked up. */
export const BLOCK_HOME = { x: STAGE.width / 2, y: 225 };

/** Spacing between hole centres, which bounds how forgiving snapping can be. */
export const HOLE_SPACING = HOLE_EXTENT + HOLE_GAP;

/**
 * How close the block has to get to count as dropped on a hole.
 *
 * Generous on purpose — a three-year-old's aim is bad and the game is not a test of
 * fine motor control. But strictly less than half the hole spacing, so "nearest hole"
 * is never ambiguous: at exactly half, a drop equidistant between two holes would
 * resolve arbitrarily and the child would be told they were wrong about a shape they
 * were right about.
 */
export const SNAP_RADIUS = Math.min(150, HOLE_SPACING * 0.46);

/**
 * Which hole POSITION the block was dropped on, or null for none.
 *
 * A position, not a shape. From level 2 the board is shuffled, so the caller has to map
 * through the level's `arrangement` to find out which shape that hole actually wants.
 * Returning a shape here would have quietly hard-coded the level-1 board.
 *
 * Returning null for "nowhere near a hole" is important and is not the same as wrong.
 * A drop in empty space is a failed drag, not a failed answer: it gets the block back
 * with no sound and no red X. Scoring it as wrong would punish the child for their
 * hands rather than their thinking, which at this age is most of what goes wrong.
 */
export const holeAt = (x: number, y: number): number | null => {
  let best: number | null = null;
  let bestDistance = Infinity;

  for (let i = 0; i < SHAPES.length; i++) {
    const dx = x - holeCenterX(i);
    const dy = y - HOLE_Y;
    const distance = Math.hypot(dx, dy);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return bestDistance <= SNAP_RADIUS ? best : null;
};
