/**
 * The bubble game.
 *
 * A scatter of bubbles, each holding one colour, shape, numeral or letter. One is asked for; pop
 * it and it bursts with a word of praise, tap a wrong one and it gets an X and costs a try. Four
 * levels, one per token kind. The wording and the beats live in bubbles.ts, the positions in
 * stage.ts, and the round order in game.ts — this file is the screen.
 *
 * IT REUSES THE TRACKS' ENGINE ALMOST ENTIRELY, which is the thing worth knowing before reading
 * it: `makeArrangement` picks the distinct tokens, `makeRounds` orders them with nothing asked
 * twice running, `MAX_WRONG` and `starsFor` give the three tries and the stars, and `Hud`,
 * `Sparkles`, `WrongMark`, `RestartCard`, `LevelDoneCard` and `GameDoneCard` are the same
 * components the drag game uses. What is new is only the input: you touch the answer.
 *
 * THE SPOKEN CUE IS THE TOKEN'S NAME, not the printed question. There is no recorded "Can you
 * pop the red one?" — the only clips for tokens are the bare names, because that is all the
 * tracks ever needed (the README lists the missing spoken question as a known gap, and it is the
 * same gap here). So the child hears "Red" and the adult reads the sentence, which is exactly
 * the split the animal park makes with its printed question.
 *
 * EVERY BUBBLE IS A <button>. This screen is the most keyboard-reachable in the app — tab
 * through the bubbles, press Enter — and it also gets each bubble a name in the accessibility
 * tree, so a screen reader says "Red" rather than "button".
 *
 * POSITIONS RESHUFFLE EVERY ROUND, which is the one place this deliberately departs from the
 * tracks. There the board is shuffled once per attempt, with a note explaining that per-round
 * would be re-teaching the board every few seconds instead of testing recognition. That
 * reasoning does not transfer: a bubble is a free-floating thing with no fixed home, it drifts
 * while you look at it, so position was never a cue that could be learned here. Holding them
 * still between rounds would make them read as buttons on a board.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { pickPraise, type SoundName } from "../audio";
import {
  MISS_HOLD,
  POP_HOLD,
  pickVerb,
  promptFor,
  type Verb,
} from "../bubbles";
import {
  makeArrangement,
  makeRounds,
  RESTART_HOLD,
  type Round,
} from "../game";
import { BUBBLE_LEVELS, MAX_WRONG, starsFor } from "../levels";
import { hapticCorrect, hapticWrong } from "../native";
import { STAGE, bubbleSpots } from "../stage";
import { colors, fonts } from "../theme";
import { tokenClip, tokenHue, tokenLabel, type Token } from "../tokens";
import { HoleShape } from "./Board";
import {
  GameDoneCard,
  LevelDoneCard,
  RestartCard,
  Sparkles,
  WrongMark,
} from "./Feedback";
import { Hud } from "./Hud";

/**
 * Which beat is running.
 *
 * The same five the tracks have, minus the dragging ones — there is no "block is in the air"
 * state because there is no block. See Phase in game.ts.
 */
type Phase =
  | "playing"
  | "popped"
  | "wrong"
  | "restarting"
  | "levelDone"
  | "gameDone";

/** The stage size a bubble's contents are drawn against, matching HoleShape's own base. */
const TOKEN_BASE = 140;

/** `0..n-1`, shuffled. Which token lands in which position. */
const shuffledSlots = (n: number): number[] => {
  const slots = Array.from({ length: n }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
};

/**
 * One bubble.
 *
 * A COLOUR bubble IS the colour — the film is tinted and there is nothing inside it. Every other
 * kind is a near-clear bubble with the token drawn inside, in the same single orange the blocks
 * use. That split is `tokenHue` returning null for three of the four kinds, and it is the same
 * rule the board follows for the same reason: colour-coding the shapes would let a child solve
 * the shape level by matching colour and never look at an outline.
 *
 * The gloss is what makes a filled circle read as a bubble rather than as one of the colour
 * game's balls. It is drawn on every kind, including the tinted ones.
 */
const Bubble = ({
  token,
  x,
  y,
  r,
  drift,
  state,
  label,
  onPop,
  disabled,
}: {
  token: Token;
  x: number;
  y: number;
  r: number;
  /**
   * How far this bubble may wander, in logical units.
   *
   * Handed to CSS as `--drift` rather than baked into the keyframes, because it is solved in
   * stage.ts against the spot spacing — the same calculation that gives `r`. Hard-coded pixels
   * in index.css would be the same number in two places, and the CSS copy would not know the
   * radius had changed.
   */
  drift: number;
  /** "idle" | "popping" — a popping bubble is mid-burst and no longer tappable. */
  state: "idle" | "popping";
  label: string;
  onPop: () => void;
  disabled: boolean;
}) => {
  const hue = tokenHue(token);

  return (
    <button
      type="button"
      className={state === "popping" ? "bubble bubble-pop" : "bubble"}
      style={
        {
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          "--drift": `${drift}px`,
        } as React.CSSProperties
      }
      onClick={onPop}
      disabled={disabled}
      aria-label={label}
    >
      <svg
        viewBox={`0 0 ${TOKEN_BASE} ${TOKEN_BASE}`}
        width={r * 2}
        height={r * 2}
        aria-hidden="true"
      >
        <circle
          cx={TOKEN_BASE / 2}
          cy={TOKEN_BASE / 2}
          r={TOKEN_BASE / 2 - 6}
          fill={hue ? hue.fill : "rgba(255,255,255,0.62)"}
          stroke={hue ? hue.deep : colors.machineDark}
          strokeWidth={7}
        />

        {/* Nothing inside a colour bubble: the colour is the answer. */}
        {hue ? null : (
          <HoleShape
            token={token}
            cx={TOKEN_BASE / 2}
            cy={TOKEN_BASE / 2}
            scale={0.56}
            fill={colors.block}
            stroke={colors.ink}
            strokeWidth={7}
          />
        )}

        {/*
          The gloss, out on the FILM rather than in the middle of the bubble.

          It started at 0.17 from the centre, which on a shape bubble put it across the top-left
          corner of the square — and a highlight sitting on a stroke reads as a smudge, not a
          shine, which is the same thing the draggable Block avoids by skipping its gloss on
          glyphs. Out at 0.26 it lands in the ring between the token and the rim, where a real
          bubble's highlight is anyway.
        */}
        <ellipse
          cx={TOKEN_BASE / 2 - TOKEN_BASE * 0.26}
          cy={TOKEN_BASE / 2 - TOKEN_BASE * 0.26}
          rx={TOKEN_BASE * 0.085}
          ry={TOKEN_BASE * 0.055}
          transform={`rotate(-38 ${TOKEN_BASE / 2 - TOKEN_BASE * 0.26} ${TOKEN_BASE / 2 - TOKEN_BASE * 0.26})`}
          fill="rgba(255,255,255,0.78)"
        />
      </svg>
    </button>
  );
};

export const Bubbles = ({
  onMenu,
  /** `delay` is in seconds, so a pop can fire the applause and the praise as one gesture. */
  onSound,
  /** The synthesized pop. Not a clip — see `AudioEngine.pop`. */
  onPopSound,
  /** Where this game was left, and what it has banked. Both come from saved progress. */
  resumeAt,
  bankedStars,
  /** Called when a level is finished, so App can persist it. */
  onBanked,
}: {
  onMenu: () => void;
  onSound: (clip: string, delay?: number) => void;
  onPopSound: () => void;
  resumeAt: number;
  bankedStars: number;
  onBanked: (levelIndex: number, stars: number) => void;
}) => {
  const lastPraise = useRef<SoundName | null>(null);
  const nonce = useRef(0);

  const [levelIndex, setLevelIndex] = useState(() =>
    Math.min(Math.max(resumeAt, 0), BUBBLE_LEVELS.length - 1),
  );
  const level = BUBBLE_LEVELS[levelIndex];

  /**
   * The tokens, the running order over them, AND which sits in which position: one piece of
   * state, never three.
   *
   * Two separate traps live here, and both were hit before this was one object.
   *
   * The first is the one App.tsx documents on its own board: hold the tokens and the rounds
   * apart and the initialiser calls `makeArrangement` twice, so the rounds get drawn from a
   * different set than the one on screen. On a colour level, which draws five of seven hues at
   * random, that is an unwinnable round asking for a bubble that is not there.
   *
   * The second is why `order` is in here too. As its own state it survived a level change by one
   * render — level 2 has four bubbles where level 1 had five, so a five-entry order indexed a
   * four-token array and `tokens[4]` was undefined. That crashed on `tokenHue(undefined)`, and an
   * effect that repaired the order afterwards could not help: the render that read it had already
   * thrown. Held together, a mismatched length cannot be represented.
   */
  const [board, setBoard] = useState(() => {
    const first =
      BUBBLE_LEVELS[Math.min(Math.max(resumeAt, 0), BUBBLE_LEVELS.length - 1)];
    const tokens = makeArrangement(first, first.bubbles ?? 4);
    return {
      tokens,
      rounds: makeRounds(first, tokens),
      order: shuffledSlots(tokens.length),
    };
  });
  const { tokens, rounds, order } = board;

  const [roundIndex, setRoundIndex] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [stars, setStars] = useState(bankedStars);
  const [phase, setPhase] = useState<Phase>("playing");

  const [popped, setPopped] = useState<number | null>(null);
  const [missed, setMissed] = useState<number | null>(null);
  const [verb, setVerb] = useState<Verb>(() => pickVerb(null));

  const round: Round | undefined = rounds[roundIndex];
  const { r, drift, spots } = bubbleSpots(tokens.length);

  /**
   * A fresh scatter: the same tokens in new positions, and a new verb.
   *
   * Reshuffles from `board.order`'s own length rather than from anything outside, so it cannot
   * produce an order that does not fit the tokens it sits beside.
   */
  const scatter = useCallback(() => {
    setBoard((b) => ({ ...b, order: shuffledSlots(b.order.length) }));
    setVerb((previous) => pickVerb(previous));
  }, []);

  /*
   * Say the token's name whenever a new round is presented.
   *
   * Keyed on the round and the phase being playable, so it fires on a fresh round but NOT when
   * the board comes back after a wrong tap — repeating the name on every retry turns the cue
   * into nagging, and the child already knows what they are looking for.
   */
  useEffect(() => {
    if (phase !== "playing" || !round) return;
    onSound(tokenClip(round.token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, levelIndex, rounds]);

  /*
   * Nothing to cancel on the way in, and that is worth stating because the memory board and the
   * boxes screen both keep a timer list to clear here.
   *
   * Every delayed thing on this screen is the ONE timer in the beat effect below, and that
   * effect cancels its own on every run and on unmount. The phases this is reached from —
   * levelDone, gameDone, restarting — are all phases where that effect has either returned
   * without setting a timer or is the thing calling this.
   */
  const startLevel = useCallback((index: number) => {
    const next = BUBBLE_LEVELS[index];
    const fresh = makeArrangement(next, next.bubbles ?? 4);
    setLevelIndex(index);
    setBoard({
      tokens: fresh,
      rounds: makeRounds(next, fresh),
      order: shuffledSlots(fresh.length),
    });
    setRoundIndex(0);
    setWrong(0);
    setPopped(null);
    setMissed(null);
    setPhase("playing");
  }, []);

  const tap = (slot: number) => {
    if (phase !== "playing" || !round) return;

    const token = tokens[order[slot]];

    if (tokenLabel(token) === tokenLabel(round.token)) {
      setPopped(slot);
      setPhase("popped");
      nonce.current += 1;
      hapticCorrect();

      /*
       * The pop lands first and alone, then the applause and a word of praise.
       *
       * The pop IS the feedback for the tap, so it has to be on the same frame as the burst —
       * anything layered on top of it at that instant muddies the one sound the child caused.
       * The praise is held back 260ms so it lands in the tail rather than underneath: applause
       * is broadband noise and a simultaneous "Good job!" is close to unintelligible under it.
       */
      onPopSound();
      onSound("clap", 0.12);
      const praise = pickPraise(lastPraise.current);
      lastPraise.current = praise;
      onSound(praise, 0.26);
      return;
    }

    const spent = wrong + 1;
    setMissed(slot);
    setWrong(spent);
    nonce.current += 1;

    /*
     * A knock and a soft descending tone, the same correction the tracks use. Nothing elaborate:
     * the memorable beat belongs to the behaviour worth repeating, and a mistake should cost as
     * little as possible so the next thing that happens is another guess.
     */
    hapticWrong();
    onSound("bonk");
    onSound("wrong", 0.12);

    if (spent >= MAX_WRONG) {
      setPhase("restarting");
      onSound("tryagain", 0.5);
      return;
    }

    setPhase("wrong");
  };

  /*
   * Feedback beats hold, then the game moves on.
   *
   * One effect rather than timers scattered through the handlers, so there is a single place
   * that knows what follows what — and cleanup matters: leaving the screen mid-beat would
   * otherwise fire a state update against a screen that is no longer up.
   */
  useEffect(() => {
    if (phase === "playing" || phase === "levelDone" || phase === "gameDone") {
      return;
    }

    const hold =
      phase === "popped"
        ? POP_HOLD
        : phase === "restarting"
          ? RESTART_HOLD
          : MISS_HOLD;

    const timer = window.setTimeout(() => {
      if (phase === "wrong") {
        setMissed(null);
        setPhase("playing");
        return;
      }

      if (phase === "restarting") {
        // Same level, fresh bubbles and a fresh order. Stars already banked stay.
        startLevel(levelIndex);
        return;
      }

      setPopped(null);

      if (roundIndex + 1 >= rounds.length) {
        const earned = stars + starsFor(wrong);
        setStars(earned);
        /*
         * Bank the level AFTER this one, so reopening the game offers what comes next rather
         * than replaying what was just finished. App persists it; this screen does not touch
         * storage.
         */
        onBanked(Math.min(levelIndex + 1, BUBBLE_LEVELS.length - 1), earned);
        setPhase("levelDone");
        onSound(
          levelIndex + 1 >= BUBBLE_LEVELS.length ? "cheer" : "nextlevel",
          0.35,
        );
        return;
      }

      setRoundIndex((i) => i + 1);
      scatter();
      setPhase("playing");
    }, hold);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIndex, rounds.length, levelIndex, wrong, stars]);

  const advance = () => {
    if (levelIndex + 1 >= BUBBLE_LEVELS.length) {
      setPhase("gameDone");
      return;
    }
    startLevel(levelIndex + 1);
  };

  /** Replay from level 1. Zeroes this game only; the tracks' stars are untouched. */
  const replay = () => {
    onBanked(0, 0);
    setStars(0);
    startLevel(0);
  };

  const maxStars = BUBBLE_LEVELS.length * 3;
  const playable = phase === "playing";

  return (
    <div className="bubbles" style={{ width: STAGE.width, height: STAGE.height }}>
      <Hud
        title="Bubbles"
        level={level.n}
        totalLevels={BUBBLE_LEVELS.length}
        stars={stars}
        wrong={wrong}
        round={roundIndex + (phase === "popped" ? 1 : 0)}
        rounds={rounds.length}
        nonce={nonce.current}
        onMenu={onMenu}
      />

      {/*
        The question, printed. For the ADULT — the child cannot read it and does not need to,
        having just heard the name spoken. Same reasoning as the animal park's printed question:
        without it the person holding the tablet has no idea what was asked and cannot help.
      */}
      {round ? (
        <div
          className="bubble-prompt"
          style={{ fontFamily: fonts.display }}
          aria-live="polite"
        >
          {promptFor(round.token, verb)}
        </div>
      ) : null}

      {order.map((tokenIndex, slot) => {
        const token = tokens[tokenIndex];
        const spot = spots[slot];
        if (!spot) return null;

        return (
          <Bubble
            /*
              Keyed by the POSITION and the round, not by the token. A bubble has to be a fresh
              element each round for the float animation to restart from a new offset; keyed by
              token it would keep its old animation and slide across the screen to its new spot.
            */
            key={`${roundIndex}-${slot}`}
            token={token}
            x={spot.x}
            y={spot.y}
            r={r}
            drift={drift}
            state={popped === slot ? "popping" : "idle"}
            label={tokenLabel(token)}
            disabled={!playable}
            onPop={() => tap(slot)}
          />
        );
      })}

      {/* On the bubble that burst. */}
      {phase === "popped" && popped !== null && spots[popped] ? (
        <Sparkles
          x={spots[popped].x}
          y={spots[popped].y}
          nonce={nonce.current}
        />
      ) : null}

      {(phase === "wrong" || phase === "restarting") &&
      missed !== null &&
      spots[missed] ? (
        <WrongMark
          x={spots[missed].x}
          y={spots[missed].y}
          nonce={nonce.current}
        />
      ) : null}

      {phase === "restarting" ? <RestartCard /> : null}

      {phase === "levelDone" ? (
        <LevelDoneCard
          level={level.n}
          stars={starsFor(wrong)}
          wrong={wrong}
          isLast={levelIndex + 1 >= BUBBLE_LEVELS.length}
          onNext={advance}
        />
      ) : null}

      {phase === "gameDone" ? (
        <GameDoneCard
          title="Bubbles"
          stars={stars}
          maxStars={maxStars}
          onReplay={replay}
          onMenu={onMenu}
        />
      ) : null}
    </div>
  );
};
