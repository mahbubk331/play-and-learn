import type { ReactNode } from "react";

import { colors } from "../theme";

/**
 * Shared parts for the animals that turn up and applaud when you get one right.
 *
 * Five species is where hand-drawing each one stops being reasonable, so everything they
 * have in common lives here: a front-facing chibi body, two tiny arms that clap, the
 * dropping jaw, and the face furniture. A species file supplies only what actually differs
 * — its palette, its head outline, its ears or horns or mane, and its markings.
 *
 * All of them face the viewer. Two eyes with centred pupils is what "looking at you" is
 * made of, and it is the whole reason the character is worth having.
 *
 * Everything is authored in a 200x170 box, symmetric about x=100.
 */

export const INK = colors.ink;
export const TOOTH = "#FFF8EC";
export const MOUTH_DARK = "#8E2B2B";
export const TONGUE = "#D4696F";
export const CHEEK = "#EF8A90";

/** Centre line. Every animal is symmetric about it, and the arms mirror across it. */
export const MID = 100;

export type Palette = {
  /** Main body colour. */
  skin: string;
  /** Shading: limbs, ears, muzzle shadow. */
  skinDeep: string;
  /** Belly and muzzle patch. */
  belly: string;
};

export const line = {
  stroke: INK,
  strokeWidth: 4,
  strokeLinejoin: "round" as const,
};

export const Tooth = ({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) => (
  <polygon
    points={`${x},${y} ${x + w},${y} ${x + w / 2},${y + h}`}
    fill={TOOTH}
    stroke={INK}
    strokeWidth={2.5}
    strokeLinejoin="round"
  />
);

/** Mirrors its children about the centre line, so one drawing serves both sides. */
export const Mirror = ({ children }: { children: ReactNode }) => (
  <g transform={`translate(${MID * 2} 0) scale(-1 1)`}>{children}</g>
);

/**
 * One tiny arm. `side` -1 is the viewer's left; 1 is the mirror of it.
 *
 * The paw is a plain circle: it has to work as a dinosaur's claw, a big cat's paw, a
 * monkey's hand and a hoof, and a circle is the only shape that reads as all four without
 * looking wrong as any of them.
 */
const Arm = ({ side, p }: { side: -1 | 1; p: Palette }) => {
  const limb = (
    <>
      <path
        d="M 68 102 Q 57 118 70 131 L 87 126 Q 80 113 78 102 Z"
        fill={p.skin}
        {...line}
      />
      <circle cx={80} cy={130} r={12} fill={p.skin} {...line} />
    </>
  );

  return (
    <g className={side === -1 ? "critter-arm-l" : "critter-arm-r"}>
      {side === -1 ? limb : <Mirror>{limb}</Mirror>}
    </g>
  );
};

/**
 * The clapping pair. `dy` moves them for a taller or shorter body; `sx` widens the gap for
 * a broad-chested animal.
 *
 * Wrapping them in a transform rather than duplicating the geometry per species is what
 * lets one arm drawing serve five different body plans — and the CSS clap animation still
 * composes correctly through an ancestor transform.
 */
export const Arms = ({
  p,
  dy = 0,
  sx = 1,
  scale = 1,
}: {
  p: Palette;
  dy?: number;
  sx?: number;
  /** Uniform size. A monkey's arms are long; a cow's are stubby. */
  scale?: number;
}) => (
  <g
    transform={`translate(${MID} ${dy}) scale(${sx * scale} ${scale}) translate(${-MID} 0)`}
  >
    <Arm side={-1} p={p} />
    <Arm side={1} p={p} />
  </g>
);

/**
 * Body, legs and the clapping arms — the chibi build.
 *
 * Species with their own proportions (see distinct.tsx) skip this and compose `Arms` with
 * their own body instead. `tail` goes in behind everything, which is where a tail belongs
 * on a front-facing animal; the arms are drawn last so they clap in FRONT of the chest.
 */
export const Body = ({ p, tail }: { p: Palette; tail?: ReactNode }) => (
  <>
    {tail}

    <ellipse cx={78} cy={146} rx={16} ry={19} fill={p.skinDeep} {...line} />
    <ellipse cx={122} cy={146} rx={16} ry={19} fill={p.skinDeep} {...line} />

    <ellipse cx={MID} cy={118} rx={40} ry={34} fill={p.skin} {...line} />
    <ellipse cx={MID} cy={126} rx={25} ry={22} fill={p.belly} stroke="none" />

    <Arms p={p} />
  </>
);

/**
 * A stubby leg pair.
 *
 * Lived in distinct.tsx until the animal game needed it too. Anything two species files both
 * draw belongs here, which is the whole point of this module.
 */
export const Legs = ({
  p,
  y = 150,
  spread = 24,
  rx = 14,
  ry = 16,
}: {
  p: Palette;
  y?: number;
  spread?: number;
  rx?: number;
  ry?: number;
}) => (
  <>
    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * spread}
        cy={y}
        rx={rx}
        ry={ry}
        fill={p.skinDeep}
        {...line}
      />
    ))}
  </>
);

/** Two-stroke tail: ink underneath, skin on top. Reads as a limb, not a line. */
export const Tail = ({
  d,
  p,
  w = 15,
  tip,
}: {
  d: string;
  p: Palette;
  w?: number;
  tip?: ReactNode;
}) => (
  <>
    <path
      d={d}
      fill="none"
      stroke={INK}
      strokeWidth={w + 8}
      strokeLinecap="round"
    />
    <path
      d={d}
      fill="none"
      stroke={p.skinDeep}
      strokeWidth={w}
      strokeLinecap="round"
    />
    {tip}
  </>
);

/**
 * The mouth: a dark interior with a jaw that drops over it.
 *
 * Drawn AFTER the head rather than before, which is what lets the interior sit inside the
 * face without the head's fill covering it. The jaw is wider and taller than the interior
 * so nothing shows through when the mouth is shut.
 *
 * The jaw DROPS, it does not rotate. With the head facing the camera the hinge axis points
 * at the viewer, so a 2D rotation would swing the chin sideways across the face.
 *
 * The tongue rides on the jaw, not in the interior behind it — both anatomically right and
 * the only way it stays visible once the mouth opens. A laughing mouth with a tongue reads
 * friendly; the same mouth with a black void in it reads like a roar.
 */
export const Mouth = ({
  p,
  /** Upper teeth or a beak, drawn over the interior and fixed to the head. */
  upper,
  /** Lower teeth, which travel with the jaw. */
  lower,
  /** Move the whole mouth down for a lower muzzle. */
  dy = 0,
  /** Widen or narrow it. A cow's mouth is much wider than a monkey's. */
  sx = 1,
}: {
  p: Palette;
  upper?: ReactNode;
  lower?: ReactNode;
  dy?: number;
  sx?: number;
}) => (
  <g transform={`translate(${MID} ${dy}) scale(${sx} 1) translate(${-MID} 0)`}>
    <polygon points="80,67 120,67 117,84 83,84" fill={MOUTH_DARK} stroke="none" />

    <g className="critter-jaw">
      <path
        d="M 76 65 L 124 65 L 119 84 Q 100 94 81 84 Z"
        fill={p.skin}
        {...line}
      />
      <ellipse cx={MID} cy={78} rx={13} ry={5.5} fill={TONGUE} stroke="none" />
      {lower}
    </g>

    {upper}
  </g>
);

/**
 * Eyes, brows and cheeks — the whole "delighted" read, and none of it species-specific.
 *
 * The brows are raised arches. Angled down toward the centre is the single strongest
 * "cross" cue on a face; arched is the same head reading as pleased, with nothing else
 * changed. The cheeks are cheap and do a disproportionate amount of the work.
 */
export const Face = ({
  /** Eye centre height. Lower for a long-muzzled animal. */
  eyeY = 48,
  /** Distance of each eye from the centre line. */
  spread = 17,
  r = 13,
  browY = 27,
  cheeks = true,
  cheekY = 62,
  cheekSpread = 33,
}: {
  eyeY?: number;
  spread?: number;
  r?: number;
  browY?: number;
  cheeks?: boolean;
  cheekY?: number;
  cheekSpread?: number;
} = {}) => (
  <>
    {[-1, 1].map((s) => (
      <path
        key={`brow${s}`}
        d={`M ${MID + s * (spread + 13)} ${browY} Q ${MID + s * spread} ${browY - 9} ${MID + s * (spread - 13)} ${browY}`}
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
    ))}

    {cheeks
      ? [-1, 1].map((s) => (
          <ellipse
            key={`cheek${s}`}
            cx={MID + s * cheekSpread}
            cy={cheekY}
            rx={7}
            ry={5}
            fill={CHEEK}
            opacity={0.75}
          />
        ))
      : null}

    {[-1, 1].map((s) => (
      <circle
        key={`eye${s}`}
        cx={MID + s * spread}
        cy={eyeY}
        r={r}
        fill={TOOTH}
        {...line}
      />
    ))}
    {[-1, 1].map((s) => (
      <circle
        key={`pupil${s}`}
        cx={MID + s * spread}
        cy={eyeY + 1}
        r={r * 0.5}
        fill={INK}
      />
    ))}
    {[-1, 1].map((s) => (
      <circle
        key={`glint${s}`}
        cx={MID + s * spread - 3}
        cy={eyeY - 3}
        r={r * 0.2}
        fill={TOOTH}
      />
    ))}
  </>
);
