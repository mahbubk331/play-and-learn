/**
 * The memory game.
 *
 * A grid of face-down cards, two of each animal. Turn two over: a pair stays up and celebrates,
 * anything else turns back. The rules and the deck live in memory.ts; this file is the screen.
 *
 * EVERY CARD IS A <button>, not a div with a handler, and here that is worth more than it is on
 * the picker. It is the only screen in the app that can be played without a pointer at all — the
 * four games need a drag, and a drag has no keyboard equivalent — so tab-and-Enter is a real way
 * through this one for a child using switch access or a keyboard. It also gets each card a name
 * in the accessibility tree for free, which is what lets a screen reader say "Cow" rather than
 * "button".
 *
 * The board is LOCKED while a pair resolves. Without it, a fast tapper turns over a third card
 * mid-comparison and the pair that was about to match gets turned back — which reads as the game
 * having taken the match away from them, and is the single most likely thing to make a
 * three-year-old stop.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { animalById, animalClip, type AnimalId } from "../animals";
import { pickNudge, pickPraise, type SoundName } from "../audio";
import { zooArt } from "../critters/zoo";
import {
  MATCH_HOLD,
  MISMATCH_HOLD,
  PAIR_STEPS,
  deckAnimals,
  makeDeck,
  type Card,
} from "../memory";
import { STAGE, memoryGrid } from "../stage";
import { colors, fonts } from "../theme";
import { Sparkles } from "./Feedback";

/** The back of a card: one star, so every card is identical until it is turned. */
const CardBack = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <polygon
      points="50,6 61,38 95,38 67,58 78,91 50,71 22,91 33,58 5,38 39,38"
      fill={colors.bg}
      stroke={colors.ink}
      strokeWidth={7}
      strokeLinejoin="round"
    />
  </svg>
);

/** One pair's worth of progress. Filled once both its cards are found. */
const PairPip = ({ found }: { found: boolean }) => (
  <span
    style={{
      display: "block",
      width: 18,
      height: 18,
      borderRadius: 6,
      background: found ? colors.spark : "transparent",
      border: `4px solid ${colors.ink}`,
      opacity: found ? 1 : 0.4,
    }}
  />
);

export const Memory = ({
  onMenu,
  onSound,
  /** How long a clip runs, so praise and the animal's noise can be chained. See audio.ts. */
  clipLength,
}: {
  onMenu: () => void;
  onSound: (clip: string) => void;
  clipLength: (clip: string) => number;
}) => {
  const timers = useRef<number[]>([]);
  const lastPraise = useRef<SoundName | null>(null);
  const lastNudge = useRef<SoundName | null>(null);
  const nonce = useRef(0);

  /** Which board size is being played: an index into PAIR_STEPS, which only ever goes up. */
  const [stepIndex, setStepIndex] = useState(0);
  const [deck, setDeck] = useState<Card[]>(() => makeDeck(PAIR_STEPS[0], []));

  /** Turned over and not yet resolved. Never longer than two. */
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  /** True while a pair is being celebrated or turned back. See the note at the top. */
  const [locked, setLocked] = useState(false);
  const [spark, setSpark] = useState<{ x: number; y: number; n: number } | null>(
    null,
  );

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const pairs = deck.length / 2;
  const found = matched.length / 2;
  const done = deck.length > 0 && matched.length === deck.length;
  const grid = memoryGrid(deck.length);

  /*
   * The finish sound, fired from an effect rather than from the tap that completed the board.
   * The tap hands off to a timer to bank the match, so at tap time the board is not finished
   * yet and anything checking for completion there is one pair behind.
   */
  useEffect(() => {
    if (!done) return;
    onSound("cheer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const turn = (card: Card, index: number) => {
    if (locked || done) return;
    if (matched.includes(card.key) || faceUp.includes(card.key)) return;
    if (faceUp.length >= 2) return;

    const next = [...faceUp, card.key];
    setFaceUp(next);

    // First of the two: say what it is and wait. Naming it is most of what makes the next
    // turn possible, and it is what an adult playing along would do anyway.
    if (next.length < 2) {
      onSound(animalClip(card.id));
      return;
    }

    const first = deck.find((c) => c.key === next[0]);
    if (!first) return;

    setLocked(true);

    if (first.id === card.id) {
      const cell = grid.at(index);
      setSpark({
        x: cell.left + grid.cardWidth / 2,
        y: cell.top + grid.cardHeight / 2,
        n: nonce.current++,
      });

      const praise = pickPraise(lastPraise.current);
      lastPraise.current = praise;
      onSound(praise);
      later(
        () => onSound(animalClip(card.id)),
        clipLength(praise) * 1000 + 160,
      );

      later(() => {
        setMatched((m) => [...m, next[0], card.key]);
        setFaceUp([]);
        setLocked(false);
      }, MATCH_HOLD);
      return;
    }

    /*
     * Not a pair. A nudge, which is the same pool the animal park uses for a wrong touch —
     * "have another look", never "no". Nothing is counted and nothing is taken away.
     */
    const nudge = pickNudge(lastNudge.current);
    lastNudge.current = nudge;
    onSound(nudge);

    later(() => {
      setFaceUp([]);
      setLocked(false);
    }, MISMATCH_HOLD);
  };

  /** Next board, one size up, avoiding the animals that were just on screen. */
  const again = () => {
    clearTimers();
    const step = Math.min(stepIndex + 1, PAIR_STEPS.length - 1);
    setStepIndex(step);
    setDeck(makeDeck(PAIR_STEPS[step], deckAnimals(deck)));
    setMatched([]);
    setFaceUp([]);
    setLocked(false);
    setSpark(null);
  };

  return (
    <div className="memory" style={{ width: STAGE.width, height: STAGE.height }}>
      <div className="memory-head">
        <button
          type="button"
          className="hud-menu"
          onClick={onMenu}
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

        {/*
          For the adult, like the park's question and the picker's blurbs. The child cannot read
          it; the cards are what they will act on.

          SHORT, and `nowrap`, because the pips beside it grow with the board: at six pairs the
          longer wording this replaced wrapped onto a second line and pushed the row out of
          shape. A header that changes height between boards reads as a layout bug.
        */}
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 32,
            color: colors.ink,
            whiteSpace: "nowrap",
          }}
        >
          Find the pairs
        </div>

        {/*
          One pip per pair. The same job the round stars do in the games: it answers "how much
          longer" without a timer, and it is not a score — nothing here can go down.
        */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Array.from({ length: pairs }, (_, i) => (
            <PairPip key={i} found={i < found} />
          ))}
        </div>
      </div>

      {deck.map((card, index) => {
        const cell = grid.at(index);
        const isMatched = matched.includes(card.key);
        const up = isMatched || faceUp.includes(card.key);
        const animal = animalById(card.id as AnimalId);
        const Art = zooArt(card.id as AnimalId);
        const nameSize = Math.max(13, Math.min(22, grid.cardHeight * 0.12));

        return (
          <button
            key={card.key}
            type="button"
            className={[
              "memory-card",
              up ? "memory-card-up" : "",
              isMatched ? "memory-card-done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: cell.left,
              top: cell.top,
              width: grid.cardWidth,
              height: grid.cardHeight,
            }}
            onClick={() => turn(card, index)}
            disabled={isMatched}
            aria-label={up ? animal.name : "Face-down card"}
          >
            <span className="memory-inner">
              <span className="memory-face memory-back">
                <CardBack size={Math.min(grid.cardWidth, grid.cardHeight) * 0.5} />
              </span>

              <span className="memory-face memory-front">
                <svg
                  viewBox="0 0 200 170"
                  width={grid.cardWidth * 0.78}
                  height={grid.cardHeight * 0.62}
                  aria-hidden="true"
                >
                  <Art />
                </svg>
                <span
                  className="memory-name"
                  style={{ fontSize: nameSize, fontFamily: fonts.display }}
                >
                  {animal.name}
                </span>
              </span>
            </span>
          </button>
        );
      })}

      {spark ? <Sparkles x={spark.x} y={spark.y} nonce={spark.n} /> : null}

      {done ? (
        <div className="overlay">
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 64,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            All found!
          </div>

          {/*
            "Play again" leads, because it is what a child who just finished wants and it is the
            one that steps the board up a size. Same pairing and the same reasoning as the
            end-of-track card: two equally loud buttons make the choice about which thumb is
            nearer rather than about what they want.
          */}
          <button type="button" className="replay" onClick={again}>
            Play again
          </button>
          <button
            type="button"
            className="replay replay-second"
            onClick={onMenu}
          >
            Pick a game
          </button>
        </div>
      ) : null}
    </div>
  );
};
