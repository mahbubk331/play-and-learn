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
    /** Cards per row on the picker. `MENU_SLOTS / cols` gives the rows. */
    cols: number;
    titleSize: number;
    scoreSize: number;
    /**
     * ONE CARD SHAPE FOR ALL EIGHT, which is the whole of why the picker can hold eight.
     *
     * The four track cards used to be 420x150 with the icon BESIDE a title, blurb and star line,
     * and the three others 272x150 with the icon OVER a shorter stack. Two shapes meant two
     * budgets, and the wide one was what filled the stage: two columns of 420 is 864 units of
     * width to show four things, and it left no row free for a fifth game.
     *
     * Every card is now the narrow, centred, icon-over-text shape. Four fit across the landscape
     * stage where two did, and two across the portrait stage where one did — so eight cards take
     * the room six used to, with a row spare.
     */
    iconSize: number;
    /** The animal strip on the park's card: how tall each head, and how many. */
    stripHeight: number;
    stripCount: number;
    cardTitleSize: number;
    cardBlurbSize: number;
    /** The star-and-progress line, on the five cards that have progress to report. */
    statusSize: number;
    /**
     * Type size for a category heading over one card.
     *
     * See `extraGap` for the band it sits in, and `menuSlot` for placing it over a card.
     */
    categorySize: number;
    /**
     * The band above the LAST row, wider than `card.gap`.
     *
     * That difference is the entire room the category heading has to live in — a heading does
     * not go in the 20 units an ordinary gap gives. It sits above the last row because that is
     * the row Boxes is in, on both stages: slot 7 of 8 is the last column of the last row
     * whether the grid is 4x2 or 2x4.
     */
    extraGap: number;
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
  boxes: {
    /**
     * The rectangle the dot grid is fitted into. The grid is SQUARE and centred in it.
     *
     * Square because the four board sizes are square (see SIZES in boxes.ts), so one of the two
     * dimensions is always slack — 420 units of it on the landscape stage. That slack is where
     * the score cards go rather than something to stretch the board into: a 4x4 board drawn as
     * an oblong is still a 4x4 board, it just stops looking like the thing you draw on paper.
     */
    area: { left: number; top: number; width: number; height: number };
    /**
     * The two score cards, which sit under the board.
     *
     * No `top` here: it follows the bottom edge of the board, and how far down that is depends
     * on which of the four sizes is in play. components/Boxes.tsx works it out from `boxesGrid`.
     */
    score: { left: number; width: number; height: number; gap: number };
  };
  bubbles: {
    /** The rectangle the bubbles are scattered inside. See `bubbleSpots`. */
    area: { left: number; top: number; width: number; height: number };
    /**
     * Where the bubbles sit, as fractions of that area, by how many there are.
     *
     * A TABLE OF POSITIONS RATHER THAN RANDOM PLACEMENT, because random placement of circles
     * that must not touch needs rejection sampling, and rejection sampling in a rectangle this
     * tight either clumps them along the edges or occasionally fails to place the last one. A
     * scatter drawn on purpose also just looks better: these are deliberately off-grid, because
     * five bubbles in a neat row read as a row of buttons.
     *
     * PER LAYOUT, and the five-bubble case is why — the same reason memory.cols is per layout.
     * One shared table gave the wide stage a radius of 64 against the narrow stage's 88 and the
     * four-bubble level's 96, so the shape level had visibly bigger bubbles than the three
     * levels around it. The wide stage is 860x460 and wants its five spread across; the tall one
     * is 550x780 and has to stack them 2-1-2, because three abreast in 550 units leaves 176
     * between centres and a bubble is 192 across.
     *
     * The four-bubble table happens to work on both and is repeated rather than shared, so each
     * layout can be read and tuned without cross-referencing the other.
     */
    spots: Record<number, [number, number][]>;
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
      /*
       * 4x2. Four 199s and three 22s span 862 of the 864 the two-column grid used to, so the
       * picker still sits in the same margins — it just holds eight cards instead of six.
       *
       * 216 tall is set by the tallest card's contents at this width: 24 of padding, a 76 icon,
       * three gaps, a 26 title, up to three wrapped lines of 15px blurb, and the 18px star line.
       * The colour card is the one that needs all three blurb lines.
       */
      card: { width: 199, height: 216, gap: 22, left: 64, top: 150 },
      cols: 4,
      titleSize: 68,
      scoreSize: 40,
      iconSize: 76,
      /*
       * Three heads at 46. The card leaves 175 units inside its padding and a head is 1.18x as
       * wide as it is tall, so three at 46 come to 166 — the widest that still clears.
       */
      stripHeight: 46,
      stripCount: 3,
      cardTitleSize: 26,
      cardBlurbSize: 15,
      statusSize: 18,
      categorySize: 20,
      extraGap: 44,
    },
    memory: {
      area: { left: 60, top: 132, width: 880, height: 542 },
      gap: 22,
      cols: { 6: 3, 8: 4, 12: 4 },
    },
    /*
     * 424 square: 146 above it, 424 of board, half a dot of overhang, 22 of gap, 90 of score
     * card, and 26 spare at the bottom on the tightest of the four sizes.
     *
     * THE 146 IS THE TIGHT NUMBER ON THIS STAGE, and it is not slack. The turn banner lives in
     * the head and is as wide as the longest name it has to hold, so it reaches across to about
     * 373 — past 277, where a 430-wide board centred in this area starts. Nothing keeps the two
     * apart except the clearance under the banner, and the banner's own bottom edge is at 100,
     * not at the 92 the menu button would suggest. The board's artwork starts half a dot ABOVE
     * this number too, which is the other half of what went wrong at 116.
     */
    boxes: {
      area: { left: 60, top: 146, width: 880, height: 424 },
      score: { left: 90, width: 400, height: 90, gap: 22 },
    },
    /* Below the head and the printed prompt, which together take the top 200. */
    bubbles: {
      area: { left: 70, top: 210, width: 860, height: 460 },
      /* Spread across the width, which is what this stage has. Both tables keep every spot at
         least 96 units from an edge, because that is the bubble radius the cap allows and the
         edge distance is what binds first on a 460-tall area. */
      spots: {
        4: [
          [0.22, 0.26],
          [0.74, 0.22],
          [0.26, 0.76],
          [0.78, 0.72],
        ],
        5: [
          [0.18, 0.3],
          [0.5, 0.22],
          [0.82, 0.32],
          [0.28, 0.76],
          [0.72, 0.78],
        ],
      },
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
       * 2x4. Two 230s and a 20 span the same 480 the single column did, and the narrow card
       * shape is what makes two of them fit where one used to.
       *
       * 205 tall rather than the landscape 216: at 230 wide the blurbs wrap to two lines instead
       * of three, so the card needs one line less.
       */
      card: { width: 230, height: 205, gap: 20, left: 80, top: 130 },
      cols: 2,
      titleSize: 46,
      scoreSize: 32,
      iconSize: 72,
      stripHeight: 50,
      stripCount: 3,
      cardTitleSize: 25,
      cardBlurbSize: 14,
      statusSize: 17,
      categorySize: 15,
      extraGap: 44,
    },
    memory: {
      area: { left: 50, top: 210, width: 540, height: 856 },
      gap: 20,
      cols: { 6: 2, 8: 2, 12: 3 },
    },
    /*
     * 560 square, bound by the width rather than the height. The area is 700 tall and the board
     * is centred in it, which is what keeps the board off the top of the stage on the Tiny size
     * — whose pitch is capped, so its board is only 320 of the 560 available.
     */
    boxes: {
      area: { left: 40, top: 190, width: 560, height: 700 },
      score: { left: 40, width: 260, height: 120, gap: 22 },
    },
    bubbles: {
      area: { left: 45, top: 250, width: 550, height: 780 },
      /* Stacked 2-1-2 down the height, because the width cannot take three abreast at full
         bubble size. The middle bubble is centred, which is also the easiest one to reach. */
      spots: {
        4: [
          [0.22, 0.26],
          [0.74, 0.22],
          [0.26, 0.76],
          [0.78, 0.72],
        ],
        5: [
          [0.24, 0.14],
          [0.76, 0.16],
          [0.5, 0.42],
          [0.24, 0.72],
          [0.76, 0.74],
        ],
      },
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
  rows: 1,
  titleSize: 0,
  scoreSize: 0,
  iconSize: 0,
  stripHeight: 0,
  stripCount: 0,
  cardTitleSize: 0,
  cardBlurbSize: 0,
  statusSize: 0,
  categorySize: 0,
  extraGap: 0,
};

/**
 * How many cards the picker holds: four learning games, then bubbles, the park, the memory board
 * and boxes.
 *
 * A CONSTANT AND NOT `TRACKS.length + 3`, because the grid geometry is decided from it in
 * stage.ts and stage.ts must not import the game lists — tracks.ts already imports from here.
 * Menu.tsx asserts the slot list it renders is this long, so the two cannot drift apart
 * silently.
 */
export const MENU_SLOTS = 8;

/**
 * Where one picker card goes, by slot, left to right then top to bottom.
 *
 * Here rather than in Menu.tsx because three things need it and have to agree exactly: the card,
 * the category heading sitting directly over one, and the grid's own height. Working it out
 * twice is how a heading ends up four units off the card it labels.
 *
 * The LAST ROW is pushed down by `extraGap` instead of an ordinary gap, which is the band the
 * category heading lives in. Slot 7 is the last column of the last row on both stages — 4x2 and
 * 2x4 both put it there — so Boxes is under that band whichever way the tablet is held.
 */
export const menuSlot = (slot: number): { left: number; top: number } => {
  const row = Math.floor(slot / MENU.cols);
  const col = slot % MENU.cols;
  const band = row === MENU.rows - 1 ? MENU.extraGap - MENU.card.gap : 0;

  return {
    left: MENU.card.left + col * (MENU.card.width + MENU.card.gap),
    top: MENU.card.top + row * (MENU.card.height + MENU.card.gap) + band,
  };
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

const BOXES_AREA = { left: 0, top: 0, width: 0, height: 0 };

/** Where the boxes game's two score cards go, and how big. See the note in the layout spec. */
export const BOXES_SCORE = { left: 0, width: 0, height: 0, gap: 0 };

/**
 * The dot pitch for a board this many boxes across, capped.
 *
 * WITHOUT THE CAP the Tiny board is drawn at the same overall size as the Huge one, which means
 * four boxes 230 units across with lines 23 units thick. It does not read as a small board, it
 * reads as a zoomed-in one — and on the landscape stage it also pushes the dots hard against
 * the top and bottom of the area. 160 keeps Tiny at 320 square and leaves Small, Big and Huge
 * bound by the area, which is where they should be.
 */
const MAX_PITCH = 160;

/**
 * Where the dot grid goes and how far apart the dots are.
 *
 * Returns the rectangle spanned by the DOTS, not by the board's artwork: the outermost dots sit
 * exactly on its edge, and both the dot radius and half a line's thickness overhang it. That is
 * why the areas above are inset from the stage rather than flush with it.
 */
export const boxesGrid = (
  cols: number,
  rows: number,
): {
  pitch: number;
  left: number;
  top: number;
  width: number;
  height: number;
} => {
  const pitch = Math.min(
    MAX_PITCH,
    BOXES_AREA.width / cols,
    BOXES_AREA.height / rows,
  );
  const width = pitch * cols;
  const height = pitch * rows;

  return {
    pitch,
    width,
    height,
    left: BOXES_AREA.left + (BOXES_AREA.width - width) / 2,
    top: BOXES_AREA.top + (BOXES_AREA.height - height) / 2,
  };
};

const BUBBLE_AREA = { left: 0, top: 0, width: 0, height: 0 };

/**
 * The active layout's scatter. See `spots` in the layout spec for why it is per layout.
 *
 * Which TOKEN lands in which position is shuffled every round (see components/Bubbles.tsx); the
 * positions themselves are fixed, which is what keeps them from overlapping.
 */
let bubbleTable: Record<number, [number, number][]> = {};

/**
 * A cap on how big a bubble gets, in logical units.
 *
 * Without it the four-bubble level draws them at whatever its wider spacing allows, which is
 * over 130 — four balloons filling the screen, visibly a different game from the five-bubble
 * levels either side of it. The cap keeps bubble size roughly constant across the four levels
 * and lets the spacing change instead.
 */
const MAX_BUBBLE_R = 96;

/**
 * Where this round's bubbles go, and how big they are.
 *
 * THE RADIUS IS DERIVED, not authored, and that is what makes the table above safe to edit. It
 * is bounded by two things at once: 0.42 of the closest distance between any two positions, so
 * no two bubbles can touch however the table is rearranged; and the distance from the nearest
 * position to the edge of the area, so none can be drawn half outside it. Authoring the radius
 * separately is how a nudged position silently produces two overlapping tap targets.
 */
export const bubbleSpots = (
  count: number,
): { r: number; spots: { x: number; y: number }[] } => {
  const table = bubbleTable[count] ?? bubbleTable[4];
  const spots = table.map(([fx, fy]) => ({
    x: BUBBLE_AREA.left + fx * BUBBLE_AREA.width,
    y: BUBBLE_AREA.top + fy * BUBBLE_AREA.height,
  }));

  let closest = Infinity;
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      closest = Math.min(
        closest,
        Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y),
      );
    }
  }

  const toEdge = Math.min(
    ...spots.map((p) =>
      Math.min(
        p.x - BUBBLE_AREA.left,
        BUBBLE_AREA.left + BUBBLE_AREA.width - p.x,
        p.y - BUBBLE_AREA.top,
        BUBBLE_AREA.top + BUBBLE_AREA.height - p.y,
      ),
    ),
  );

  return { r: Math.min(closest * 0.42, toEdge, MAX_BUBBLE_R), spots };
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
    iconSize: spec.menu.iconSize,
    stripHeight: spec.menu.stripHeight,
    stripCount: spec.menu.stripCount,
    cardTitleSize: spec.menu.cardTitleSize,
    cardBlurbSize: spec.menu.cardBlurbSize,
    statusSize: spec.menu.statusSize,
    categorySize: spec.menu.categorySize,
    extraGap: spec.menu.extraGap,
    /* Derived rather than authored, so a column count can never disagree with a row count. */
    rows: Math.ceil(MENU_SLOTS / spec.menu.cols),
  });

  Object.assign(HUD, spec.hud);
  Object.assign(MEMORY_AREA, spec.memory.area);
  memoryGap = spec.memory.gap;
  memoryCols = spec.memory.cols;

  Object.assign(BOXES_AREA, spec.boxes.area);
  Object.assign(BOXES_SCORE, spec.boxes.score);
  Object.assign(BUBBLE_AREA, spec.bubbles.area);
  bubbleTable = spec.bubbles.spots;

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
