import type React from "react";

import { Star } from "./Hud";
import { colors, fonts } from "../theme";
import { STAGE } from "../stage";

/**
 * The wrong-answer X.
 *
 * Big and red because that is unmistakable to a pre-literate child, and brief — it
 * animates in and out in under a second, then the block is back home and the same
 * question is still there to answer.
 *
 * Drawn over the hole that was actually chosen, not in the middle of the screen. Two
 * reasons, and the second one is why it moved: "not THAT hole" teaches more than a
 * general "no", and a centred X landed directly on top of the block springing back
 * home — so the one thing the child needed to see (their block is back, try again) was
 * hidden behind the thing telling them they were wrong.
 *
 * Three things it deliberately does NOT do: take away a point, block input, or end
 * anything. The correction has to be clear without being a consequence — at this age a
 * wrong answer that costs something stops the guessing, and guessing is the activity.
 */
export const WrongMark = ({
  x,
  y,
  nonce,
}: {
  x: number;
  y: number;
  nonce: number;
}) => (
  <svg
    // Remounting on every wrong answer restarts the CSS animation. Without a changing
    // key the second X in a row would not animate at all.
    key={nonce}
    className="wrong-mark"
    viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
    width={STAGE.width}
    height={STAGE.height}
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
  >
    <g transform={`translate(${x} ${y})`}>
      {[45, -45].map((angle) => (
        <rect
          key={angle}
          x={-115}
          y={-24}
          width={230}
          height={48}
          rx={24}
          transform={`rotate(${angle})`}
          fill={colors.wrong}
          stroke={colors.ink}
          strokeWidth={9}
        />
      ))}
    </g>
  </svg>
);

/** Burst on a correct drop. Fires on the drop frame, not when the sound ends. */
const SPARK_ANGLES = [-90, -50, -10, 30, 70, 110, 150, 190, 230, 270];

export const Sparkles = ({
  x,
  y,
  nonce,
}: {
  x: number;
  y: number;
  nonce: number;
}) => (
  <div
    key={nonce}
    className="sparkles"
    style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}
  >
    {SPARK_ANGLES.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const reach = 90 + (i % 3) * 34;
      const size = 26 - (i % 3) * 5;

      return (
        <span
          key={deg}
          style={
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: 6,
              background: i % 2 === 0 ? colors.spark : colors.textOnDark,
              border: `3px solid ${colors.ink}`,
              boxSizing: "border-box",
              // The travel direction is handed to CSS per element. The first version
              // set the final offset in `left`/`top` and animated only scale, so the
              // pieces sat still and read as scattered debris rather than a burst.
              "--dx": `${Math.cos(rad) * reach}px`,
              "--dy": `${Math.sin(rad) * reach}px`,
            } as React.CSSProperties
          }
        />
      );
    })}
  </div>
);


/**
 * Shown when the third try is spent and the level is about to restart.
 *
 * Worded and coloured as an invitation, not a penalty. It is the only place in the game
 * where something is taken away, so it is the one place most worth getting the tone
 * right: no red, no "failed", no score shown. The child is told the thing that is about
 * to happen and that it is fine.
 */
export const RestartCard = () => (
  <div className="overlay">
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 86,
        lineHeight: 1.05,
        color: colors.spark,
        WebkitTextStroke: `10px ${colors.ink}`,
        paintOrder: "stroke fill",
        textAlign: "center",
      }}
    >
      Let&rsquo;s try again!
    </div>
  </div>
);

const StarRow = ({ earned }: { earned: number }) => (
  <div style={{ display: "flex", gap: 10 }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={i < earned ? "star-pop" : undefined}
        style={{ display: "block", animationDelay: `${i * 140}ms` }}
      >
        <Star filled={i < earned} size={88} />
      </span>
    ))}
  </div>
);

/**
 * End-of-level card: stars earned, tries used, and one very large button.
 *
 * The tries count is spelled out because the stars are derived from it — three stars
 * for a clean run, one fewer per wrong drop. Showing only the stars would leave the
 * scoring feeling arbitrary to the adult in the room, who is the person who reads it.
 *
 * The button is oversized because the person pressing it has poor aim and cannot read,
 * and the alternative to a button they can hit is a parent restarting the game every
 * ninety seconds.
 */
export const LevelDoneCard = ({
  level,
  stars,
  wrong,
  isLast,
  onNext,
}: {
  level: number;
  stars: number;
  wrong: number;
  isLast: boolean;
  onNext: () => void;
}) => (
  <div className="overlay">
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 76,
        lineHeight: 1.05,
        color: colors.spark,
        WebkitTextStroke: `9px ${colors.ink}`,
        paintOrder: "stroke fill",
      }}
    >
      Level {level} done!
    </div>

    <StarRow earned={stars} />

    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 34,
        color: colors.text,
      }}
    >
      {wrong === 0
        ? "No mistakes!"
        : `${wrong} wrong ${wrong === 1 ? "try" : "tries"}`}
    </div>

    <button type="button" className="replay" onClick={onNext}>
      {isLast ? "Finish" : "Next level"}
    </button>
  </div>
);

/** Shown after the last level. Total stars out of the maximum, and a full restart. */
export const GameDoneCard = ({
  stars,
  maxStars,
  onReplay,
}: {
  stars: number;
  maxStars: number;
  onReplay: () => void;
}) => (
  <div className="overlay">
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 92,
        lineHeight: 1.05,
        color: colors.spark,
        WebkitTextStroke: `10px ${colors.ink}`,
        paintOrder: "stroke fill",
      }}
    >
      You did it!
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 56,
        color: colors.ink,
      }}
    >
      <Star filled size={64} />
      {stars} / {maxStars}
    </div>

    <button type="button" className="replay" onClick={onReplay}>
      Play again
    </button>
  </div>
);
