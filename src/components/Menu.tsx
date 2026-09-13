import { ANIMALS, type AnimalId } from "../animals";
import { zooArt } from "../critters/zoo";
import { HUES } from "../hues";
import type { GameId, Mode } from "../levels";
import { MENU, MENU_SLOTS, SHAPES, STAGE, menuSlot } from "../stage";
import { BUBBLES, TOTAL_STARS, TRACKS, maxStars } from "../tracks";
import type { Progress, TrackProgress } from "../native";
import { colors, fonts } from "../theme";

import { placedPoints } from "./Board";
import { Star } from "./Hud";

/**
 * The picker: eight games, one tap each. This is the home screen.
 *
 * It replaces resuming straight into the saved level, which is what the game used to do. That
 * behaviour is not gone, it moved: each card shows where its own game was left and starts there,
 * so a child who was on colour level 3 and a child who was on number level 2 both get their
 * place back — they just choose which one first.
 *
 * DESIGNED FOR TWO READERS AT ONCE, which is the whole difficulty of this screen:
 *
 *   the child   cannot read a word of it. So every card leads with a picture of what the game
 *               actually asks for — four coloured dots, the four outlines, "123", "ABC" — drawn
 *               with the same geometry the board uses, not with an icon that merely suggests it.
 *   the adult   is the one who chooses on the child's behalf, and needs to know what a game
 *               teaches and how far in they are. That is the blurb and the star count.
 *
 * ONE CARD SHAPE FOR ALL EIGHT. The four learning games used to have a wide card — icon beside
 * the text — and the others a narrow centred one, and that difference is what filled the stage:
 * two columns of 420 units is a lot of width to show four things, and it left no room for a
 * fifth game. Every card is now the narrow shape, four across the landscape stage and two across
 * the portrait one, so eight cards take the room six used to. See `iconSize` in stage.ts.
 *
 * NOTHING IS LOCKED. A gate would mean a four-year-old who is ready for letters has to be walked
 * through colours first, and the person who would have to do the walking is the one holding the
 * tablet. The order is the recommendation: the four kinds in acquisition order, then the games
 * that are not a ladder at all.
 */

/**
 * What each learning game looks like at a glance.
 *
 * Drawn from the same data the board draws from — `SHAPES` polygons through `placedPoints`, the
 * real `HUES` values — so a card cannot end up advertising a game the track does not contain.
 * The alternative was four hand-drawn icons, which is four more things to keep in step.
 *
 * EVERY COORDINATE IS A FRACTION OF `box`, because the box shrank twice: once when the cards got
 * shorter to fit a fifth, and again when they got narrower to fit eight. Absolute coordinates
 * tuned for one size draw the wrong picture at the next, and the quadrants stop being quadrants.
 */
const TrackIcon = ({ id, box }: { id: Mode; box: number }) => {
  /** Quadrant centres, for the two icons made of four things. */
  const near = box * 0.3;
  const far = box * 0.7;
  const stroke = Math.max(4, box * 0.042);

  if (id === "color") {
    // Red, yellow, blue, green: four of the seven, and the four a child meets first.
    const picks = ["red", "yellow", "blue", "green"].map(
      (name) => HUES.find((h) => h.id === name) ?? HUES[0],
    );
    return (
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        {picks.map((hue, i) => (
          <circle
            key={hue.id}
            cx={i % 2 === 0 ? near : far}
            cy={i < 2 ? near : far}
            r={box * 0.208}
            fill={hue.fill}
            stroke={hue.deep}
            strokeWidth={stroke}
          />
        ))}
      </svg>
    );
  }

  if (id === "shape") {
    return (
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        {SHAPES.map((shape, i) => (
          <polygon
            key={shape.id}
            points={placedPoints(
              shape.points,
              i % 2 === 0 ? near : far,
              i < 2 ? near : far,
              1,
              box * 0.433,
            )}
            fill={colors.block}
            stroke={colors.ink}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  }

  // Numbers and letters are text in both the icon and the game, so the icon is the real thing
  // at a smaller size rather than a drawing of it.
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
      <text
        x={box / 2}
        y={box / 2}
        textAnchor="middle"
        dominantBaseline="central"
        paintOrder="stroke fill"
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: box * 0.45,
          fill: colors.block,
          stroke: colors.ink,
          strokeWidth: box * 0.075,
          strokeLinejoin: "round",
        }}
      >
        {id === "number" ? "123" : "ABC"}
      </text>
    </svg>
  );
};

/**
 * A cluster of bubbles for the bubble game's card.
 *
 * Three of them, each holding a colour, because the game's first level is colours and a single
 * bubble says nothing about there being a choice to make. The gloss highlight is the thing that
 * makes a filled circle read as a bubble rather than as one of the colour game's balls — it is
 * the same trick the draggable block uses, and it is why this icon can share a picker row with
 * the colour card without the two being confused.
 */
const BubbleIcon = ({ box }: { box: number }) => {
  const hue = (id: string) => HUES.find((h) => h.id === id) ?? HUES[0];
  const bubbles = [
    { at: [0.33, 0.38], r: 0.23, hue: hue("red") },
    { at: [0.72, 0.29], r: 0.17, hue: hue("blue") },
    { at: [0.58, 0.74], r: 0.19, hue: hue("yellow") },
  ];

  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
      {bubbles.map((b) => (
        <g key={b.hue.id}>
          <circle
            cx={b.at[0] * box}
            cy={b.at[1] * box}
            r={b.r * box}
            fill={b.hue.fill}
            stroke={colors.ink}
            strokeWidth={Math.max(4, box * 0.055)}
          />
          <ellipse
            cx={(b.at[0] - b.r * 0.34) * box}
            cy={(b.at[1] - b.r * 0.38) * box}
            rx={b.r * 0.3 * box}
            ry={b.r * 0.2 * box}
            fill="rgba(255,255,255,0.62)"
          />
        </g>
      ))}
    </svg>
  );
};

/**
 * The line under the blurb: how far in, and how many stars.
 *
 * "Start" rather than "Level 1 of 3" for an untouched game, because those say the same thing and
 * only one of them reads as an invitation. A finished game says so outright — otherwise it would
 * sit at "Level 3 of 3" forever, which looks like unfinished business.
 *
 * Takes a star TOTAL rather than a Track, so the bubble game — which is not a track — gets the
 * same line from the same component rather than a near-copy that could drift.
 *
 * "Level 3" rather than the "Level 3 of 7" this used to say. The card is 199 units wide now
 * instead of 420, and "of 7" is the least informative thing on the line: the star count beside
 * it already says how much is left, out of a total that is three times the level count.
 */
const StatusLine = ({
  total,
  entry,
}: {
  total: number;
  entry: TrackProgress | undefined;
}) => {
  const stars = entry?.stars ?? 0;
  const level = (entry?.levelIndex ?? 0) + 1;
  const played = level > 1 || stars > 0;
  const complete = stars >= total;

  return (
    <div
      className="menu-card-status"
      style={{ fontSize: MENU.statusSize, fontFamily: fonts.sans }}
    >
      <Star filled={played} size={MENU.statusSize + 2} />
      <span>
        {stars} / {total}
      </span>
      <span style={{ opacity: 0.5 }}>
        {complete ? "Done" : played ? `Level ${level}` : "Start"}
      </span>
    </div>
  );
};

/**
 * A row of animal heads for the park's card.
 *
 * The real artwork at a small size, not a drawing of it, for the same reason the four game icons
 * are the real polygons and hues: a card that advertises something the screen does not contain
 * is a card that will eventually be wrong.
 */
const AnimalStrip = () => {
  const ids: AnimalId[] = (["lion", "cow", "duck", "dog"] as AnimalId[]).slice(
    0,
    MENU.stripCount,
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
      {ids.map((id) => {
        const Art = zooArt(id);
        return (
          <svg
            key={id}
            viewBox="0 0 200 170"
            height={MENU.stripHeight}
            style={{ display: "block", flex: "none" }}
          >
            <Art />
          </svg>
        );
      })}
    </div>
  );
};

/**
 * A two-card icon for the memory game, in the same flat-ink style as the rest.
 *
 * One card face down and one turned over, overlapping, because that is the entire mechanic and
 * a single card says nothing about it.
 */
const MemoryIcon = ({ height }: { height: number }) => (
  <svg
    height={height}
    viewBox="0 0 132 100"
    style={{ display: "block", flex: "none" }}
    aria-hidden="true"
  >
    <g transform="rotate(-9 40 54)">
      <rect
        x="6"
        y="14"
        width="58"
        height="78"
        rx="12"
        fill={colors.spark}
        stroke={colors.ink}
        strokeWidth={7}
      />
      <polygon
        points="35,32 41,50 60,50 45,61 51,79 35,68 19,79 25,61 10,50 29,50"
        fill={colors.bg}
        stroke={colors.ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </g>

    <g transform="rotate(8 94 54)">
      <rect
        x="66"
        y="10"
        width="58"
        height="78"
        rx="12"
        fill={colors.textOnDark}
        stroke={colors.ink}
        strokeWidth={7}
      />
      <circle cx="95" cy="42" r="15" fill={colors.block} stroke={colors.ink} strokeWidth={5} />
      <rect
        x="80"
        y="60"
        width="30"
        height="16"
        rx="8"
        fill={colors.block}
        stroke={colors.ink}
        strokeWidth={5}
      />
    </g>
  </svg>
);

/**
 * A two-card icon for the boxes game, in the same flat-ink style as the track icons.
 *
 * A 2x2 dot grid mid-game: three lines down, one box closed. The closed box is the whole point
 * of the game and a grid of bare dots would advertise nothing, so the icon is a POSITION rather
 * than a picture of equipment — the same choice the four track icons make by being drawn from
 * the real polygons and hues.
 */
const BoxesIcon = ({ height }: { height: number }) => (
  <svg
    height={height}
    viewBox="0 0 100 100"
    style={{ display: "block", flex: "none" }}
    aria-hidden="true"
  >
    {/* The closed box, top left. Blue, which is player one everywhere in that game. */}
    <rect x="14" y="14" width="36" height="36" fill="#3D8BF5" />

    {/* Its four sides, plus one more line hanging off the grid so the board looks mid-game. */}
    {[
      [14, 14, 50, 14],
      [14, 50, 50, 50],
      [14, 14, 14, 50],
      [50, 14, 50, 50],
    ].map(([x1, y1, x2, y2]) => (
      <line
        key={`${x1}-${y1}-${x2}-${y2}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#1B5AB8"
        strokeWidth={9}
        strokeLinecap="round"
      />
    ))}
    <line
      x1="50"
      y1="86"
      x2="86"
      y2="86"
      stroke="#B85F13"
      strokeWidth={9}
      strokeLinecap="round"
    />

    {[14, 50, 86].map((cy) =>
      [14, 50, 86].map((cx) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={7} fill={colors.ink} />
      )),
    )}
  </svg>
);

/**
 * One picker card. All eight are this.
 *
 * A <button>, not a div with a handler. That is what gets keyboard focus, Enter and Space, and
 * a name in the accessibility tree for free — and the adult setting the game up is the one who
 * may be using any of those.
 *
 * Positioned from `menuSlot` rather than laid out in a grid container, because everything else
 * on the stage is positioned in the same logical units and a flex container here would be the
 * one place whose geometry does not come from the same numbers.
 */
const Card = ({
  slot,
  icon,
  title,
  blurb,
  status,
  onPress,
}: {
  slot: number;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  /** The star line, on the five cards that have progress. Omitted on the other three. */
  status?: React.ReactNode;
  onPress: () => void;
}) => (
  <button
    type="button"
    className="menu-card"
    style={{
      ...menuSlot(slot),
      width: MENU.card.width,
      height: MENU.card.height,
    }}
    onClick={onPress}
  >
    {icon}

    <div
      className="menu-card-title"
      style={{ fontFamily: fonts.display, fontSize: MENU.cardTitleSize }}
    >
      {title}
    </div>

    <div
      className="menu-card-blurb"
      style={{ fontFamily: fonts.sans, fontSize: MENU.cardBlurbSize }}
    >
      {blurb}
    </div>

    {status}
  </button>
);

export const Menu = ({
  progress,
  onPick,
  /** The bubble game plays all four kinds, so it is not a track. See BUBBLES in tracks.ts. */
  onBubbles,
  /** The animal game is not a track, so it gets its own way in. See animals.ts. */
  onAnimals,
  /** Nor is the memory board. See memory.ts. */
  onMemory,
  /** Nor is the boxes game, which is not even for the same age. See boxes.ts. */
  onBoxes,
}: {
  progress: Progress;
  onPick: (id: Mode) => void;
  onBubbles: () => void;
  onAnimals: () => void;
  onMemory: () => void;
  onBoxes: () => void;
}) => {
  const banked = ([...TRACKS, BUBBLES] as { id: GameId }[]).reduce(
    (sum, g) => sum + (progress[g.id]?.stars ?? 0),
    0,
  );

  /*
   * The eight cards, in slot order: the four kinds in acquisition order, then bubbles — which
   * plays all four — then the three that are not ladders at all.
   *
   * Built as one array so the count can be asserted against MENU_SLOTS, which is what the grid
   * geometry in stage.ts is sized from. Adding a ninth card without widening the grid would
   * otherwise silently draw it off the bottom of the stage.
   */
  const cards: React.ReactNode[] = [
    ...TRACKS.map((track) => (
      <Card
        key={track.id}
        slot={TRACKS.indexOf(track)}
        icon={<TrackIcon id={track.id} box={MENU.iconSize} />}
        title={track.title}
        blurb={track.blurb}
        status={
          <StatusLine total={maxStars(track)} entry={progress[track.id]} />
        }
        onPress={() => onPick(track.id)}
      />
    )),

    <Card
      key="bubbles"
      slot={4}
      icon={<BubbleIcon box={MENU.iconSize} />}
      title={BUBBLES.title}
      blurb={BUBBLES.blurb}
      status={
        <StatusLine total={maxStars(BUBBLES)} entry={progress.bubbles} />
      }
      onPress={onBubbles}
    />,

    <Card
      key="animals"
      slot={5}
      icon={<AnimalStrip />}
      title="Animals"
      blurb={`${ANIMALS.length} animals to meet`}
      onPress={onAnimals}
    />,

    <Card
      key="memory"
      slot={6}
      icon={<MemoryIcon height={MENU.stripHeight} />}
      title="Memory"
      blurb="Find the pairs"
      onPress={onMemory}
    />,

    <Card
      key="boxes"
      slot={7}
      icon={<BoxesIcon height={MENU.stripHeight} />}
      title="Boxes"
      blurb="Close a box, go again"
      onPress={onBoxes}
    />,
  ];

  if (cards.length !== MENU_SLOTS) {
    throw new Error(
      `Picker has ${cards.length} cards but the grid is sized for ${MENU_SLOTS}`,
    );
  }

  return (
    <div className="menu" style={{ width: STAGE.width, height: STAGE.height }}>
      <div className="menu-head">
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: MENU.titleSize,
            lineHeight: 1,
            color: colors.spark,
            WebkitTextStroke: `9px ${colors.ink}`,
            paintOrder: "stroke fill",
          }}
        >
          Play and Learn
        </div>

        {/* Total across everything that scores. The per-game counts are on the cards; this is
            the one number that answers "how are we doing overall". */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: MENU.scoreSize,
            color: colors.ink,
          }}
        >
          <Star filled size={38} />
          {banked} / {TOTAL_STARS}
        </div>
      </div>

      {cards}

      {/*
        BOXES IS ITS OWN CATEGORY, and this heading is the whole of what makes that true on
        screen. "Play and Learn" is five learning games, and the park and the memory board are
        still the app doing its job — naming animals, remembering where things are. Boxes is the
        only thing here that teaches nothing and the only thing that can be lost, so it is
        labelled rather than left to look like a sixth thing to learn from.

        THE HEADING SPANS EXACTLY THE CARD UNDER IT, from the same `menuSlot`, which is what
        scopes it to one card rather than to the row. A full-width heading would read as a label
        on Memory and Animals too, and they are not in this category.

        It sits in the band `extraGap` opens above the last row — slot 7 is the last column of
        the last row on both stages, so this lands on Boxes whichever way the tablet is held.
      */}
      <div
        className="menu-category"
        style={{
          left: menuSlot(MENU_SLOTS - 1).left,
          top: menuSlot(MENU_SLOTS - 1).top - MENU.extraGap,
          width: MENU.card.width,
          height: MENU.extraGap,
          fontSize: MENU.categorySize,
        }}
      >
        Fun game for kids
      </div>
    </div>
  );
};
