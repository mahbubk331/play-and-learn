import {
  Body,
  Face,
  INK,
  MID,
  Mouth,
  type Palette,
  Tooth,
  line,
} from "./kit";

/**
 * Variant A — "chibi": one big round head, one small round body, for all five animals.
 *
 * KNOWN WEAKNESS, and the reason variants B and C exist: every species here shares the
 * same `head()` ellipse and the same body, so the only thing distinguishing a tiger from a
 * lion from a cow is ears and colour. Reviewed side by side they read as one animal in five
 * different hats, which is exactly the complaint that prompted the other two sets.
 *
 * Kept as a baseline to compare against, and because the proportions are undeniably cute.
 */

export const chibiHead = (p: Palette) => (
  <ellipse cx={MID} cy={50} rx={44} ry={40} fill={p.skin} {...line} />
);

/** Rounded ears on top, like a cat's or a bear's. */
const TopEars = ({ p, x = 30, y = 18 }: { p: Palette; x?: number; y?: number }) => (
  <>
    {[-1, 1].map((s) => (
      <g key={s}>
        <circle cx={MID + s * x} cy={y} r={16} fill={p.skin} {...line} />
        <circle cx={MID + s * x} cy={y + 2} r={8} fill={p.skinDeep} stroke="none" />
      </g>
    ))}
  </>
);

// ---------------------------------------------------------------------------------------

const TREX_P: Palette = { skin: "#5FA95A", skinDeep: "#3F7F3E", belly: "#9FD48C" };

export const ChibiTrex = () => (
  <>
    <Body
      p={TREX_P}
      tail={
        // Thick and tapering, but curved like the others'. It was a straight polygon and
        // read as a plank bolted to the hip next to four animals with curved tails.
        <>
          <path
            d="M 134 124 Q 176 118 191 86"
            fill="none"
            stroke={INK}
            strokeWidth={26}
            strokeLinecap="round"
          />
          <path
            d="M 134 124 Q 176 118 191 86"
            fill="none"
            stroke={TREX_P.skinDeep}
            strokeWidth={19}
            strokeLinecap="round"
          />
        </>
      }
    />

    {/* Back plates, peeking out either side of the head. */}
    {[-1, 1].map((s) => (
      <polygon
        key={s}
        points={`${MID + s * 42},${34} ${MID + s * 56},${20} ${MID + s * 58},${40}`}
        fill={TREX_P.skinDeep}
        {...line}
      />
    ))}

    {chibiHead(TREX_P)}
    <ellipse cx={MID} cy={60} rx={24} ry={14} fill={TREX_P.skin} {...line} />
    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 8}
        cy={54}
        rx={3.4}
        ry={2.5}
        fill={TREX_P.skinDeep}
      />
    ))}

    <Mouth
      p={TREX_P}
      upper={[82, 92, 102, 112].map((x) => (
        <Tooth key={x} x={x} y={65} w={6} h={8} />
      ))}
      lower={[85, 95, 105, 115].map((x) => (
        <Tooth key={x} x={x} y={68} w={5} h={-7} />
      ))}
    />
    <Face eyeY={44} spread={18} />
  </>
);

// ---------------------------------------------------------------------------------------

const TIGER_P: Palette = { skin: "#F0983C", skinDeep: "#C7701C", belly: "#FFE0B8" };

export const ChibiTiger = () => (
  <>
    <Body
      p={TIGER_P}
      tail={
        <>
          <path
            d="M 136 126 Q 178 122 186 88"
            fill="none"
            stroke={INK}
            strokeWidth={17}
            strokeLinecap="round"
          />
          <path
            d="M 136 126 Q 178 122 186 88"
            fill="none"
            stroke={TIGER_P.skin}
            strokeWidth={11}
            strokeLinecap="round"
          />
        </>
      }
    />

    <TopEars p={TIGER_P} x={31} y={17} />
    {chibiHead(TIGER_P)}

    {/* Stripes. The one cue that separates a tiger from every other orange animal. */}
    {[-22, 0, 22].map((dx) => (
      <path
        key={dx}
        d={`M ${MID + dx - 5} 14 Q ${MID + dx} 24 ${MID + dx + 5} 14`}
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ))}
    {[-1, 1].map((s) => (
      <path
        key={s}
        d={`M ${MID + s * 40} 40 Q ${MID + s * 30} 46 ${MID + s * 40} 52`}
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ))}

    <ellipse cx={MID} cy={60} rx={27} ry={15} fill={TIGER_P.belly} {...line} />
    <path
      d={`M ${MID - 7} 55 Q ${MID} 61 ${MID + 7} 55`}
      fill={INK}
      stroke={INK}
      strokeWidth={3}
    />

    <Mouth
      p={TIGER_P}
      upper={[88, 106].map((x) => (
        <Tooth key={x} x={x} y={65} w={6} h={8} />
      ))}
    />

    {/* Whiskers. */}
    {[-1, 1].map((s) =>
      [0, 1].map((k) => (
        <path
          key={`${s}-${k}`}
          d={`M ${MID + s * 24} ${58 + k * 6} L ${MID + s * 48} ${52 + k * 11}`}
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      )),
    )}

    <Face eyeY={44} spread={18} cheeks={false} />
  </>
);

// ---------------------------------------------------------------------------------------

const LION_P: Palette = { skin: "#F0B44C", skinDeep: "#C98A26", belly: "#FFE9C4" };
const MANE = "#B4661F";

export const ChibiLion = () => (
  <>
    <Body
      p={LION_P}
      tail={
        <>
          <path
            d="M 136 126 Q 180 124 188 92"
            fill="none"
            stroke={INK}
            strokeWidth={15}
            strokeLinecap="round"
          />
          <path
            d="M 136 126 Q 180 124 188 92"
            fill="none"
            stroke={LION_P.skin}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <circle cx={188} cy={88} r={11} fill={MANE} {...line} />
        </>
      }
    />

    {/*
      The mane is the lion. It is drawn as a ring of overlapping lobes behind the head
      rather than a spiky star — spikes read as danger, and this animal is applauding.
    */}
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return (
        <circle
          key={i}
          cx={MID + Math.cos(a) * 44}
          cy={50 + Math.sin(a) * 42}
          r={17}
          fill={MANE}
          stroke={INK}
          strokeWidth={4}
        />
      );
    })}
    <circle cx={MID} cy={50} r={46} fill={MANE} stroke="none" />

    <TopEars p={LION_P} x={34} y={20} />
    {chibiHead(LION_P)}

    <ellipse cx={MID} cy={60} rx={26} ry={15} fill={LION_P.belly} {...line} />
    <path
      d={`M ${MID - 7} 55 Q ${MID} 61 ${MID + 7} 55`}
      fill={INK}
      stroke={INK}
      strokeWidth={3}
    />

    <Mouth p={LION_P} upper={[88, 106].map((x) => (
      <Tooth key={x} x={x} y={65} w={6} h={8} />
    ))} />
    <Face eyeY={44} spread={18} cheeks={false} />
  </>
);

// ---------------------------------------------------------------------------------------

const MONKEY_P: Palette = { skin: "#A9713F", skinDeep: "#82552C", belly: "#E8C79A" };
const MONKEY_FACE = "#E8C79A";

export const ChibiMonkey = () => (
  <>
    <Body
      p={MONKEY_P}
      tail={
        <>
          <path
            d="M 134 128 Q 176 136 180 106 Q 182 88 166 92"
            fill="none"
            stroke={INK}
            strokeWidth={15}
            strokeLinecap="round"
          />
          <path
            d="M 134 128 Q 176 136 180 106 Q 182 88 166 92"
            fill="none"
            stroke={MONKEY_P.skin}
            strokeWidth={9}
            strokeLinecap="round"
          />
        </>
      }
    />

    {/* Big ears on the SIDES, not the top. That is the monkey cue. */}
    {[-1, 1].map((s) => (
      <g key={s}>
        <circle cx={MID + s * 48} cy={52} r={17} fill={MONKEY_P.skin} {...line} />
        <circle cx={MID + s * 48} cy={52} r={9} fill={MONKEY_P.skinDeep} stroke="none" />
      </g>
    ))}

    {chibiHead(MONKEY_P)}

    {/* Light face patch — the other half of the monkey cue. */}
    <ellipse cx={MID} cy={56} rx={34} ry={31} fill={MONKEY_FACE} {...line} />
    {/* Fringe. */}
    <path
      d={`M ${MID - 32} 30 Q ${MID - 16} 14 ${MID} 26 Q ${MID + 16} 14 ${MID + 32} 30`}
      fill={MONKEY_P.skinDeep}
      stroke={INK}
      strokeWidth={4}
      strokeLinejoin="round"
    />

    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 7}
        cy={58}
        rx={3.4}
        ry={4}
        fill={MONKEY_P.skinDeep}
      />
    ))}

    <Mouth p={{ ...MONKEY_P, skin: MONKEY_FACE }} />
    <Face eyeY={46} spread={15} r={12} browY={30} cheeks={false} />
  </>
);

// ---------------------------------------------------------------------------------------

const COW_P: Palette = { skin: "#FBF6EE", skinDeep: "#D9CFC0", belly: "#FFFFFF" };
const COW_SPOT = "#3A3347";
const COW_SNOUT = "#F4A9B4";
const HORN = "#E4D3A8";

export const ChibiCow = () => (
  <>
    <Body
      p={COW_P}
      tail={
        <>
          <path
            d="M 136 122 Q 176 118 184 92"
            fill="none"
            stroke={INK}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d="M 136 122 Q 176 118 184 92"
            fill="none"
            stroke={COW_P.skin}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <circle cx={184} cy={88} r={10} fill={COW_SPOT} {...line} />
        </>
      }
    />

    {/* Body patch, so it is a cow from the neck down too. */}
    <ellipse cx={MID - 22} cy={112} rx={14} ry={11} fill={COW_SPOT} stroke="none" />

    {/* Horns behind, ears below them. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`horn${s}`}
        cx={MID + s * 34}
        cy={12}
        rx={12}
        ry={9}
        fill={HORN}
        {...line}
      />
    ))}
    {[-1, 1].map((s) => (
      <ellipse
        key={`ear${s}`}
        cx={MID + s * 47}
        cy={34}
        rx={16}
        ry={11}
        fill={COW_P.skinDeep}
        {...line}
      />
    ))}

    {chibiHead(COW_P)}

    {/* One eye patch, off-centre. Asymmetry is what makes it read as markings rather
        than as a mask. */}
    <ellipse cx={MID - 22} cy={36} rx={20} ry={17} fill={COW_SPOT} stroke="none" />

    {/* The big pink snout is the cow. */}
    <ellipse cx={MID} cy={62} rx={30} ry={19} fill={COW_SNOUT} {...line} />
    {[-1, 1].map((s) => (
      <ellipse
        key={s}
        cx={MID + s * 12}
        cy={58}
        rx={4.5}
        ry={5.5}
        fill="#C97C89"
      />
    ))}

    <Mouth p={{ ...COW_P, skin: COW_SNOUT }} />
    <Face eyeY={40} spread={20} r={12} browY={22} cheeks={false} />
  </>
);

// ---------------------------------------------------------------------------------------
