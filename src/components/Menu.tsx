import { ANIMALS, type AnimalId } from "../animals";
import { zooArt } from "../critters/zoo";
import { HUES } from "../hues";
import type { Mode } from "../levels";
import { MENU, SHAPES, STAGE, extraSlotLeft } from "../stage";
import { maxStars, TOTAL_STARS, TRACKS, type Track } from "../tracks";
import type { Progress } from "../native";
import { colors, fonts } from "../theme";

import { placedPoints } from "./Board";
import { Star } from "./Hud";

/**
 * The picker: four games, one tap each. This is the home screen.
 *
 * It replaces resuming straight into the saved level, which is what the game used to do. That
 * behaviour is not gone, it moved: each card shows where its own track was left and starts
 * there, so a child who was on colour level 3 and a child who was on number level 2 both get
 * their place back — they just choose which one first.
 *
 * DESIGNED FOR TWO READERS AT ONCE, which is the whole difficulty of this screen:
 *
 *   the child   cannot read a word of it. So every card leads with a picture of what the game
 *               actually asks for — four coloured dots, the four outlines, "123", "ABC" — drawn
 *               with the same geometry the board uses, not with an icon that merely suggests it.
 *               The four cards are also large and far apart, because the tap comes from a hand
 *               with poor aim.
 *   the adult   is the one who chooses on the child's behalf, and needs to know what a track
 *               teaches and how far in they are. That is the blurb and the star count.
 *
 * The tracks are in acquisition order, top-left to bottom-right, and NOTHING IS LOCKED. A gate
 * would mean a four-year-old who is ready for letters has to be walked through colours first,
 * and the person who would have to do the walking is the one holding the tablet.
 */

/**
 * Two columns of two for the games, then a full-width banner for the animal game.
 *
 * 420*2 + 34 = 874 wide in a 1000 stage, so 63 either side. Three rows of 150 with 24 between
 * them runs 188..686, leaving 34 under the last — the same margin the two-row version had, which
 * is what made room for a fifth card without shrinking the stage's breathing space.
 *
 * The cards got shorter (232 -> 150) rather than narrower, because the text inside is a title, a
 * one-line blurb and a status line, and losing width would have wrapped all three.
 */
/*
 * The grid comes from stage.ts now, because it changes shape with the stage: two columns of
 * 420 across the landscape stage, one column of 480 down the portrait one. Two 420s do not fit
 * across 640, and narrowing them to fit wraps the title, the blurb AND the status line.
 */

/**
 * What each track looks like at a glance.
 *
 * Drawn from the same data the board draws from — `SHAPES` polygons through `placedPoints`, the
 * real `HUES` values — so a card cannot end up advertising a game the track does not contain.
 * The alternative was four hand-drawn icons, which is four more things to keep in step.
 *
 * EVERY COORDINATE IS A FRACTION OF `box`. They were absolute, tuned for the 120px icon the
 * two-row picker had room for; the moment the cards got shorter to fit a fifth, a 104px box drew
 * the same 120px artwork and the quadrants stopped being quadrants.
 */
const TrackIcon = ({ id, box = 104 }: { id: Mode; box?: number }) => {
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
 * The line under the blurb: how far in, and how many stars.
 *
 * "Start" rather than "Level 1 of 3" for an untouched track, because those say the same thing
 * and only one of them reads as an invitation. A finished track says so outright — otherwise it
 * would sit at "Level 3 of 3" forever, which looks like unfinished business.
 */
const TrackStatus = ({
  track,
  entry,
}: {
  track: Track;
  entry: { levelIndex: number; stars: number } | undefined;
}) => {
  const total = maxStars(track);
  const stars = entry?.stars ?? 0;
  const level = (entry?.levelIndex ?? 0) + 1;
  const played = level > 1 || stars > 0;
  const complete = stars >= total;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 21,
        color: colors.text,
      }}
    >
      <Star filled={played} size={23} />
      <span>
        {stars} / {total}
      </span>
      <span style={{ opacity: 0.5 }}>
        {complete
          ? "All done"
          : played
            ? `Level ${level} of ${track.levels.length}`
            : "Start"}
      </span>
    </div>
  );
};

/**
 * A row of animal heads for the park's card.
 *
 * The real artwork at a small size, not a drawing of it, for the same reason the four game icons
 * are the real polygons and hues: a card that advertises something the screen does not contain
 * is a card that will eventually be wrong. Four of the twelve, and the four a child names first.
 */
const AnimalStrip = ({ height = MENU.stripHeight }: { height?: number }) => {
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
            height={height}
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
 * A two-card icon for the memory game, in the same flat-ink style as the track icons.
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
 * A two-card icon for the boxes game, in the same flat-ink style as the rest.
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
 * One of the three cards on the bottom row: the park, the memory board, and the boxes game.
 *
 * NONE OF THEM IS A TRACK, and the card says so by being shaped differently from the four above
 * — icon over title rather than beside it, centred rather than left-aligned, and no star count
 * because there is nothing to score. A card identical to the tracks would promise that it
 * behaves like one: levels, stars, somewhere to get to.
 *
 * Stacked rather than side-by-side internally, because this card is a third of the row and at
 * 147 units — which is what it comes to in portrait — a title beside an icon leaves too little
 * for either. Its type sizes come from the layout for the same reason; see `extraTitleSize`.
 */
const ExtraCard = ({
  icon,
  title,
  blurb,
  slot,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  /** Which of the three places in the bottom row, left to right. */
  slot: number;
  onPress: () => void;
}) => (
  <button
    type="button"
    className="menu-card menu-card-extra"
    style={{
      left: extraSlotLeft(slot),
      top: MENU.wideTop,
      width: MENU.extraWidth,
      height: MENU.card.height,
    }}
    onClick={onPress}
  >
    {icon}

    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: MENU.extraTitleSize,
        lineHeight: 1,
        color: colors.ink,
      }}
    >
      {title}
    </div>

    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: MENU.extraBlurbSize,
        lineHeight: 1.1,
        color: colors.text,
        opacity: 0.6,
      }}
    >
      {blurb}
    </div>
  </button>
);

export const Menu = ({
  progress,
  onPick,
  /** The animal game is not a track, so it gets its own way in. See animals.ts. */
  onAnimals,
  /** Nor is the memory board. See memory.ts. */
  onMemory,
  /** Nor is the boxes game, which is not even for the same age. See boxes.ts. */
  onBoxes,
}: {
  progress: Progress;
  onPick: (id: Mode) => void;
  onAnimals: () => void;
  onMemory: () => void;
  onBoxes: () => void;
}) => {
  const banked = TRACKS.reduce(
    (sum, t) => sum + (progress[t.id]?.stars ?? 0),
    0,
  );

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

        {/* Total across all four tracks. The per-track counts are on the cards; this is the
            one number that answers "how are we doing overall". */}
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

      {TRACKS.map((track, i) => (
        <button
          key={track.id}
          type="button"
          className="menu-card"
          // Positioned rather than laid out in a grid, because everything else on the stage is
          // positioned in the same logical units and a flex container here would be the one
          // place whose geometry does not come from the same numbers.
          style={{
            left:
              MENU.card.left + (i % MENU.cols) * (MENU.card.width + MENU.card.gap),
            top:
              MENU.card.top +
              Math.floor(i / MENU.cols) * (MENU.card.height + MENU.card.gap),
            width: MENU.card.width,
            height: MENU.card.height,
          }}
          onClick={() => onPick(track.id)}
        >
          <TrackIcon id={track.id} />

          <div className="menu-card-text">
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 38,
                lineHeight: 1,
                color: colors.ink,
              }}
            >
              {track.title}
            </div>

            <div
              style={{
                fontFamily: fonts.sans,
                fontWeight: 500,
                fontSize: 20,
                lineHeight: 1.15,
                color: colors.text,
                opacity: 0.75,
              }}
            >
              {track.blurb}
            </div>

            <TrackStatus track={track} entry={progress[track.id]} />
          </div>
        </button>
      ))}

      {/*
        The bottom row: the three things that are not tracks. See ExtraCard.

        Boxes goes last, and not only because it is newest. It is the one thing here that is NOT
        for a two-year-old — it has an opponent and it can be lost — so it sits at the far end of
        the row, furthest from the colour track a child of that age would be reaching for.
      */}
      <ExtraCard
        slot={0}
        icon={<AnimalStrip />}
        title="Animals"
        blurb={`${ANIMALS.length} animals to meet`}
        onPress={onAnimals}
      />

      <ExtraCard
        slot={1}
        icon={<MemoryIcon height={MENU.stripHeight} />}
        title="Memory"
        blurb="Find the pairs"
        onPress={onMemory}
      />

      {/*
        BOXES IS ITS OWN CATEGORY, and this heading is the whole of what makes that true on
        screen. "Play and Learn" is four learning tracks, and the park and the memory board are
        still the app doing its job — naming animals, remembering where things are. Boxes is the
        only thing here that teaches nothing and the only thing that can be lost, so it is
        labelled rather than left to look like a fifth thing to learn from.

        THE HEADING SPANS EXACTLY THE CARD UNDER IT, from the same `extraSlotLeft`, which is
        what scopes it to this one card rather than to the row. A full-width heading would read
        as a label on Animals and Memory too, and they are not in this category.

        It sits in the band `extraGap` opens up above the bottom row. That band is why the track
        grid now starts higher; see the note on `extraGap`. A fourth card row — the obvious way
        to separate this — does not fit on either stage.
      */}
      <div
        className="menu-category"
        style={{
          left: extraSlotLeft(2),
          top: MENU.wideTop - MENU.extraGap,
          width: MENU.extraWidth,
          height: MENU.extraGap,
          fontSize: MENU.categorySize,
        }}
      >
        Fun game for kids
      </div>

      <ExtraCard
        slot={2}
        icon={<BoxesIcon height={MENU.stripHeight} />}
        title="Boxes"
        blurb="Close a box, go again"
        onPress={onBoxes}
      />
    </div>
  );
};
