import type { ReactElement } from "react";

import {
  Arms,
  Face,
  INK,
  MID,
  Mouth,
  type Palette,
  Tooth,
  TOOTH,
  line,
} from "./kit";

/**
 * Variant B — "distinct": every species gets its own head shape and body proportions.
 *
 * This exists because variant A shared one head ellipse and one body across all five, so
 * the only thing telling a tiger from a lion from a cow was ears and colour, and reviewed
 * side by side they read as one animal in five hats. The fix is not more detail — it is a
 * different SILHOUETTE per species, because silhouette is what recognition runs on:
 *
 *   cow      widest head, enormous muzzle, horns, floppy side ears, barrel body
 *   lion     mane ring dominates and the face inside it is small
 *   tiger    broad head with pointed cheek ruffs, heavy stripes, longer body
 *   monkey   narrow head, huge round side ears, big pale face patch, long arms
 *   dinosaur no round head at all — a low skull with a big protruding toothed snout
 *
 * Each species is split into a `Head` and a `Body` so the portrait variant can reuse the
 * head at a larger scale rather than being drawn a third time.
 */

export type Parts = {
  palette: Palette;
  Head: () => ReactElement;
  Body: () => ReactElement;
};

/** A stubby leg pair. */
const Legs = ({
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
const Tail = ({
  d,
  p,
  w = 15,
  tip,
}: {
  d: string;
  p: Palette;
  w?: number;
  tip?: ReactElement;
}) => (
  <>
    <path d={d} fill="none" stroke={INK} strokeWidth={w + 6} strokeLinecap="round" />
    <path d={d} fill="none" stroke={p.skin} strokeWidth={w} strokeLinecap="round" />
    {tip}
  </>
);

// ======================================================================================
// COW — the widest head and the biggest muzzle of the five.
// ======================================================================================

const COW: Palette = { skin: "#FBF6EE", skinDeep: "#DFD5C6", belly: "#FFFFFF" };
const COW_SPOT = "#3A3347";
const COW_SNOUT = "#F4A9B4";
const HORN = "#E8D9AE";

const CowHead = () => (
  <>
    {/* Horns, then floppy ears BELOW them and out to the sides. */}
    {[-1, 1].map((s) => (
      <path
        key={`h${s}`}
        d={`M ${MID + s * 26} 22 Q ${MID + s * 30} 4 ${MID + s * 44} 6 Q ${MID + s * 38} 16 ${MID + s * 34} 26 Z`}
        fill={HORN}
        {...line}
      />
    ))}
    {[-1, 1].map((s) => (
      <ellipse
        key={`e${s}`}
        cx={MID + s * 47}
        cy={44}
        rx={17}
        ry={10}
        fill={COW.skinDeep}
        transform={`rotate(${s * 18} ${MID + s * 47} 44)`}
        {...line}
      />
    ))}

    {/* WIDE and low, not round. This is the cow's whole silhouette. */}
    <ellipse cx={MID} cy={50} rx={43} ry={29} fill={COW.skin} {...line} />

    {/* Off-centre eye patch. Asymmetry reads as markings; symmetry reads as a mask. */}
    <ellipse cx={MID - 24} cy={38} rx={19} ry={15} fill={COW_SPOT} stroke="none" />
    <ellipse cx={MID + 30} cy={30} rx={10} ry={7} fill={COW_SPOT} stroke="none" />

    {/* The enormous muzzle, hanging below the skull. */}
    <ellipse cx={MID} cy={72} rx={33} ry={18} fill={COW_SNOUT} {...line} />
    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 15}
        cy={67}
        rx={5}
        ry={6}
        fill="#C97C89"
      />
    ))}

    <Mouth p={{ ...COW, skin: COW_SNOUT }} dy={9} sx={1.2} />
    <Face eyeY={41} spread={22} r={11} browY={25} cheeks={false} />
  </>
);

const CowBody = () => (
  <>
    <Tail d="M 138 124 Q 178 118 186 90" p={COW} w={11} tip={<circle cx={186} cy={86} r={10} fill={COW_SPOT} {...line} />} />
    <Legs p={COW} spread={26} rx={15} ry={16} />
    {/* Barrel: wider than it is tall. */}
    <ellipse cx={MID} cy={124} rx={50} ry={29} fill={COW.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={26} ry={19} fill={COW.belly} stroke="none" />
    <ellipse cx={MID - 28} cy={116} rx={13} ry={10} fill={COW_SPOT} stroke="none" />
    <ellipse cx={MID + 30} cy={130} rx={10} ry={8} fill={COW_SPOT} stroke="none" />
    <Arms p={COW} dy={6} scale={0.92} />
  </>
);

// ======================================================================================
// LION — the mane is the animal; the face inside it is small.
// ======================================================================================

const LION: Palette = { skin: "#F0B44C", skinDeep: "#CE9127", belly: "#FFE9C4" };
const MANE = "#B4661F";
const MANE_DEEP = "#8E4E14";

const LionHead = () => (
  <>
    {[-1, 1].map((s) => (
      <circle
        key={s}
        cx={MID + s * 30}
        cy={16}
        r={13}
        fill={LION.skin}
        {...line}
      />
    ))}

    {/* Ring of lobes rather than a spiky star — spikes read as danger, and this animal is
        applauding. */}
    {Array.from({ length: 13 }, (_, i) => {
      const a = (i / 13) * Math.PI * 2;
      return (
        <circle
          key={i}
          cx={MID + Math.cos(a) * 43}
          cy={52 + Math.sin(a) * 40}
          r={18}
          fill={i % 2 ? MANE : MANE_DEEP}
          stroke={INK}
          strokeWidth={4}
        />
      );
    })}
    <circle cx={MID} cy={52} r={45} fill={MANE} stroke="none" />

    {/* Small face, deep inside the mane. */}
    <ellipse cx={MID} cy={54} rx={29} ry={27} fill={LION.skin} {...line} />

    {/* Two-lobe upper lip: the cat-muzzle shape. */}
    <ellipse cx={MID - 11} cy={68} rx={13} ry={9} fill={LION.belly} {...line} />
    <ellipse cx={MID + 11} cy={68} rx={13} ry={9} fill={LION.belly} {...line} />
    <path
      d={`M ${MID - 7} 60 Q ${MID} 66 ${MID + 7} 60 Z`}
      fill={INK}
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />

    <Mouth p={LION} dy={10} sx={0.82} />
    <Face eyeY={47} spread={14} r={11} browY={31} cheeks={false} />
  </>
);

const LionBody = () => (
  <>
    <Tail
      d="M 136 126 Q 180 124 188 94"
      p={LION}
      w={10}
      tip={<circle cx={188} cy={90} r={11} fill={MANE} {...line} />}
    />
    <Legs p={LION} spread={25} />
    {/* Broad chest, narrower hips. */}
    <ellipse cx={MID} cy={122} rx={44} ry={32} fill={LION.skin} {...line} />
    <ellipse cx={MID} cy={130} rx={26} ry={21} fill={LION.belly} stroke="none" />
    <Arms p={LION} dy={2} scale={1} />
  </>
);

// ======================================================================================
// TIGER — broad head with pointed cheek ruffs, and stripes everywhere.
// ======================================================================================

const TIGER: Palette = { skin: "#F0983C", skinDeep: "#C7701C", belly: "#FFF0DC" };

const TigerHead = () => (
  <>
    {[-1, 1].map((s) => (
      <g key={s}>
        <circle cx={MID + s * 33} cy={19} r={15} fill={TIGER.skin} {...line} />
        <circle cx={MID + s * 33} cy={21} r={7} fill={TIGER.skinDeep} stroke="none" />
      </g>
    ))}

    {/*
      Cheek ruffs — the single most tiger-ish thing about a big cat's head, and nothing else
      in the set has them.

      Scalloped and hugging the skull rather than pointed and sticking out sideways: the
      first version was a spike that read as a wing, which is worse than having no ruff.
    */}
    {[-1, 1].map((s) => (
      <path
        key={s}
        d={`M ${MID + s * 30} 46 Q ${MID + s * 49} 46 ${MID + s * 42} 56 Q ${MID + s * 52} 61 ${MID + s * 41} 67 Q ${MID + s * 48} 75 ${MID + s * 30} 72 Z`}
        fill={TIGER.skin}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={50} rx={40} ry={33} fill={TIGER.skin} {...line} />

    {/* Forehead and cheek stripes. */}
    {[-26, -9, 9, 26].map((dx) => (
      <path
        key={dx}
        d={`M ${MID + dx - 4} 17 Q ${MID + dx} 30 ${MID + dx + 4} 17`}
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ))}
    {[-1, 1].map((s) =>
      [0, 1].map((k) => (
        <path
          key={`${s}${k}`}
          d={`M ${MID + s * (36 - k * 3)} ${44 + k * 13} Q ${MID + s * (26 - k * 2)} ${48 + k * 13} ${MID + s * (36 - k * 3)} ${54 + k * 13}`}
          fill="none"
          stroke={INK}
          strokeWidth={5.5}
          strokeLinecap="round"
        />
      )),
    )}

    <ellipse cx={MID} cy={66} rx={27} ry={15} fill={TIGER.belly} {...line} />
    <path
      d={`M ${MID - 8} 59 Q ${MID} 66 ${MID + 8} 59 Z`}
      fill={INK}
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />

    <Mouth p={TIGER} dy={7} />
    {[-1, 1].map((s) =>
      [0, 1].map((k) => (
        <path
          key={`w${s}${k}`}
          d={`M ${MID + s * 25} ${66 + k * 6} L ${MID + s * 56} ${60 + k * 12}`}
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      )),
    )}
    <Face eyeY={45} spread={17} r={12} browY={28} cheeks={false} />
  </>
);

const TigerBody = () => (
  <>
    <Tail d="M 136 126 Q 180 120 188 88" p={TIGER} w={12} />
    <Legs p={TIGER} spread={24} />
    <ellipse cx={MID} cy={122} rx={42} ry={31} fill={TIGER.skin} {...line} />
    <ellipse cx={MID} cy={130} rx={25} ry={20} fill={TIGER.belly} stroke="none" />
    {[-1, 1].map((s) => (
      <path
        key={s}
        d={`M ${MID + s * 30} 104 Q ${MID + s * 22} 116 ${MID + s * 32} 126`}
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
    ))}
    <Arms p={TIGER} dy={2} />
  </>
);

// ======================================================================================
// MONKEY — narrow head, huge side ears, big pale face, long arms.
// ======================================================================================

const MONKEY: Palette = { skin: "#A9713F", skinDeep: "#7E5228", belly: "#E8C79A" };
const MONKEY_FACE = "#EFD3AA";

const MonkeyHead = () => (
  <>
    {/* Ears on the SIDES and very large. Half the monkey cue. */}
    {[-1, 1].map((s) => (
      <g key={s}>
        <circle cx={MID + s * 42} cy={54} r={21} fill={MONKEY.skin} {...line} />
        <circle
          cx={MID + s * 43}
          cy={54}
          r={11}
          fill={MONKEY.skinDeep}
          stroke="none"
        />
      </g>
    ))}

    {/* Narrower than the others. */}
    <ellipse cx={MID} cy={50} rx={33} ry={33} fill={MONKEY.skin} {...line} />

    {/* Big pale face patch. The other half of the cue. */}
    <path
      d={`M ${MID} 26 Q ${MID + 28} 26 ${MID + 27} 56 Q ${MID + 25} 82 ${MID} 82 Q ${MID - 25} 82 ${MID - 27} 56 Q ${MID - 28} 26 ${MID} 26 Z`}
      fill={MONKEY_FACE}
      {...line}
    />

    {/* Fringe. */}
    <path
      d={`M ${MID - 31} 32 Q ${MID - 16} 12 ${MID} 26 Q ${MID + 16} 12 ${MID + 31} 32 Q ${MID + 16} 22 ${MID} 32 Q ${MID - 16} 22 ${MID - 31} 32 Z`}
      fill={MONKEY.skinDeep}
      {...line}
    />

    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 7}
        cy={60}
        rx={3.4}
        ry={4.4}
        fill={MONKEY.skinDeep}
      />
    ))}

    <Mouth p={{ ...MONKEY, skin: MONKEY_FACE }} dy={11} sx={0.78} />
    <Face eyeY={48} spread={13} r={11.5} browY={33} cheeks={false} />
  </>
);

const MonkeyBody = () => (
  <>
    <Tail d="M 132 128 Q 176 138 180 106 Q 182 86 164 92" p={MONKEY} w={10} />
    <Legs p={MONKEY} spread={21} rx={12} ry={15} />
    {/* Smaller body — the long arms are what carry the shape. */}
    <ellipse cx={MID} cy={124} rx={34} ry={28} fill={MONKEY.skin} {...line} />
    <ellipse cx={MID} cy={130} rx={21} ry={18} fill={MONKEY.belly} stroke="none" />
    <Arms p={MONKEY} dy={-4} scale={1.18} />
  </>
);

// ======================================================================================
// DINOSAUR — not a round head. A low skull with a big toothed snout out front.
// ======================================================================================

const DINO: Palette = { skin: "#5FA95A", skinDeep: "#3F7F3E", belly: "#A8DA95" };

const DinoHead = () => (
  <>
    {/* Plates fanned out behind the skull. */}
    {[-1, 1].map((s) =>
      [0, 1, 2].map((k) => (
        <polygon
          key={`${s}${k}`}
          points={`${MID + s * (24 + k * 14)},${30 - k * 2} ${MID + s * (32 + k * 15)},${10 + k * 4} ${MID + s * (40 + k * 14)},${32 + k * 2}`}
          fill={DINO.skinDeep}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      )),
    )}

    {/* Low, wide skull. */}
    <ellipse cx={MID} cy={44} rx={37} ry={26} fill={DINO.skin} {...line} />

    {/* The snout: big, protruding, and where all the teeth are. */}
    <ellipse cx={MID} cy={68} rx={31} ry={21} fill={DINO.skin} {...line} />
    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 12}
        cy={57}
        rx={3.6}
        ry={2.8}
        fill={DINO.skinDeep}
      />
    ))}

    <Mouth
      p={DINO}
      dy={10}
      sx={1.12}
      upper={[80, 91, 102, 113].map((x) => (
        <Tooth key={x} x={x} y={65} w={6} h={9} />
      ))}
      lower={[83, 94, 105, 116].map((x) => (
        <Tooth key={x} x={x} y={68} w={5} h={-7} />
      ))}
    />
    {/* Eyes high and wide on the skull, which is where a reptile's are. */}
    <Face eyeY={36} spread={22} r={11} browY={20} cheeks={false} />
  </>
);

const DinoBody = () => (
  <>
    <Tail d="M 134 124 Q 178 118 192 84" p={{ ...DINO, skin: DINO.skinDeep }} w={22} />
    <Legs p={DINO} spread={24} rx={15} ry={17} />
    <ellipse cx={MID} cy={122} rx={40} ry={32} fill={DINO.skin} {...line} />
    <ellipse cx={MID} cy={130} rx={24} ry={20} fill={DINO.belly} stroke="none" />
    <Arms p={DINO} dy={0} scale={0.85} />
  </>
);

// ======================================================================================

export const DISTINCT: Record<string, Parts> = {
  trex: { palette: DINO, Head: DinoHead, Body: DinoBody },
  tiger: { palette: TIGER, Head: TigerHead, Body: TigerBody },
  lion: { palette: LION, Head: LionHead, Body: LionBody },
  monkey: { palette: MONKEY, Head: MonkeyHead, Body: MonkeyBody },
  cow: { palette: COW, Head: CowHead, Body: CowBody },
};

/** Head above body — the full-figure variant. */
export const distinctFull = (id: string) => {
  const { Head, Body } = DISTINCT[id];
  return () => (
    <>
      <Body />
      <Head />
    </>
  );
};

/**
 * Variant C — "portrait": the same head, blown up to fill the frame, with the paws clapping
 * in at the bottom edge.
 *
 * Reuses variant B's head rather than being drawn a third time. It is the most legible of
 * the three by a wide margin, simply because every feature is twice the size — which is the
 * whole argument for it on a small tablet held at arm's length.
 */
export const distinctPortrait = (id: string) => {
  const { Head, palette } = DISTINCT[id];
  return () => (
    <>
      <g transform={`translate(${MID} 90) scale(1.5) translate(${-MID} -46)`}>
        <Head />
      </g>
      {/*
        The paws clap in front of the chin. dy has to keep them inside the 170-unit frame —
        at +34 with a 1.62 head they were translated clean off the bottom and never appeared
        at all, which is not obvious from the code and was only visible in the gallery.
      */}
      <g transform="translate(0 18)">
        <Arms p={palette} scale={1.12} />
      </g>
    </>
  );
};

export { TOOTH };
