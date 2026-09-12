/**
 * The memory game: which animals are on the board, and where.
 *
 * DATA AND RULES ONLY, no JSX and no DOM — the same split animals.ts makes, and for the same
 * reason: this is the part worth reasoning about on its own, and the part a test can reach
 * without a browser. components/Memory.tsx owns the screen.
 *
 * WHY THIS IS A SCREEN AND NOT A FIFTH TRACK. Every `Track` runs one engine over the token
 * model (see tokens.ts): a block is dragged into the hole that matches it. Nothing here drags,
 * there are no holes, and a card is not a token — it is one of a PAIR, and its meaning is
 * entirely about the other one. Bolting it onto the track engine would mean a token kind whose
 * "hole" is another token, which is not what that abstraction says. So it sits beside the
 * animal park: its own screen, reached from the picker, holding no progress.
 *
 * NO SCORE, NO TIMER, NO FAIL STATE, for the same reason the park has none. A wrong pair here
 * costs a two-year-old nothing but the second it takes to turn the cards back, and the whole
 * activity is guessing. A move counter would be the one thing on the screen that says "you
 * could be doing this better", which at this age reliably stops the guessing altogether.
 *
 * THE ARTWORK AND THE AUDIO ARE ALREADY HERE. Sixteen animals are drawn in critters/zoo.tsx for
 * the park, each has a recorded noise clip, and the praise and nudge pools are shared with the
 * four games. That is most of why this game is small: it adds rules and a layout, not assets.
 */

import { ANIMALS, type AnimalId } from "./animals";

/**
 * How many pairs each board has, in the order they are played.
 *
 * A RAMP RATHER THAN A SETTING, because the person holding the tablet should not have to choose
 * a difficulty for a child whose memory span they are in the middle of discovering. Three pairs
 * is findable by a two-year-old; six is a real task for a five-year-old. Finishing a board moves
 * up one and the last one repeats, so a child settles at their own level by playing rather than
 * by anyone picking.
 *
 * These three counts and no others, because each has to tile a rectangle without a ragged last
 * row in BOTH stages — see the `cols` tables in stage.ts. Six cards go 3x2 or 2x3, eight go 4x2
 * or 2x4, twelve go 4x3 or 3x4. Five pairs would leave a hole in the grid on every layout.
 */
export const PAIR_STEPS = [3, 4, 6] as const;

/** One card. `id` is what it shows; `key` is which of the two copies it is. */
export type Card = {
  /** Stable and unique across the board, so React keys and "which did I tap" are the same thing. */
  key: number;
  id: AnimalId;
};

/**
 * `count` distinct animals, preferring ones that were not on the previous board.
 *
 * The preference is not a guarantee, and it is written to degrade rather than fail: with sixteen
 * animals and at most six pairs there is always enough left over, but a roster trimmed to seven
 * would quietly start repeating rather than throwing halfway through a child's turn.
 *
 * Same intent as `pickIds` in components/Animals.tsx — a fresh board should look fresh — and
 * deliberately not shared with it. That one also has to avoid what is currently on screen, which
 * is a different question from what was on the last board.
 */
export const pickAnimals = (
  count: number,
  avoid: readonly AnimalId[],
): AnimalId[] => {
  const ids = ANIMALS.map((a) => a.id) as AnimalId[];
  const fresh = ids.filter((id) => !avoid.includes(id));
  const pool = fresh.length >= count ? fresh : ids;

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

/**
 * A shuffled board: two of each animal, in random positions.
 *
 * THE SHUFFLE IS OVER THE WHOLE DECK, not over pair slots. An earlier version placed each pair
 * by picking two free cells, which is the obvious way to write it and puts the two copies close
 * together far more often than chance does — on a 3x2 board a third of pairs landed adjacent,
 * and a pair you can see at once is not a pair you had to remember.
 *
 * Keys are positional, so `deck[i].key === i`. That is relied on nowhere and worth keeping true
 * anyway: it makes a board dumpable in a test and readable in a debugger.
 */
export const makeDeck = (pairs: number, avoid: readonly AnimalId[]): Card[] => {
  const chosen = pickAnimals(pairs, avoid);
  const ids = [...chosen, ...chosen];

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  return ids.map((id, key) => ({ key, id }));
};

/** The distinct animals on a board, for the next board to avoid. */
export const deckAnimals = (deck: readonly Card[]): AnimalId[] => [
  ...new Set(deck.map((c) => c.id)),
];

/**
 * How long two non-matching cards stay face up before turning back, in ms.
 *
 * The one number in this file worth tuning on a real child. Too short and a child who tapped the
 * second card while still looking at the first never sees what they turned over, which makes the
 * game unlearnable rather than hard. Too long and they are sitting still, which at two is the
 * same as the game being over. A second and a bit is enough to name both out loud, which is what
 * an adult playing along will do.
 */
export const MISMATCH_HOLD = 1150;

/** How long a matched pair celebrates before the board is checked for completion. */
export const MATCH_HOLD = 520;
