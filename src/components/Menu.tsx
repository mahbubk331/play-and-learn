import { HUES } from "../hues";
import type { Mode } from "../levels";
import { SHAPES, STAGE } from "../stage";
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
 * Two columns of two, centred: 420*2 + 34 = 874 wide in a 1000 stage, so 63 either side.
 * Bottom row ends at 454 + 232 = 686, leaving the same 34 under it as between the rows.
 */
const CARD = {
  width: 420,
  height: 232,
  gap: 34,
  left: 63,
  top: 188,
};

/**
 * What each track looks like at a glance, in a 120x120 box.
 *
 * Drawn from the same data the board draws from — `SHAPES` polygons through `placedPoints`, the
 * real `HUES` values — so a card cannot end up advertising a game the track does not contain.
 * The alternative was four hand-drawn icons, which is four more things to keep in step.
 */
const TrackIcon = ({ id }: { id: Mode }) => {
  const box = 120;

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
            cx={i % 2 === 0 ? 36 : 84}
            cy={i < 2 ? 36 : 84}
            r={25}
            fill={hue.fill}
            stroke={hue.deep}
            strokeWidth={5}
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
              i % 2 === 0 ? 36 : 84,
              i < 2 ? 36 : 84,
              1,
              52,
            )}
            fill={colors.block}
            stroke={colors.ink}
            strokeWidth={5}
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
          fontSize: 54,
          fill: colors.block,
          stroke: colors.ink,
          strokeWidth: 9,
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
        fontSize: 24,
        color: colors.text,
      }}
    >
      <Star filled={played} size={26} />
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

export const Menu = ({
  progress,
  onPick,
}: {
  progress: Progress;
  onPick: (id: Mode) => void;
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
            fontSize: 68,
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
            fontSize: 40,
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
            left: CARD.left + (i % 2) * (CARD.width + CARD.gap),
            top: CARD.top + (i < 2 ? 0 : 1) * (CARD.height + CARD.gap),
            width: CARD.width,
            height: CARD.height,
          }}
          onClick={() => onPick(track.id)}
        >
          <TrackIcon id={track.id} />

          <div className="menu-card-text">
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 46,
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
                fontSize: 23,
                lineHeight: 1.2,
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
    </div>
  );
};
