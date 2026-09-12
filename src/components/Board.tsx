import { colors, fonts } from "../theme";
import {
  BOARD,
  HOLE_SCALE,
  SHAPE_PX,
  STAGE,
  holeCenterX,
  holeCenterY,
  holeLabelY,
  pointsAttr,
  scaledPoints,
} from "../stage";
import {
  tokenFontScale,
  tokenGlyph,
  tokenHue,
  tokenLabel,
  tokenPoints,
  type Token,
} from "../tokens";

/**
 * The board, and the holes punched through it.
 *
 * The holes are cut with an SVG **mask** rather than an even-odd path, because a hole is not
 * always a polygon any more: from level 4 a hole is the shape of a NUMERAL, and a mask accepts
 * text as happily as a polygon. The even-odd path this replaced could only cut point lists,
 * which is what forced number holes to be identical squares with a printed label underneath.
 *
 * Every hole's geometry comes from one place — `HoleShape` — so the cut-out, the ink rim, the
 * hover highlight and the seated block are guaranteed to agree. Deriving them separately is
 * exactly how a hole and the block that fits it drift apart.
 */

/** A shape token's polygon, placed in stage coordinates around a centre point. */
export const placedPoints = (
  points: [number, number][],
  cx: number,
  cy: number,
  scale: number,
  size = SHAPE_PX,
): string =>
  pointsAttr(
    scaledPoints({ points } as never, scale).map(([x, y]) => [
      cx + ((x - 50) / 100) * size,
      cy + ((y - 50) / 100) * size,
    ]) as [number, number][],
  );

/**
 * One hole or block outline, whichever kind of token it is.
 *
 * `scale` is what makes a hole bigger than the block that goes in it: the block is drawn at 1
 * and the hole at HOLE_SCALE. For a glyph that is a larger font size about the same centre,
 * which is the exact analogue of scaling a polygon about its centre — so "the hole is 16%
 * bigger than the block" means one thing across both kinds.
 */
export const HoleShape = ({
  token,
  cx,
  cy,
  scale,
  fill,
  stroke,
  strokeWidth = 0,
}: {
  token: Token;
  cx: number;
  cy: number;
  scale: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) => {
  const points = tokenPoints(token);

  if (points) {
    return (
      <polygon
        points={placedPoints(points, cx, cy, scale)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      // Outline behind the fill, or a thick stroke eats the counters out of a 0, 6, 8 or 9 from
      // the inside and the digit stops being readable.
      paintOrder="stroke fill"
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: SHAPE_PX * tokenFontScale(token) * scale,
        fill,
        stroke: stroke ?? "none",
        strokeWidth,
        strokeLinejoin: "round",
      }}
    >
      {tokenGlyph(token)}
    </text>
  );
};

const MASK_ID = "board-holes";

export const Board = ({
  /** Hole under the dragged block, highlighted as a "you can drop here" cue. */
  hoverIndex,
  /**
   * The hole currently holding a block, during the correct-answer beat only.
   *
   * Holes do NOT stay filled between rounds: the block drops through into the machine, exactly
   * as it would in a real shape sorter. Keeping them filled looked tidier and broke the game —
   * each token comes up twice, so the second time its hole would already be plugged.
   */
  seatedIndex,
  /**
   * Which token sits at which hole position: `arrangement[position]`.
   *
   * The board is not built from a fixed order. From level 2 the holes are shuffled so position
   * stops being a usable cue, which means every place that draws a hole goes through this.
   */
  arrangement,
}: {
  hoverIndex: number | null;
  seatedIndex: number | null;
  arrangement: Token[];
}) => (
  <svg
    // Classed so the board's own text can be told apart from the numeral on the block — once
    // number blocks existed, "every text in an svg" stopped meaning "a hole label".
    className="board"
    viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
    width={STAGE.width}
    height={STAGE.height}
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
  >
    <defs>
      {/*
        White is board, black is hole. userSpaceOnUse with an explicit region, because the
        default objectBoundingBox region is derived from the masked element and would clip a
        glyph that reaches past it.
      */}
      <mask
        id={MASK_ID}
        maskUnits="userSpaceOnUse"
        x={BOARD.left - 30}
        y={BOARD.top - 30}
        width={BOARD.width + 60}
        height={BOARD.height + 60}
      >
        <rect
          x={BOARD.left}
          y={BOARD.top}
          width={BOARD.width}
          height={BOARD.height}
          fill="#fff"
        />
        {arrangement.map((token, i) => (
          <HoleShape
            key={i}
            token={token}
            cx={holeCenterX(i)}
            cy={holeCenterY(i)}
            scale={HOLE_SCALE}
            fill="#000"
          />
        ))}
      </mask>
    </defs>

    {/* Interior, seen only through the holes. Drawn first so a seated block sits between it and
        the board face. */}
    <rect
      x={BOARD.left + 8}
      y={BOARD.top + 8}
      width={BOARD.width - 16}
      height={BOARD.height - 16}
      rx={16}
      fill={colors.interior}
    />

    {seatedIndex !== null ? (
      <HoleShape
        token={arrangement[seatedIndex]}
        cx={holeCenterX(seatedIndex)}
        cy={holeCenterY(seatedIndex)}
        scale={1}
        fill={tokenHue(arrangement[seatedIndex])?.fill ?? colors.block}
        stroke={colors.ink}
        strokeWidth={7}
      />
    ) : null}

    {/* Board face, holes punched out. Fill and outline are separate elements because a mask
        applies to the stroke too, and the outer edge has to keep its outline. */}
    <rect
      x={BOARD.left}
      y={BOARD.top}
      width={BOARD.width}
      height={BOARD.height}
      rx={24}
      fill={colors.machine}
      mask={`url(#${MASK_ID})`}
    />
    <rect
      x={BOARD.left}
      y={BOARD.top}
      width={BOARD.width}
      height={BOARD.height}
      rx={24}
      fill="none"
      stroke={colors.ink}
      strokeWidth={7}
    />

    {/*
      Rim on every hole, drawn at the mask's own geometry so it lands on the cut edge rather
      than being a second guess at where the hole is.

      On a COLOUR level the rim is the hole's colour and it is thicker, because it is the only
      cue there is — a colour cannot be a shape, so every hole is the same circle and the rim
      is what says "this is the red one". Shapes and numbers get a thin ink rim, since their
      outline already carries the answer.
    */}
    {arrangement.map((token, i) => {
      const hue = tokenHue(token);
      return (
        <HoleShape
          key={`rim-${i}`}
          token={token}
          cx={holeCenterX(i)}
          cy={holeCenterY(i)}
          scale={HOLE_SCALE}
          fill="none"
          stroke={hue ? hue.fill : colors.ink}
          strokeWidth={hue ? 18 : 7}
        />
      );
    })}

    {/* A second, darker ring outside a colour rim so the colour still holds an edge against
        the grey board rather than bleeding into it. */}
    {arrangement.map((token, i) => {
      const hue = tokenHue(token);
      if (!hue) return null;
      return (
        <HoleShape
          key={`ring-${i}`}
          token={token}
          cx={holeCenterX(i)}
          cy={holeCenterY(i)}
          scale={HOLE_SCALE * 1.135}
          fill="none"
          stroke={hue.deep}
          strokeWidth={6}
        />
      );
    })}

    {hoverIndex !== null ? (
      <HoleShape
        token={arrangement[hoverIndex]}
        cx={holeCenterX(hoverIndex)}
        cy={holeCenterY(hoverIndex)}
        scale={HOLE_SCALE * 0.94}
        fill="none"
        stroke={colors.spark}
        strokeWidth={7}
      />
    ) : null}

    {/*
      Word under each SHAPE and COLOUR hole. Numbers get no label: the hole IS the numeral, so
      a printed one underneath would be the same information twice.

      On a colour level the word is doing real work rather than being a bonus — it is the route
      through for a colour-blind child, who otherwise has only position.
    */}
    {arrangement.map((token, i) =>
      tokenGlyph(token) ? null : (
        <text
          key={`label-${i}`}
          x={holeCenterX(i)}
          y={holeLabelY(i)}
          textAnchor="middle"
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 26,
            textTransform: "uppercase",
            fill: colors.ink,
          }}
        >
          {tokenLabel(token)}
        </text>
      ),
    )}
  </svg>
);
