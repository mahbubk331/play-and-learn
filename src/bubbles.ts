/**
 * The bubble game: what gets asked for, how it is worded, and how long each beat holds.
 *
 * DATA AND RULES ONLY, no JSX and no DOM — the same split memory.ts, boxes.ts and animals.ts
 * make. components/Bubbles.tsx owns the screen, and stage.ts owns where the bubbles sit.
 *
 * THIS FILE IS SMALL ON PURPOSE, because almost none of this game is new. It runs the token
 * model (tokens.ts) over the round generator the four tracks use (game.ts): `makeArrangement`
 * draws the distinct tokens that go in the bubbles, `makeRounds` puts them in an order with
 * nothing asked twice running, `MAX_WRONG` and `starsFor` handle the three tries and the score.
 * What is actually different is the VERB — you touch the answer instead of dragging a block to
 * it — and that lives in the component. So what is left for this module is the wording and two
 * durations.
 *
 * A SCREEN AND NOT A FIFTH TRACK, for a reason that is the opposite of the memory board's. There
 * the token model did not fit at all. Here it fits perfectly and the ENGINE does not: a Track is
 * a level list the drag engine runs, and nothing here drags. Its four levels are the four token
 * kinds — see BUBBLE_LEVELS in levels.ts, where the kind is the ramp rather than the subject.
 */

import { tokenLabel, type Token } from "./tokens";

/**
 * How the printed prompt can be phrased.
 *
 * Three verbs rather than one, and never the same twice running, which is the same treatment
 * the praise pool gets and for the same reason: the adult beside the child is the one reading
 * this out, and one fixed sentence read forty times is one the child stops hearing as a
 * question. "Pop" leads because it is the one that describes what to do.
 */
const VERBS = ["Pop", "Find", "Touch"] as const;

export type Verb = (typeof VERBS)[number];

/** A verb, never the one just used. Same shape as `pickPraise` in audio.ts. */
export const pickVerb = (previous: Verb | null): Verb => {
  const pool = VERBS.filter((v) => v !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * The question, written out.
 *
 * FOR THE ADULT, not the child — who cannot read it. It is on screen for the same reason the
 * animal park prints its question: the person holding the tablet otherwise has no idea what was
 * asked and cannot help. What the CHILD gets is the spoken token name, which is all the recorded
 * audio there is; see the note on the spoken cue in components/Bubbles.tsx.
 *
 * Per-kind phrasing, because one template cannot carry all four. "Can you pop the red?" is not a
 * sentence, and "Can you pop the A one?" is not either — a colour is an adjective and a letter
 * is a name, so they need different scaffolding around the same label.
 */
export const promptFor = (token: Token, verb: Verb): string => {
  const label = tokenLabel(token);

  switch (token.kind) {
    // "Red" is an adjective, so it needs something to describe.
    case "color":
      return `Can you ${verb.toLowerCase()} the ${label.toLowerCase()} one?`;
    case "shape":
      return `Can you ${verb.toLowerCase()} the ${label.toLowerCase()}?`;
    case "number":
      return `Can you ${verb.toLowerCase()} the number ${label}?`;
    case "letter":
      return `Can you ${verb.toLowerCase()} the letter ${label}?`;
  }
};

/**
 * How long the burst holds after a bubble pops, in ms.
 *
 * Shorter than the tracks' CORRECT_HOLD, which is 1700 because a critter has to run on and
 * applaud inside it. Nothing runs on here — the reward is the pop itself, which is over in
 * about 120ms of audio — so the beat only has to be long enough for the sparkles to finish and
 * the praise line to be most of the way through. Holding it as long as the tracks do would leave
 * a child looking at a gap where a bubble used to be.
 */
export const POP_HOLD = 1150;

/**
 * How long a wrong tap holds before the next try, in ms.
 *
 * The same 900 the tracks use, and deliberately the same: a mistake should cost as little time
 * as possible, because the faster the board is back in reach the more likely the next thing that
 * happens is another guess.
 */
export const MISS_HOLD = 900;
