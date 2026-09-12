import type { ReactElement } from "react";

import {
  Arms,
  Face,
  INK,
  Legs,
  MID,
  Mouth,
  type Palette,
  Tail,
  Tooth,
  line,
} from "./kit";
import { DISTINCT, type Parts } from "./distinct";
import type { AnimalId } from "../animals";

/**
 * The seven animals that exist only in the animal park, drawn in the same style as the five
 * reward animals so the app has one cast rather than two.
 *
 * Same rules as distinct.tsx, and they are not negotiable if these are to sit next to those
 * five without looking pasted in:
 *
 *   - Authored in a 200x170 box, symmetric about MID (x=100). Head roughly y=10..90, body
 *     y=95..168.
 *   - SILHOUETTE carries the recognition, not detail. A child names an animal from its
 *     outline: the horse is its long muzzle and up-ears, the croc is a snout with no forehead,
 *     the chicken is a comb. Get the outline wrong and no amount of markings will save it.
 *   - Everything faces the viewer with two centred-pupil eyes, because "looking at you" is the
 *     entire reason these are worth drawing.
 *   - Shared parts come from kit.tsx. A species file supplies only what actually differs.
 *
 * The birds skip `Mouth` entirely. It draws a dark interior with a dropping jaw and a tongue,
 * which is a mammal's mouth; a beak is a solid shape and gets drawn directly.
 */

// ======================================================================================
// HORSE — a long muzzle and tall ears. Nothing else in the park is vertical.
// ======================================================================================

const HORSE: Palette = { skin: "#C98A52", skinDeep: "#A06B39", belly: "#EAD3B4" };
const MANE_H = "#5C4033";

const HorseHead = () => (
  <>
    {/*
      Tall pointed ears, standing well clear of the skull (top y=15).

      Sized up and moved out after the first pass: at 26..32 they were half inside the head and
      the horse read as a camel. The ears and the long muzzle are the two things carrying it.
    */}
    {[-1, 1].map((s) => (
      <path
        key={`ear${s}`}
        d={`M ${MID + s * 17} 24 Q ${MID + s * 22} -8 ${MID + s * 34} -6 Q ${MID + s * 34} 16 ${MID + s * 29} 30 Z`}
        fill={HORSE.skinDeep}
        transform={`rotate(${s * 12} ${MID + s * 24} 18)`}
        {...line}
      />
    ))}

    {/* Mane: a fringe over the crown, drawn before the skull so it tucks behind it. */}
    <path
      d={`M ${MID - 26} 30 Q ${MID} 0 ${MID + 26} 30 Q ${MID} 16 ${MID - 26} 30 Z`}
      fill={MANE_H}
      {...line}
    />

    {/* TALLER than wide — the opposite of the cow, on purpose. */}
    <ellipse cx={MID} cy={48} rx={30} ry={33} fill={HORSE.skin} {...line} />

    {/* Blaze down the face. Reads as a horse marking and breaks up the flat fill. */}
    <ellipse cx={MID} cy={52} rx={9} ry={26} fill={HORSE.belly} stroke="none" />

    {/* The muzzle, long and low. */}
    <ellipse cx={MID} cy={76} rx={22} ry={17} fill={HORSE.belly} {...line} />
    {[-1, 1].map((s) => (
      <ellipse key={s} cx={MID + s * 9} cy={71} rx={4} ry={5} fill={HORSE.skinDeep} />
    ))}

    <Mouth p={{ ...HORSE, skin: HORSE.belly }} dy={12} sx={0.82} />
    <Face eyeY={44} spread={19} r={11} browY={28} cheeks={false} />
  </>
);

const HorseBody = () => (
  <>
    <Tail
      d="M 132 118 Q 172 116 184 82"
      p={{ ...HORSE, skinDeep: MANE_H }}
      w={17}
    />
    <Legs p={HORSE} spread={25} rx={13} ry={17} />
    <ellipse cx={MID} cy={124} rx={42} ry={28} fill={HORSE.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={22} ry={17} fill={HORSE.belly} stroke="none" />
    <Arms p={HORSE} dy={4} scale={0.9} />
  </>
);

// ======================================================================================
// DOG — floppy ears and a tongue out. The friendliest silhouette in the park.
// ======================================================================================

const DOG: Palette = { skin: "#D9A05B", skinDeep: "#B07C3A", belly: "#F6E3C4" };
const NOSE = "#3A3347";

const DogHead = () => (
  <>
    {/* Long floppy ears hanging past the jaw — the whole read. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`ear${s}`}
        cx={MID + s * 42}
        cy={56}
        rx={14}
        ry={26}
        fill={DOG.skinDeep}
        transform={`rotate(${s * 12} ${MID + s * 42} 56)`}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={48} rx={36} ry={30} fill={DOG.skin} {...line} />

    {/* Eye patch over one eye only. Asymmetry reads as a marking. */}
    <ellipse cx={MID - 21} cy={42} rx={16} ry={14} fill={DOG.skinDeep} stroke="none" />

    <ellipse cx={MID} cy={70} rx={24} ry={16} fill={DOG.belly} {...line} />
    <ellipse cx={MID} cy={60} rx={9} ry={7} fill={NOSE} {...line} strokeWidth={3} />

    <Mouth p={{ ...DOG, skin: DOG.belly }} dy={10} sx={0.95} />
    <Face eyeY={44} spread={18} r={11} browY={27} />
  </>
);

const DogBody = () => (
  <>
    {/* Tail up, not down. An upright tail is the difference between pleased and cowed. */}
    <Tail d="M 134 120 Q 168 108 170 78" p={DOG} w={14} />
    <Legs p={DOG} spread={24} rx={14} ry={16} />
    <ellipse cx={MID} cy={124} rx={38} ry={28} fill={DOG.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={22} ry={18} fill={DOG.belly} stroke="none" />
    <Arms p={DOG} dy={4} scale={0.9} />
  </>
);

// ======================================================================================
// CAT — pointed ears and whiskers. Small and neat where the dog is broad.
// ======================================================================================

const CAT: Palette = { skin: "#9AA6B8", skinDeep: "#76839A", belly: "#E8EDF4" };

const CatHead = () => (
  <>
    {/* Sharp triangular ears with a pink inner. Nothing else in the park has points. */}
    {[-1, 1].map((s) => (
      <g key={`ear${s}`}>
        <polygon
          points={`${MID + s * 14},28 ${MID + s * 34},4 ${MID + s * 38},32`}
          fill={CAT.skin}
          {...line}
        />
        <polygon
          points={`${MID + s * 19},27 ${MID + s * 31},12 ${MID + s * 33},28`}
          fill="#E9A7B4"
          stroke="none"
        />
      </g>
    ))}

    <ellipse cx={MID} cy={50} rx={33} ry={29} fill={CAT.skin} {...line} />

    {/* Forehead stripes — a tabby, which is the cat a child draws. */}
    {[-1, 0, 1].map((k) => (
      <path
        key={`st${k}`}
        d={`M ${MID + k * 11} 26 L ${MID + k * 13} 38`}
        stroke={CAT.skinDeep}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    ))}

    <ellipse cx={MID} cy={68} rx={19} ry={13} fill={CAT.belly} {...line} />
    <path
      d={`M ${MID - 6} 60 L ${MID + 6} 60 L ${MID} 67 Z`}
      fill="#E9A7B4"
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />

    {/* Whiskers. Three a side, and they are most of what says "cat" at tile size. */}
    {[-1, 1].map((s) =>
      [-6, 1, 8].map((dy) => (
        <path
          key={`w${s}${dy}`}
          d={`M ${MID + s * 20} ${66 + dy} L ${MID + s * 46} ${62 + dy * 1.6}`}
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      )),
    )}

    <Mouth p={{ ...CAT, skin: CAT.belly }} dy={9} sx={0.7} />
    <Face eyeY={46} spread={17} r={12} browY={29} />
  </>
);

const CatBody = () => (
  <>
    {/* Curled up over the back, which is the cat pose. */}
    <Tail d="M 132 128 Q 176 126 172 88" p={CAT} w={13} />
    <Legs p={CAT} spread={22} rx={13} ry={15} />
    <ellipse cx={MID} cy={126} rx={34} ry={26} fill={CAT.skin} {...line} />
    <ellipse cx={MID} cy={133} rx={20} ry={16} fill={CAT.belly} stroke="none" />
    <Arms p={CAT} dy={8} scale={0.85} />
  </>
);

// ======================================================================================
// DUCK — a flat orange bill, and no ears at all. The bill is the whole animal.
// ======================================================================================

const DUCK: Palette = { skin: "#FFD95E", skinDeep: "#E0B02F", belly: "#FFF3C4" };
const BILL = "#F2913D";
const BILL_DEEP = "#C9701F";

const DuckHead = () => (
  <>
    {/* A tuft, so the top of the head is not a bare arc. */}
    <path
      d={`M ${MID - 6} 22 Q ${MID + 2} 2 ${MID + 14} 12 Q ${MID + 6} 16 ${MID + 6} 24 Z`}
      fill={DUCK.skinDeep}
      {...line}
    />

    <ellipse cx={MID} cy={48} rx={32} ry={30} fill={DUCK.skin} {...line} />

    {/* The bill: wide, flat, rounded, and sitting proud of the face. */}
    <ellipse cx={MID} cy={72} rx={28} ry={13} fill={BILL} {...line} />
    <path
      d={`M ${MID - 26} 74 Q ${MID} 84 ${MID + 26} 74`}
      stroke={BILL_DEEP}
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
    {[-1, 1].map((s) => (
      <circle key={s} cx={MID + s * 11} cy={66} r={2.6} fill={BILL_DEEP} />
    ))}

    <Face eyeY={44} spread={17} r={12} browY={27} cheeks={false} />
  </>
);

const DuckBody = () => (
  <>
    {/* Webbed feet, which have to be the bill's colour or the bill reads as a mistake. */}
    {[-1, 1].map((s) => (
      <path
        key={`ft${s}`}
        d={`M ${MID + s * 18} 148 L ${MID + s * 40} 160 L ${MID + s * 6} 160 Z`}
        fill={BILL}
        {...line}
      />
    ))}
    <ellipse cx={MID} cy={124} rx={40} ry={30} fill={DUCK.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={24} ry={20} fill={DUCK.belly} stroke="none" />
    {/* A folded wing rather than clapping arms — a duck has no hands. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`wg${s}`}
        cx={MID + s * 34}
        cy={122}
        rx={11}
        ry={19}
        fill={DUCK.skinDeep}
        transform={`rotate(${s * -14} ${MID + s * 34} 122)`}
        {...line}
      />
    ))}
  </>
);

// ======================================================================================
// CHICKEN — the comb. Three red bumps and it can be nothing else.
// ======================================================================================

const HEN: Palette = { skin: "#FDFBF5", skinDeep: "#E2D9C6", belly: "#FFFFFF" };
const COMB = "#E23B3B";
const COMB_DEEP = "#B32226";

const ChickenHead = () => (
  <>
    {/*
      Comb, drawn before the skull so it sits behind the crown.

      It has to CLEAR the skull, which tops out at y=22 (cy 50, ry 28). The first version put
      these at cy=22 and they were swallowed whole — the one feature that makes a chicken a
      chicken, invisible. Sitting them at 10-14 leaves most of each bump proud of the head.
    */}
    {[-15, 0, 15].map((dx, i) => (
      <circle
        key={dx}
        cx={MID + dx}
        cy={i === 1 ? 8 : 14}
        r={i === 1 ? 13 : 11}
        fill={COMB}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={50} rx={30} ry={28} fill={HEN.skin} {...line} />

    {/* Wattle: two lobes under the beak. Comb without wattle reads as a hat. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`wt${s}`}
        cx={MID + s * 8}
        cy={80}
        rx={7}
        ry={12}
        fill={COMB_DEEP}
        {...line}
      />
    ))}

    {/* Small pointed beak, not a bill. This is what separates it from the duck. */}
    <polygon
      points={`${MID - 12},64 ${MID + 12},64 ${MID},80`}
      fill={BILL}
      {...line}
    />

    <Face eyeY={46} spread={16} r={11} browY={30} cheeks={false} />
  </>
);

const ChickenBody = () => (
  <>
    {[-1, 1].map((s) => (
      <path
        key={`ft${s}`}
        d={`M ${MID + s * 14} 150 L ${MID + s * 34} 162 M ${MID + s * 14} 150 L ${MID + s * 16} 164 M ${MID + s * 14} 150 L ${MID - s * 2} 162`}
        stroke={BILL_DEEP}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    ))}
    {/* Tail feathers fanned up at the back. */}
    {[0, 1, 2].map((k) => (
      <path
        key={`tf${k}`}
        d={`M 130 120 Q ${162 + k * 6} ${108 - k * 10} ${150 + k * 4} ${94 - k * 12}`}
        stroke={INK}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
    ))}
    {[0, 1, 2].map((k) => (
      <path
        key={`tfi${k}`}
        d={`M 130 120 Q ${162 + k * 6} ${108 - k * 10} ${150 + k * 4} ${94 - k * 12}`}
        stroke={HEN.skinDeep}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
    ))}
    <ellipse cx={MID} cy={124} rx={36} ry={28} fill={HEN.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={21} ry={18} fill={HEN.belly} stroke="none" />
    {[-1, 1].map((s) => (
      <ellipse
        key={`wg${s}`}
        cx={MID + s * 31}
        cy={122}
        rx={10}
        ry={17}
        fill={HEN.skinDeep}
        transform={`rotate(${s * -12} ${MID + s * 31} 122)`}
        {...line}
      />
    ))}
  </>
);

// ======================================================================================
// GOAT — horns curving BACK, and a beard. The beard is what stops it being a sheep.
// ======================================================================================

const GOAT: Palette = { skin: "#F2EDE2", skinDeep: "#D3C9B6", belly: "#FFFFFF" };
const GOAT_HORN = "#B9A88A";

const GoatHead = () => (
  <>
    {/*
      Swept back and OUT, not up like the cow's stubs.

      Pulled well clear of the skull (which tops out at y=20) after the first version sat inside
      its outline and read as a pair of small bumps — leaving a white animal with floppy ears,
      which is a sheep. The horns and the beard are the entire difference.
    */}
    {[-1, 1].map((s) => (
      <path
        key={`hn${s}`}
        d={`M ${MID + s * 14} 24 Q ${MID + s * 30} -6 ${MID + s * 50} 4 Q ${MID + s * 32} 6 ${MID + s * 23} 28 Z`}
        fill={GOAT_HORN}
        {...line}
      />
    ))}

    {/* Floppy ears low and wide, below the horns. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`ear${s}`}
        cx={MID + s * 40}
        cy={48}
        rx={16}
        ry={9}
        fill={GOAT.skinDeep}
        transform={`rotate(${s * 24} ${MID + s * 40} 48)`}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={50} rx={28} ry={30} fill={GOAT.skin} {...line} />
    <ellipse cx={MID} cy={74} rx={18} ry={14} fill={GOAT.belly} {...line} />
    {[-1, 1].map((s) => (
      <ellipse key={s} cx={MID + s * 7} cy={70} rx={3.4} ry={4} fill={GOAT.skinDeep} />
    ))}

    <Mouth p={{ ...GOAT, skin: GOAT.belly }} dy={12} sx={0.7} />

    {/* The beard, drawn last so it hangs in front of the chin. */}
    <path
      d={`M ${MID - 9} 86 Q ${MID} 108 ${MID + 9} 86 Z`}
      fill={GOAT.skinDeep}
      {...line}
    />

    <Face eyeY={46} spread={17} r={11} browY={29} cheeks={false} />
  </>
);

const GoatBody = () => (
  <>
    <Tail d="M 130 118 Q 148 110 150 98" p={GOAT} w={11} />
    <Legs p={GOAT} spread={23} rx={12} ry={16} />
    <ellipse cx={MID} cy={126} rx={36} ry={27} fill={GOAT.skin} {...line} />
    <ellipse cx={MID} cy={133} rx={21} ry={17} fill={GOAT.belly} stroke="none" />
    <Arms p={GOAT} dy={6} scale={0.85} />
  </>
);

// ======================================================================================
// CROCODILE — no forehead and no ears. A snout with eyes on top of it.
// ======================================================================================

const CROC: Palette = { skin: "#6FBF73", skinDeep: "#48924F", belly: "#CDE8A9" };

const CrocHead = () => (
  <>
    {/* Very low, very wide skull. Flatter than the dinosaur's, which is the difference. */}
    <ellipse cx={MID} cy={38} rx={38} ry={19} fill={CROC.skin} {...line} />

    {/* Eyes ride on bumps ON TOP of the skull, the way a crocodile's do in water. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`bump${s}`}
        cx={MID + s * 21}
        cy={26}
        rx={13}
        ry={11}
        fill={CROC.skin}
        {...line}
      />
    ))}

    {/* The snout: long, blunt, and lined with teeth. */}
    <ellipse cx={MID} cy={66} rx={34} ry={20} fill={CROC.skin} {...line} />
    {[-1, 1].map((s) => (
      <ellipse key={s} cx={MID + s * 13} cy={54} rx={3.4} ry={2.6} fill={CROC.skinDeep} />
    ))}

    {/* Scutes along the snout ridge. */}
    {[-1, 1].map((s) => (
      <path
        key={`sc${s}`}
        d={`M ${MID + s * 6} 50 L ${MID + s * 10} 44 L ${MID + s * 14} 50`}
        stroke={CROC.skinDeep}
        strokeWidth={3.5}
        fill="none"
      />
    ))}

    <Mouth
      p={CROC}
      dy={9}
      sx={1.24}
      upper={[76, 86, 96, 106, 116].map((x) => (
        <Tooth key={x} x={x} y={64} w={6} h={10} />
      ))}
      lower={[79, 89, 99, 109, 119].map((x) => (
        <Tooth key={x} x={x} y={68} w={5} h={-8} />
      ))}
    />

    <Face eyeY={24} spread={21} r={10} browY={11} cheeks={false} />
  </>
);

const CrocBody = () => (
  <>
    <Tail d="M 136 126 Q 180 124 190 92" p={CROC} w={20} />
    {/* Ridged back — triangles along the spine, the reptile signature. */}
    {[0, 1, 2, 3].map((k) => (
      <polygon
        key={k}
        points={`${132 + k * 14},${118 - k * 6} ${140 + k * 14},${104 - k * 8} ${148 + k * 14},${118 - k * 6}`}
        fill={CROC.skinDeep}
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    ))}
    <Legs p={CROC} spread={26} rx={15} ry={14} />
    <ellipse cx={MID} cy={126} rx={42} ry={26} fill={CROC.skin} {...line} />
    <ellipse cx={MID} cy={133} rx={25} ry={17} fill={CROC.belly} stroke="none" />
    <Arms p={CROC} dy={10} scale={0.82} />
  </>
);

// ======================================================================================
// BEE — the only one with wings and stripes, and the only one that is tiny.
// ======================================================================================

const BEE: Palette = { skin: "#FFC53D", skinDeep: "#D99A16", belly: "#FFE9A8" };
const STRIPE = "#3A3347";
const WING = "#DCEBF7";

const BeeHead = () => (
  <>
    {/* Antennae with a bobble each, well clear of the skull (top y=22). */}
    {[-1, 1].map((s) => (
      <g key={`ant${s}`}>
        <path
          d={`M ${MID + s * 12} 26 Q ${MID + s * 22} 6 ${MID + s * 30} 2`}
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={MID + s * 31} cy={2} r={6} fill={STRIPE} {...line} strokeWidth={3} />
      </g>
    ))}

    <ellipse cx={MID} cy={50} rx={32} ry={28} fill={BEE.skin} {...line} />

    <Mouth p={{ ...BEE, skin: BEE.skin }} dy={10} sx={0.72} />
    <Face eyeY={44} spread={17} r={12} browY={27} />
  </>
);

const BeeBody = () => (
  <>
    {/*
      Wings behind the body, one pair, angled up and out. Translucent so the stripes read
      through them — an opaque wing at this size just looks like a missing chunk of animal.
    */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`wing${s}`}
        cx={MID + s * 44}
        cy={100}
        rx={17}
        ry={30}
        fill={WING}
        opacity={0.85}
        transform={`rotate(${s * 32} ${MID + s * 44} 100)`}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={124} rx={40} ry={30} fill={BEE.skin} {...line} />

    {/*
      Stripes, clipped to the abdomen so they stop at its edge instead of running off into the
      background. Two bands is enough: three at this size turns the body into a barcode.
    */}
    <defs>
      <clipPath id="bee-abdomen">
        <ellipse cx={MID} cy={124} rx={40} ry={30} />
      </clipPath>
    </defs>
    <g clipPath="url(#bee-abdomen)">
      {[112, 136].map((y) => (
        <rect key={y} x={MID - 42} y={y} width={84} height={13} fill={STRIPE} />
      ))}
    </g>

    {/* Sting, so the silhouette ends in a point rather than an egg. */}
    <polygon
      points={`${MID - 7},152 ${MID + 7},152 ${MID},168`}
      fill={STRIPE}
      {...line}
      strokeWidth={3}
    />

    <Arms p={BEE} dy={4} scale={0.8} />
  </>
);

// ======================================================================================
// OWL — all head and eyes. The eyes are twice anything else's, and that IS the owl.
// ======================================================================================

const OWL: Palette = { skin: "#B08968", skinDeep: "#8A6A4F", belly: "#EADBC6" };
const OWL_BEAK = "#F2913D";

const OwlHead = () => (
  <>
    {/* Ear tufts, the corners of the head rather than separate ears. */}
    {[-1, 1].map((s) => (
      <polygon
        key={`tuft${s}`}
        points={`${MID + s * 16},26 ${MID + s * 34},0 ${MID + s * 40},28`}
        fill={OWL.skinDeep}
        {...line}
      />
    ))}

    {/* Wide and low, and wider than the body — an owl has no neck to speak of. */}
    <ellipse cx={MID} cy={50} rx={42} ry={34} fill={OWL.skin} {...line} />

    {/* Facial discs. These are what make the eyes read as an owl's rather than as big eyes. */}
    {[-1, 1].map((s) => (
      <circle
        key={`disc${s}`}
        cx={MID + s * 19}
        cy={48}
        r={21}
        fill={OWL.belly}
        {...line}
        strokeWidth={3}
      />
    ))}

    {/* Beak: small, downward, between the discs. Drawn before the eyes so they overlap it. */}
    <polygon
      points={`${MID - 8},52 ${MID + 8},52 ${MID},72`}
      fill={OWL_BEAK}
      {...line}
      strokeWidth={3}
    />

    {/* r=16 against the usual 11-13. The one place in the cast where the eyes dominate. */}
    <Face eyeY={47} spread={19} r={16} browY={22} cheeks={false} />
  </>
);

const OwlBody = () => (
  <>
    {/* Feet on the branch it is not standing on. Beak colour, or the beak reads as an error. */}
    {[-1, 1].map((s) => (
      <path
        key={`ft${s}`}
        d={`M ${MID + s * 13} 150 L ${MID + s * 30} 162 M ${MID + s * 13} 150 L ${MID + s * 14} 164 M ${MID + s * 13} 150 L ${MID - s * 3} 162`}
        stroke={OWL_BEAK}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    ))}

    <ellipse cx={MID} cy={124} rx={34} ry={28} fill={OWL.skin} {...line} />
    <ellipse cx={MID} cy={130} rx={20} ry={19} fill={OWL.belly} stroke="none" />

    {/* Folded wings down the sides, not clapping arms — this one has no hands. */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`wg${s}`}
        cx={MID + s * 32}
        cy={122}
        rx={11}
        ry={22}
        fill={OWL.skinDeep}
        transform={`rotate(${s * -8} ${MID + s * 32} 122)`}
        {...line}
      />
    ))}
  </>
);

// ======================================================================================
// ELEPHANT — ears the size of its head, and a trunk. Nothing else is close.
// ======================================================================================

const ELE: Palette = { skin: "#A8AEB8", skinDeep: "#828A97", belly: "#D6DAE1" };
const TUSK = "#F4EEDC";

const ElephantHead = () => (
  <>
    {/*
      The ears are the animal. Drawn before the skull and nearly as big as it, which is the one
      proportion that has to be right — a small-eared grey animal is a hippo.
    */}
    {[-1, 1].map((s) => (
      <ellipse
        key={`ear${s}`}
        cx={MID + s * 42}
        cy={48}
        rx={26}
        ry={31}
        fill={ELE.skinDeep}
        {...line}
      />
    ))}

    <ellipse cx={MID} cy={46} rx={32} ry={30} fill={ELE.skin} {...line} />

    {/* Trunk, hanging and curling forward. Drawn after the head so it lies over the muzzle. */}
    <path
      d={`M ${MID - 11} 60 Q ${MID - 13} 96 ${MID + 4} 100 Q ${MID + 16} 102 ${MID + 15} 88`}
      fill="none"
      stroke={INK}
      strokeWidth={22}
      strokeLinecap="round"
    />
    <path
      d={`M ${MID - 11} 60 Q ${MID - 13} 96 ${MID + 4} 100 Q ${MID + 16} 102 ${MID + 15} 88`}
      fill="none"
      stroke={ELE.skin}
      strokeWidth={15}
      strokeLinecap="round"
    />
    {/* Rings along the trunk, so it reads as a trunk rather than a grey tube. */}
    {[72, 84].map((y, i) => (
      <path
        key={y}
        d={`M ${MID - 15 + i * 3} ${y} L ${MID - 5 + i * 5} ${y + 2}`}
        stroke={ELE.skinDeep}
        strokeWidth={3}
        strokeLinecap="round"
      />
    ))}

    {/* Small tusks either side of the trunk. */}
    {[-1, 1].map((s) => (
      <path
        key={`tusk${s}`}
        d={`M ${MID + s * 22} 64 Q ${MID + s * 27} 80 ${MID + s * 20} 86`}
        fill="none"
        stroke={TUSK}
        strokeWidth={7}
        strokeLinecap="round"
      />
    ))}

    <Face eyeY={42} spread={19} r={10} browY={26} cheeks={false} />
  </>
);

const ElephantBody = () => (
  <>
    <Tail d="M 132 124 Q 156 122 158 104" p={ELE} w={10} />
    <Legs p={ELE} spread={28} rx={17} ry={17} />
    {/* Bulky: this is the biggest body in the cast, and it should look it. */}
    <ellipse cx={MID} cy={124} rx={46} ry={30} fill={ELE.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={26} ry={19} fill={ELE.belly} stroke="none" />
    <Arms p={ELE} dy={8} scale={0.88} />
  </>
);

// ======================================================================================
// BEAR — small round ears ON TOP of a round head. That is what separates it from the dog.
// ======================================================================================

const BEAR: Palette = { skin: "#8D6E52", skinDeep: "#6B5340", belly: "#D8BE9D" };

const BearHead = () => (
  <>
    {/*
      Ears on TOP of the skull, small and circular. The dog's are long and hang at the sides; get
      these wrong and the two animals are the same brown shape.
    */}
    {[-1, 1].map((s) => (
      <g key={`ear${s}`}>
        <circle cx={MID + s * 27} cy={20} r={15} fill={BEAR.skin} {...line} />
        <circle cx={MID + s * 27} cy={21} r={7} fill={BEAR.skinDeep} stroke="none" />
      </g>
    ))}

    <ellipse cx={MID} cy={50} rx={36} ry={32} fill={BEAR.skin} {...line} />

    {/* Broad pale muzzle across the lower face, which is the bear's other signature. */}
    <ellipse cx={MID} cy={70} rx={26} ry={18} fill={BEAR.belly} {...line} />
    <ellipse cx={MID} cy={60} rx={10} ry={7} fill={INK} {...line} strokeWidth={3} />

    <Mouth p={{ ...BEAR, skin: BEAR.belly }} dy={12} sx={0.95} />
    <Face eyeY={42} spread={18} r={11} browY={26} />
  </>
);

const BearBody = () => (
  <>
    <Legs p={BEAR} spread={26} rx={16} ry={17} />
    <ellipse cx={MID} cy={124} rx={42} ry={30} fill={BEAR.skin} {...line} />
    <ellipse cx={MID} cy={132} rx={24} ry={20} fill={BEAR.belly} stroke="none" />
    <Arms p={BEAR} dy={4} scale={0.95} />
  </>
);

// ======================================================================================

/**
 * Every animal the park can show: the five already drawn for the rewards, plus these eleven.
 *
 * TYPED AS `Record<AnimalId, Parts>` ON PURPOSE. That is what turns "someone added an animal to
 * ANIMALS and forgot to draw it" from a tile that throws when a child touches it into a compile
 * error. It is also why the five reused entries are listed individually instead of spread in from
 * DISTINCT: a spread of `Record<string, Parts>` satisfies any key check trivially, so it would
 * have quietly defeated the exhaustiveness it looks like it is providing.
 *
 * The reward pool is deliberately NOT widened in return. It stays at the original five, because
 * those have been checked against the clap-and-laugh animation and these seven have not.
 */
export const ZOO_PARTS: Record<AnimalId, Parts> = {
  lion: DISTINCT.lion,
  tiger: DISTINCT.tiger,
  cow: DISTINCT.cow,
  monkey: DISTINCT.monkey,
  trex: DISTINCT.trex,

  horse: { palette: HORSE, Head: HorseHead, Body: HorseBody },
  dog: { palette: DOG, Head: DogHead, Body: DogBody },
  cat: { palette: CAT, Head: CatHead, Body: CatBody },
  duck: { palette: DUCK, Head: DuckHead, Body: DuckBody },
  chicken: { palette: HEN, Head: ChickenHead, Body: ChickenBody },
  goat: { palette: GOAT, Head: GoatHead, Body: GoatBody },
  crocodile: { palette: CROC, Head: CrocHead, Body: CrocBody },
  bee: { palette: BEE, Head: BeeHead, Body: BeeBody },
  owl: { palette: OWL, Head: OwlHead, Body: OwlBody },
  elephant: { palette: ELE, Head: ElephantHead, Body: ElephantBody },
  bear: { palette: BEAR, Head: BearHead, Body: BearBody },
};

/** Head above body, in a 200x170 box. The full figure, since a tile has room for one. */
export const zooArt = (id: AnimalId): (() => ReactElement) => {
  const { Head, Body } = ZOO_PARTS[id];
  return () => (
    <>
      <Body />
      <Head />
    </>
  );
};
