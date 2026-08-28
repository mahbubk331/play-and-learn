import type { ReactElement } from "react";

import {
  ChibiCow,
  ChibiLion,
  ChibiMonkey,
  ChibiTiger,
  ChibiTrex,
} from "./chibi";
import { distinctFull, distinctPortrait } from "./distinct";

/**
 * The animal registry, and which drawing of each animal the game actually uses.
 *
 * There are three drawings of every species:
 *
 *   chibi     one big round head on one small round body, for all five. The original, and
 *             the weakest: the head ellipse and the body are IDENTICAL across species, so
 *             only ears and colour distinguish them and side by side they read as one
 *             animal in five hats.
 *   distinct  its own head shape and body proportions — cow widest, lion mane-dominated,
 *             tiger with cheek ruffs, monkey with huge side ears and long arms, dinosaur
 *             with a low skull and a protruding toothed snout.
 *   portrait  the distinct head blown up to fill the frame with the paws clapping in at the
 *             bottom. The most legible of the three, because every feature is twice the size.
 *
 * `STYLE` picks which set is live. All three are kept so they can be compared in the dev
 * gallery at /critters.html rather than argued about.
 */

export type Style = "chibi" | "distinct" | "portrait";

/**
 * Which set the game uses.
 *
 * Chosen after comparing all three side by side in the gallery: portrait is the most legible
 * by a wide margin, because every feature is twice the size — which is what matters on a
 * tablet held at arm's length by someone who cannot read.
 */
export const STYLE: Style = "portrait";

export type Species = {
  id: string;
  /** Spoken/written name. */
  name: string;
  Art: () => ReactElement;
};

const CHIBI: Record<string, () => ReactElement> = {
  trex: ChibiTrex,
  tiger: ChibiTiger,
  lion: ChibiLion,
  monkey: ChibiMonkey,
  cow: ChibiCow,
};

const NAMES: [string, string][] = [
  ["trex", "Dinosaur"],
  ["tiger", "Tiger"],
  ["lion", "Lion"],
  ["monkey", "Monkey"],
  ["cow", "Cow"],
];

export const speciesFor = (style: Style): Species[] =>
  NAMES.map(([id, name]) => ({
    id,
    name,
    Art:
      style === "chibi"
        ? CHIBI[id]
        : style === "portrait"
          ? distinctPortrait(id)
          : distinctFull(id),
  }));

export const SPECIES: Species[] = speciesFor(STYLE);

export const STYLES: Style[] = ["chibi", "distinct", "portrait"];

/**
 * Pick a species, avoiding whatever turned up last.
 *
 * Same reasoning as the round order: a repeat is a wasted surprise. The point of five
 * animals is not knowing which one is coming.
 */
export const pickSpecies = (previousId: string | null): Species => {
  const pool = SPECIES.filter((s) => s.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
};
