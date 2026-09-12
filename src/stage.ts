/**
 * Logical geometry and hit testing.
 *
 * The game is laid out in a fixed logical stage and scaled to fit whatever screen it is on
 * (see App.tsx). Fixed-then-scaled rather than a fluid layout because a fluid one has to be
 * correct at every width, and this one only has to be correct twice — which matters when the
 * thing being positioned is a drop target a two-year-old has to hit.
 *
 * Twice, not once: there is a landscape stage and a portrait one. See THE TWO STAGES below.
 */

import { SHAPES } from "./shared/shapes";

export { SHAPES, HOLE_SCALE, pointsAttr, scaledPoints } from "./shared/shapes";
export type { Shape, ShapeId } from "./shared/shapes";

/**
 * THE TWO STAGES.
 *
 * The game was one fixed 1000x720 landscape rectangle, scaled by min(w/1000, h/720). Held
 * upright, a phone binds on width and wastes the height: 390x844 gives a scale of 0.39, a
 * stage 152x280 in the middle of the screen, and two thirds of the display empty. The native
 * builds never see it, because native.ts locks the orientation. The web cannot — mobile Safari
 * has no orientation lock outside fullscreen, and a device with Portrait Orientation Lock
 * switched on never reports landscape however it is held.
 *
 * So there are two stages, and the holes rearrange between them: four in a row across the
 * landscape board, two-by-two on the portrait one. That rearrangement is the whole point.
 * Four holes across a 640-wide stage would leave about 100 units each, and SHAPE_PX is 140
 * precisely because a smaller target is one a two-year-old misses — shrinking the holes to fit
 * would have traded the empty screen for a game they cannot play.
 *
 * PORTRAIT IS 640x1138, i.e. 9:16. Phone aspect ratios run from roughly 0.46 to 0.56, so no
 * single portrait rectangle fits them all; 9:16 sits at the wide end of that range, which fills
 * a 390x844 phone to about 82% and leaves the shortfall as a thin band rather than a third of
 * the screen.
 */
export type Orientation = "landscape" | "portrait";

/**
 * Drawing size for blocks and holes, in logical units. THE SAME IN BOTH ORIENTATIONS.
 *
 * 140 rather than the video's proportions: this one is a drag target for a hand with
 * poor aim, so it is sized up until the holes are almost touching. Raising it further
 * starts eating the gap between holes, which is what bounds the snap radius below.
 *
 * It does not shrink for the portrait board, and that constraint is what decides the 2x2
 * arrangement rather than the arrangement deciding the size.
 */
export const SHAPE_PX = 140;

const HOLE_EXTENT = SHAPE_PX * 1.16;

/** Hole centres sit this far below the board's top edge, on the first row. */
const FIRST_ROW_DROP = 130;

/**
 * How far under a hole's centre its printed word sits.
 *
 * One offset for both orientations and every row. On the landscape board this reproduces the
 * old `BOARD.top + BOARD.height - 22` exactly (400 + 130 + 148 = 678, and 400 + 300 - 22 = 678);
 * on the portrait board the second row needs its own baseline, and a label positioned from the
 * board's bottom edge would have stacked both rows' words on each other at the very bottom.
 */
const LABEL_DROP = 148;

type LayoutSpec = {
  stage: { width: number; height: number };
  board: {
    left: number;
    top: number;
    width: number;
    height: number;
    padding: number;
  };
  /** Holes per row. Any beyond this wrap onto further rows. */
  cols: number;
  /** Distance between hole-centre rows. Unused when there is only one row. */
  rowPitch: number;
  blockHome: { x: number; y: number };
  critter: { x: number; y: number; width: number };
  menu: {
    card: {
      width: number;
      height: number;
      gap: number;
      left: number;
      top: number;
    };
    /** Cards per row on the picker. */
    cols: number;
    titleSize: number;
    scoreSize: number;
    /**
     * The animal banner's row of sample animals: how tall, and how many.
     *
     * Both shrink in portrait because the banner is a strip beside a title, a blurb and a
     * status line, and at four animals 96 tall that strip is 458 units wide inside a card with
     * 412 to give — so the text was pushed clean off the card and off the stage behind it.
     */
    stripHeight: number;
    stripCount: number;
  };
  memory: {
    /** The rectangle the card grid is fitted into and centred in. */
    area: { left: number; top: number; width: number; height: number };
    gap: number;
    /**
     * Columns for each supported CARD count — 6, 8 and 12. See PAIR_STEPS in memory.ts.
     *
     * A table rather than a formula, because the right answer is not `ceil(sqrt(n))` on either
     * stage: it is whatever divides the count exactly AND runs with the long side of the
     * rectangle. Twelve cards want 4x3 on the wide stage and 3x4 on the tall one, and a
     * formula that gets both right is longer than the table.
     */
    cols: Record<number, number>;
  };
  hud: {
    starSize: number;
    /**
     * Whether the top bar breaks onto two lines.
     *
     * The bar is three groups spread across the stage: which game, a star per round, and the
     * tries left with the score. On the 1000-wide stage they fit in one row with room to
     * spare. On the 640-wide one they do not — the round stars alone run to nine on the
     * numbers track — and squeezed into one line they collide.
     */
    stack: boolean;
  };
};

const LAYOUTS: Record<Orientation, LayoutSpec> = {
  landscape: {
    stage: { width: 1000, height: 720 },
    board: { left: 40, top: 400, width: 920, height: 300, padding: 30 },
    cols: 4,
    rowPitch: 0,
    blockHome: { x: 500, y: 225 },
    critter: { x: 570, y: 60, width: 400 },
    menu: {
      card: { width: 420, height: 150, gap: 24, left: 63, top: 188 },
      cols: 2,
      titleSize: 68,
      scoreSize: 40,
      stripHeight: 64,
      stripCount: 3,
    },
    memory: {
      area: { left: 60, top: 132, width: 880, height: 542 },
      gap: 22,
      cols: { 6: 3, 8: 4, 12: 4 },
    },
    hud: { starSize: 30, stack: false },
  },

  portrait: {
    stage: { width: 640, height: 1138 },
    /*
     * 480 wide inside a 640 stage, which puts the two columns of holes 95 units apart — close
     * to the 70 the four-across board leaves, so "nearest hole" stays unambiguous by a similar
     * margin. The height carries two rows at a 300 pitch with a label under each, and it takes
     * the lower half of the stage: the block needs far less room above it than two rows of holes
     * need below, and splitting the height evenly left a conspicuously empty upper third.
     */
    board: { left: 80, top: 470, width: 480, height: 620, padding: 30 },
    cols: 2,
    rowPitch: 300,
    blockHome: { x: 320, y: 300 },
    critter: { x: 240, y: 170, width: 380 },
    menu: {
      /*
       * One column. Two 420-wide cards do not fit across 640, and narrowing them wraps all
       * three lines of text inside — see the note on CARD in Menu.tsx.
       */
      card: { width: 480, height: 160, gap: 20, left: 80, top: 190 },
      cols: 1,
      titleSize: 46,
      scoreSize: 32,
      stripHeight: 52,
      stripCount: 2,
    },
    memory: {
      area: { left: 50, top: 210, width: 540, height: 856 },
      gap: 20,
      cols: { 6: 2, 8: 2, 12: 3 },
    },
    hud: { starSize: 26, stack: true },
  },
};

/*
 * THE ACTIVE LAYOUT IS MUTATED IN PLACE, and that is a deliberate, slightly ugly choice.
 *
 * Everything on the stage is positioned from these objects, read directly at render time by
 * six modules across some sixty call sites. Threading a layout value through all of them — as
 * props, or as a context — is the textbook answer, and it would be a far larger change to
 * files whose every constant carries a paragraph explaining it.
 *
 * What makes mutation safe enough here: it happens in exactly one place, App's resize handler,
 * BEFORE the state update that re-renders; and the stage is keyed on the orientation, so a flip
 * remounts the tree rather than leaving a component holding half of each layout.
 *
 * `applyLayout` also runs once at module scope below, so these are never half-initialised even
 * if something renders before the first resize.
 */
export const STAGE = { width: 0, height: 0 };
export const BOARD = { left: 0, top: 0, width: 0, height: 0, padding: 0 };

/** Where the block waits to be picked up. */
export const BLOCK_HOME = { x: 0, y: 0 };

/**
 * Where the reward critter stands when it arrives, in logical units.
 *
 * Clear of the board and clear of the block in both orientations, because the child has to be
 * able to see where to try next while it is still on screen. Landscape puts it upper right,
 * which that stage has the width for. Portrait has no spare width beside the block, so it sits
 * above it and is drawn a little smaller to stay inside the narrower stage.
 */
export const CRITTER = { x: 0, y: 0, width: 0 };

/** Picker geometry. Separated out because the card grid changes column count. */
export const MENU = {
  card: { width: 0, height: 0, gap: 0, left: 0, top: 0 },
  cols: 1,
  titleSize: 0,
  scoreSize: 0,
  stripHeight: 0,
  stripCount: 0,
  /** The bottom row, spanning the whole card grid. See the note in Menu.tsx. */
  wideWidth: 0,
  wideTop: 0,
  /**
   * One of the two cards that share the bottom row: the park and the memory board.
   *
   * They share a row rather than taking one each, and that is a space constraint as much as a
   * design one. A second full-width banner runs the landscape picker to 860 units inside a
   * 720-tall stage. Side by side they cost the row that was already there.
   */
  extraWidth: 0,
};

/** Top-bar geometry. See the note on `stack`. */
export const HUD = { starSize: 0, stack: false };

const MEMORY_AREA = { left: 0, top: 0, width: 0, height: 0 };
let memoryGap = 0;
let memoryCols: Record<number, number> = {};

/**
 * Where one memory card goes, and how big it is.
 *
 * Cards FILL their cell rather than holding a fixed aspect ratio, and the artwork inside is
 * scaled to fit whatever shape that is. The alternative — a fixed card shape, centred — leaves
 * the grid smaller than the space on three of the six count-and-orientation combinations, and a
 * six-card board on a phone ends up with cards a third the size of the room available to them.
 *
 * The grid is centred in the area, so a board with fewer cards sits in the middle of the screen
 * rather than hugging the top-left corner it was laid out from.
 */
export const memoryGrid = (
  cards: number,
): {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  at: (index: number) => { left: number; top: number };
} => {
  const cols = memoryCols[cards] ?? Math.ceil(Math.sqrt(cards));
  const rows = Math.ceil(cards / cols);

  const cardWidth = (MEMORY_AREA.width - memoryGap * (cols - 1)) / cols;
  const cardHeight = (MEMORY_AREA.height - memoryGap * (rows - 1)) / rows;

  return {
    cols,
    rows,
    cardWidth,
    cardHeight,
    at: (index: number) => ({
      left: MEMORY_AREA.left + (index % cols) * (cardWidth + memoryGap),
      top: MEMORY_AREA.top + Math.floor(index / cols) * (cardHeight + memoryGap),
    }),
  };
};

let cols = 1;
let rowPitch = 0;
let colGap = 0;
let snapRadius = 0;
let orientation: Orientation = "landscape";

/** Which layout is live. Used to key the stage so a flip remounts rather than half-updates. */
export const currentOrientation = (): Orientation => orientation;

/** Which layout a viewport calls for. A square counts as landscape, as it always did. */
export const orientationFor = (width: number, height: number): Orientation =>
  height > width ? "portrait" : "landscape";

export const applyLayout = (next: Orientation): void => {
  orientation = next;
  const spec = LAYOUTS[next];

  Object.assign(STAGE, spec.stage);
  Object.assign(BOARD, spec.board);
  Object.assign(BLOCK_HOME, spec.blockHome);
  Object.assign(CRITTER, spec.critter);

  Object.assign(MENU, {
    card: { ...spec.menu.card },
    cols: spec.menu.cols,
    titleSize: spec.menu.titleSize,
    scoreSize: spec.menu.scoreSize,
    stripHeight: spec.menu.stripHeight,
    stripCount: spec.menu.stripCount,
    wideWidth:
      spec.menu.card.width * spec.menu.cols +
      spec.menu.card.gap * (spec.menu.cols - 1),
    /* Below however many rows the four track cards take at this column count. */
    wideTop:
      spec.menu.card.top +
      (spec.menu.card.height + spec.menu.card.gap) *
        Math.ceil(4 / spec.menu.cols),
    extraWidth:
      (spec.menu.card.width * spec.menu.cols +
        spec.menu.card.gap * (spec.menu.cols - 1) -
        spec.menu.card.gap) /
      2,
  });

  Object.assign(HUD, spec.hud);
  Object.assign(MEMORY_AREA, spec.memory.area);
  memoryGap = spec.memory.gap;
  memoryCols = spec.memory.cols;

  cols = spec.cols;
  rowPitch = spec.rowPitch;

  colGap =
    cols > 1
      ? (BOARD.width - BOARD.padding * 2 - cols * HOLE_EXTENT) / (cols - 1)
      : 0;

  /*
   * How close the block has to get to count as dropped on a hole.
   *
   * Generous on purpose — a three-year-old's aim is bad and the game is not a test of fine
   * motor control. But strictly less than half the SMALLEST distance between two hole centres,
   * so "nearest hole" is never ambiguous: at exactly half, a drop equidistant between two holes
   * would resolve arbitrarily and the child would be told they were wrong about a shape they
   * were right about.
   *
   * On the 2x2 board the rows are a second way for two holes to be close together, so the row
   * pitch belongs in this minimum alongside the column spacing.
   */
  const spacings = [HOLE_EXTENT + colGap];
  if (SHAPES.length > cols) spacings.push(rowPitch);
  snapRadius = Math.min(150, Math.min(...spacings) * 0.46);
};

applyLayout("landscape");

export const holeCenterX = (index: number): number =>
  BOARD.left +
  BOARD.padding +
  HOLE_EXTENT / 2 +
  (index % cols) * (HOLE_EXTENT + colGap);

export const holeCenterY = (index: number): number =>
  BOARD.top + FIRST_ROW_DROP + Math.floor(index / cols) * rowPitch;

/** Baseline for a hole's printed word. Follows the hole onto its own row. */
export const holeLabelY = (index: number): number =>
  holeCenterY(index) + LABEL_DROP;

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
    const dy = y - holeCenterY(i);
    const distance = Math.hypot(dx, dy);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return bestDistance <= snapRadius ? best : null;
};
