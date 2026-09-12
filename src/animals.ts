/**
 * The animal game: who is in it, and what the narrator says about them.
 *
 * DATA ONLY, no JSX, because audio.ts needs this roster to build its clip list and must not end
 * up importing artwork to do it. The drawings live in critters/zoo.tsx and are joined to these
 * entries by id.
 *
 * THIS ONE HAS A RIGHT ANSWER, unlike every earlier version of this screen. The narrator asks for
 * an animal by name, and finding it is the task:
 *
 *   1. "Can you touch the cow?"
 *   2. the child touches the cow  ->  "Good job!"
 *   3. "Can you make the sound the cow makes? Moooo! Moooo!"
 *
 * Which makes step 3 the actual point of the section. Steps 1 and 2 teach the NAME; step 3 asks
 * the child to make a noise out loud, and that is the only thing anywhere in this app that asks
 * them to produce rather than recognise. Nothing can verify they did it, and nothing tries to —
 * the invitation is the whole feature.
 *
 * It still has no score, no levels and no fail state. A wrong touch gets a gentle nudge and the
 * question again; it costs nothing. That is deliberate and it is why this is still not a `Track`:
 * a wrong answer here must not spend a try, because the child is two and the reward for guessing
 * has to stay bigger than the cost of getting it wrong.
 */

export type Animal = {
  id: string;
  /** Printed under the animal, and the name the narrator asks for. */
  name: string;
  /**
   * The noise the narrator invites the child to copy.
   *
   * Onomatopoeia, spelled the way a children's book spells it rather than the way a linguist
   * would. These are the exact strings sent to the voice, so the spelling is doing real work:
   *
   *   - DOUBLED, because a single syllable is over before a two-year-old has registered that it
   *     is their turn.
   *   - VOWELS STRETCHED ("Moooo!" not "Moo"), because that is what stops the voice reading it
   *     as a word at conversational speed. Text-to-speech has no idea it is imitating an animal;
   *     the extra letters plus the slow, raised prosody the generator wraps them in are the only
   *     way to get something a child would recognise as a moo rather than as the word "moo".
   *     This was the single most robotic-sounding thing in the app before it changed.
   */
  sound: string;
};

/**
 * Sixteen in the roster; four on screen at once (see components/Animals.tsx).
 *
 * Order is not layout — the game picks at random, avoiding whatever is already on screen — so
 * this is just the cast list, roughly easiest-to-name first.
 *
 * Five of them reuse artwork already drawn for the animals that applaud a correct answer in the
 * four games (cow, lion, tiger, monkey, dinosaur), which is most of why the cast could grow this
 * large at all.
 *
 * ON THE CHICKEN: "cock-a-doodle-doo" is a rooster, strictly. It is what was asked for, it is what
 * every children's book gives a chicken, and the drawing has the comb and wattle of a cockerel
 * anyway — so the sound and the picture agree even if the label is loose.
 */
export const ANIMALS = [
  { id: "cow", name: "Cow", sound: "Moooo! Moooo!" },
  { id: "cat", name: "Cat", sound: "Meeeow! Meeeow!" },
  { id: "dog", name: "Dog", sound: "Woof! Woof!" },
  { id: "duck", name: "Duck", sound: "Quack! Quack!" },

  { id: "chicken", name: "Chicken", sound: "Cock-a-doodle-dooo!" },
  { id: "bee", name: "Bee", sound: "Buzzzz! Buzzzz!" },
  { id: "owl", name: "Owl", sound: "Hoooo! Hoooo!" },
  { id: "horse", name: "Horse", sound: "Neiiigh! Neiiigh!" },

  { id: "goat", name: "Goat", sound: "Maaaa! Maaaa!" },
  { id: "lion", name: "Lion", sound: "Roaaar! Roaaar!" },
  { id: "tiger", name: "Tiger", sound: "Grrrrr! Grrrrr!" },
  { id: "monkey", name: "Monkey", sound: "Oooh oooh! Aaah aaah!" },

  { id: "elephant", name: "Elephant", sound: "Pawoooo! Pawoooo!" },
  { id: "bear", name: "Bear", sound: "Grooowl! Grooowl!" },

  { id: "crocodile", name: "Crocodile", sound: "Snap! Snap!" },
  { id: "trex", name: "Dinosaur", sound: "Rawwwr! Rawwwr!" },
] as const satisfies readonly Animal[];

/**
 * The ids, as a union rather than `string`.
 *
 * This is what makes `ZOO_PARTS` in critters/zoo.tsx a checked mapping: it is declared as
 * `Record<AnimalId, Parts>`, so adding an animal here and forgetting to draw it is a compile
 * error rather than something that throws when a child touches it. `as const` is the whole
 * mechanism — without it every id is `string` and the check silently passes.
 */
export type AnimalId = (typeof ANIMALS)[number]["id"];

/**
 * One entry of the roster, with its id narrowed to a literal.
 *
 * `Animal` declares `id: string` because that is what the entries have to be *written* against;
 * passing an `Animal` around then widens the id back to `string` and loses the checking above.
 * Anything handling a game animal wants this instead.
 */
export type ParkAnimal = (typeof ANIMALS)[number];

export const animalById = (id: AnimalId): ParkAnimal => {
  const found = ANIMALS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown animal "${id}"`);
  return found;
};

/*
 * Clip ids. Three per animal, and the prefix is the whole naming scheme:
 *
 *   a{id}    the animal's own noise — a REAL RECORDING for five of them, see audio.ts
 *   ask{id}  "Can you touch the cow?"
 *   snd{id}  "Can you make the sound the cow makes? Moooo! Moooo!"
 */
export const animalClip = (id: AnimalId): string => `a${id}`;
export const askClip = (id: AnimalId): string => `ask${id}`;
export const soundClip = (id: AnimalId): string => `snd${id}`;
