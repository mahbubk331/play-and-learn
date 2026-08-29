import { MAX_WRONG } from "../levels";
import { colors, fonts } from "../theme";

/**
 * The bar across the top: which game, which level, how many stars banked, how many tries left.
 *
 * The tries indicator is the important one and it is on screen from the first frame.
 * Running out of tries restarts the level, and a consequence a child cannot see coming
 * is the version of that rule that actually upsets them. Three pips that visibly go out
 * turn it into something they are tracking rather than something that happens to them.
 *
 * The stars on the right are THIS TRACK's total, not the whole app's. A running total across all
 * four would climb while you played colours because of numbers you finished yesterday, which
 * tells a child nothing about what they are doing now. The all-four total is on the picker,
 * where it is the answer to a question somebody is actually asking.
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

/**
 * Back to the picker.
 *
 * A 2x2 grid of squares rather than a house or an arrow, because it is a picture of the screen
 * it goes to — four games in two rows — and the person pressing it cannot read "menu" or infer
 * that a house means "the place where you chose this".
 *
 * It has to declare `pointerEvents` and a `zIndex`, and both are load-bearing. The HUD sets
 * `pointerEvents: none` so a finger crossing it cannot be swallowed mid-drag, and `.grab` is a
 * full-stage sibling that would otherwise sit on top of this and eat the tap.
 */
const MenuButton = ({ onPress }: { onPress: () => void }) => (
  <button
    type="button"
    className="hud-menu"
    onClick={onPress}
    aria-label="Choose a game"
  >
    <svg width={32} height={32} viewBox="0 0 100 100">
      {[
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([cx, cy]) => (
        <rect
          key={`${cx}-${cy}`}
          x={12 + cx * 44}
          y={12 + cy * 44}
          width={32}
          height={32}
          rx={7}
          fill={colors.ink}
        />
      ))}
    </svg>
  </button>
);

export const Hud = ({
  /** The track's title, so it is always clear WHICH game these levels belong to. */
  title,
  level,
  totalLevels,
  stars,
  wrong,
  round,
  rounds,
  /** Bumped on each point so the newest progress star can pop. */
  nonce,
  onMenu,
}: {
  title: string;
  level: number;
  totalLevels: number;
  stars: number;
  wrong: number;
  round: number;
  rounds: number;
  nonce: number;
  onMenu: () => void;
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
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <MenuButton onPress={onMenu} />

      <div style={{ lineHeight: 1.05 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 32,
            color: colors.ink,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 22,
            color: colors.ink,
            opacity: 0.55,
          }}
        >
          Level {level} / {totalLevels}
        </div>
      </div>
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
