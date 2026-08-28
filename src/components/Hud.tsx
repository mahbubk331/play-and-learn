import { MAX_WRONG } from "../levels";
import { colors, fonts } from "../theme";

/**
 * The bar across the top: which level, how many stars banked, how many tries left.
 *
 * The tries indicator is the important one and it is on screen from the first frame.
 * Running out of tries restarts the level, and a consequence a child cannot see coming
 * is the version of that rule that actually upsets them. Three pips that visibly go out
 * turn it into something they are tracking rather than something that happens to them.
 */

const Star = ({ filled, size = 34 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <polygon
      points={Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 46 : 20;
        const a = ((-90 + i * 36) * Math.PI) / 180;
        return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
      }).join(" ")}
      fill={filled ? colors.spark : "transparent"}
      stroke={colors.ink}
      strokeWidth={8}
      strokeLinejoin="round"
    />
  </svg>
);

export { Star };

const Pip = ({ spent }: { spent: boolean }) => (
  <svg width={34} height={34} viewBox="0 0 100 100">
    <circle
      cx={50}
      cy={50}
      r={36}
      fill={spent ? "transparent" : colors.wrong}
      stroke={colors.ink}
      strokeWidth={10}
    />
    {spent ? (
      <g stroke={colors.ink} strokeWidth={12} strokeLinecap="round">
        <line x1={30} y1={30} x2={70} y2={70} />
        <line x1={70} y1={30} x2={30} y2={70} />
      </g>
    ) : null}
  </svg>
);

export const Hud = ({
  level,
  totalLevels,
  stars,
  wrong,
  round,
  rounds,
  /** Bumped on each point so the newest progress star can pop. */
  nonce,
}: {
  level: number;
  totalLevels: number;
  stars: number;
  wrong: number;
  round: number;
  rounds: number;
  nonce: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: 26,
      right: 26,
      top: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 38,
        color: colors.ink,
      }}
    >
      Level {level}
      <span style={{ opacity: 0.45, fontSize: 26 }}> / {totalLevels}</span>
    </div>

    {/* Progress through this level, one star per round. Doubles as an answer to
        "how much longer" without a timer, which is the only acceptable way to
        answer it here. */}
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {Array.from({ length: rounds }, (_, i) => (
        <span
          key={i}
          className={i === round - 1 ? "star-pop" : undefined}
          style={{ display: "block" }}
        >
          <Star filled={i < round} size={30} />
        </span>
      ))}
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {Array.from({ length: MAX_WRONG }, (_, i) => (
          <Pip key={i} spent={i < wrong} />
        ))}
      </div>

      <span
        key={nonce}
        className="score-number"
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 42,
          color: colors.ink,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Star filled size={30} />
        {stars}
      </span>
    </div>
  </div>
);
