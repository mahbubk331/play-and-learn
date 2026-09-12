import { ANIMALS, type AnimalId } from "../animals";
import { zooArt } from "../critters/zoo";
import { HUES } from "../hues";
import type { Mode } from "../levels";
import { MENU, SHAPES, STAGE } from "../stage";
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
 * One of the two cards on the bottom row: the park, and the memory board.
 *
 * NEITHER IS A TRACK, and the card says so by being shaped differently from the four above —
 * icon over title rather than beside it, centred rather than left-aligned, and no star count
 * because there is nothing to score. A fifth and sixth card identical to the tracks would
 * promise that they behave like them: levels, stars, somewhere to get to.
 *
 * Stacked rather than side-by-side internally, because this card is half the width of the row
 * and at 230 units — which is what it comes to in portrait — a title beside an icon leaves too
 * little for either.
 */
const ExtraCard = ({
  icon,
  title,
  blurb,
  left,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  left: number;
  onPress: () => void;
}) => (
  <button
    type="button"
    className="menu-card menu-card-extra"
    style={{
      left,
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
        fontSize: 34,
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
        fontSize: 19,
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
}: {
  progress: Progress;
  onPick: (id: Mode) => void;
  onAnimals: () => void;
  onMemory: () => void;
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
        The bottom row: the two things that are not tracks. See ExtraCard.
      */}
      <ExtraCard
        left={MENU.card.left}
        icon={<AnimalStrip />}
        title="Animals"
        blurb={`${ANIMALS.length} animals to meet`}
        onPress={onAnimals}
      />

      <ExtraCard
        left={MENU.card.left + MENU.extraWidth + MENU.card.gap}
        icon={<MemoryIcon height={MENU.stripHeight} />}
        title="Memory"
        blurb="Find the pairs"
        onPress={onMemory}
      />

    </div>
  );
};
