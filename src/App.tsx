import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioEngine } from "./audio";
import { Board, HoleShape } from "./components/Board";
import {
  GameDoneCard,
  LevelDoneCard,
  RestartCard,
  Sparkles,
  WrongMark,
} from "./components/Feedback";
import { Hud } from "./components/Hud";
import { Critter } from "./components/Critter";
import { pickSpecies, type Species } from "./critters/registry";
import {
  CORRECT_HOLD,
  makeArrangement,
  makeRounds,
  RESTART_HOLD,
  WRONG_HOLD,
  type Phase,
  type Round,
} from "./game";
import { LEVELS, MAX_STARS, MAX_WRONG, starsFor } from "./levels";
import {
  BLOCK_HOME,
  HOLE_Y,
  SHAPE_PX,
  STAGE,
  holeAt,
  holeCenterX,
} from "./stage";
import {
  sameToken,
  tokenClip,
  tokenGlyph,
  tokenHue,
  type Token,
} from "./tokens";
import {
  clearProgress,
  dismissSplash,
  hapticCorrect,
  hapticDrop,
  hapticWrong,
  loadProgress,
  prepareDevice,
  saveProgress,
} from "./native";
import { colors } from "./theme";

type Point = { x: number; y: number };

/**
 * The draggable block. An SVG sized to the stage so its polygon coordinates match the
 * board's, positioned by transform so dragging never triggers layout.
 */
const Block = ({
  token,
  rotation,
  at,
  held,
  dragging,
}: {
  token: Token;
  rotation: number;
  at: Point;
  held: boolean;
  dragging: boolean;
}) => (
  <svg
    viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
    width={STAGE.width}
    height={STAGE.height}
    className={dragging ? "block block-dragging" : "block"}
    style={{
      transform: `translate(${at.x - STAGE.width / 2}px, ${at.y - STAGE.height / 2}px) scale(${held ? 1.08 : 1})`,
    }}
  >
    {/* Rotation is applied to the artwork, not the positioning transform, so the drag maths
        never has to know about it. */}
    <g transform={`rotate(${rotation} ${STAGE.width / 2} ${STAGE.height / 2})`}>
      {/*
        The block IS the token: a polygon for a shape, the digits themselves for a number.
        Drawn by the same component as the hole at scale 1, so a block and the hole it belongs
        in can never be different shapes.
      */}
      <HoleShape
        token={token}
        cx={STAGE.width / 2}
        cy={STAGE.height / 2}
        scale={1}
        // One orange for every shape and number block; a colour block is its own colour. The
        // single orange is load-bearing on the shape levels — colour-coding the shapes would
        // let a child solve them by matching colour and never look at an outline.
        fill={tokenHue(token)?.fill ?? colors.block}
        stroke={colors.ink}
        strokeWidth={8}
      />

      {/* Gloss on anything solid. Skipped for numerals, which are mostly outline — a highlight
          sitting on a stroke reads as a smudge rather than a shine. */}
      {tokenGlyph(token) ? null : (
        <ellipse
          cx={STAGE.width / 2 - SHAPE_PX * 0.13}
          cy={STAGE.height / 2 - SHAPE_PX * 0.16}
          rx={SHAPE_PX * 0.11}
          ry={SHAPE_PX * 0.07}
          fill="rgba(255,255,255,0.5)"
        />
      )}
    </g>
  </svg>
);

export const App = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioEngine>(new AudioEngine());

  const [scale, setScale] = useState(1);

  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  /*
   * The board and its running order are ONE piece of state, deliberately.
   *
   * They were two, and the initial value called makeArrangement twice — once for the
   * arrangement, once inside the rounds initialiser — so the rounds were drawn from a
   * different board than the one on screen. With shapes that was invisible, because every
   * shape level produces the same four shapes in the same order. The moment level 1 became a
   * COLOUR level, which draws four of seven at random, it showed up immediately as a green
   * ball and no green hole: an unwinnable round.
   *
   * Holding them together makes it impossible to set one without the other, which is a
   * stronger guarantee than remembering to derive them in the right order.
   */
  const [board, setBoard] = useState<{ arrangement: Token[]; rounds: Round[] }>(
    () => {
      const arrangement = makeArrangement(LEVELS[0]);
      return { arrangement, rounds: makeRounds(LEVELS[0], arrangement) };
    },
  );
  const { arrangement, rounds } = board;
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [stars, setStars] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");

  const [pos, setPos] = useState<Point>(BLOCK_HOME);
  const [dragging, setDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [seatedPos, setSeatedPos] = useState<number | null>(null);
  const [wrongPos, setWrongPos] = useState<number | null>(null);
  const [wrongNonce, setWrongNonce] = useState(0);
  const [okNonce, setOkNonce] = useState(0);
  const [species, setSpecies] = useState<Species | null>(null);

  const dragOffset = useRef<Point>({ x: 0, y: 0 });

  const round = rounds[roundIndex];

  /**
   * Boot: lock the device, decode the audio, resume saved progress, then drop the splash.
   *
   * The splash is hidden LAST and explicitly, rather than on a timer, because it is the only
   * thing covering the gap between "React mounted" and "the first block is on screen with its
   * sound ready". A timer either flashes it away early or holds it after the game is playable.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await prepareDevice();
      await audio.current.load();

      const saved = await loadProgress();
      if (!cancelled && saved && saved.levelIndex < LEVELS.length) {
        setStars(saved.stars);
        startLevel(saved.levelIndex);
      }

      if (!cancelled) await dismissSplash();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fit the fixed logical stage into whatever viewport this is, letterboxing rather
   * than stretching. Every coordinate in the game is in logical units and this is the
   * only place the real screen size is considered.
   */
  useEffect(() => {
    const fit = () => {
      setScale(
        Math.min(
          window.innerWidth / STAGE.width,
          window.innerHeight / STAGE.height,
        ),
      );
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  /**
   * Say the shape's name whenever a new block is presented.
   *
   * Keyed on the round and the phase being playable, so it fires on a fresh round but
   * NOT when the block springs back after a wrong drop — repeating the name on every
   * retry turns the cue into nagging, and the child already knows what they are
   * holding.
   */
  useEffect(() => {
    if (phase !== "playing" || !round) return;
    audio.current.play(tokenClip(round.token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, levelIndex, rounds]);

  const toLogical = useCallback((clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE.width,
      y: ((clientY - rect.top) / rect.height) * STAGE.height,
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    /*
     * A grab during the wrong-answer beat is allowed, and cuts it short.
     *
     * The beat is 1.6s so the T-rex can finish, and a block that ignores a two-year-old
     * for a second and a half does not read as "wait", it reads as broken — they will
     * grab at it, get nothing, and grab harder. Letting the drag start cancels the
     * dinosaur and returns control immediately. Nothing is lost: the X and the roar have
     * already delivered the message by the time a child has reached for the block again.
     */
    if (phase !== "playing" && phase !== "wrong") return;
    if (phase === "wrong") setPhase("playing");

    // Browsers will not start audio without a gesture, and this is the first one.
    audio.current.unlock();

    const p = toLogical(e.clientX, e.clientY);
    dragOffset.current = { x: pos.x - p.x, y: pos.y - p.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = toLogical(e.clientX, e.clientY);
    const next = {
      x: p.x + dragOffset.current.x,
      y: p.y + dragOffset.current.y,
    };
    setPos(next);
    setHoverPos(holeAt(next.x, next.y));
  };

  const onPointerUp = () => {
    if (!dragging) return;

    setDragging(false);
    setHoverPos(null);

    const position = holeAt(pos.x, pos.y);

    /*
     * Dropped nowhere near a hole. This is a failed *drag*, not a wrong answer: no X, no
     * sound, no cost. Treating it as wrong would punish a three-year-old for their hands
     * rather than their thinking, which at this age is most of what goes wrong — and
     * with a three-strike rule in play it would also restart levels for no reason.
     */
    if (position === null) {
      setPos(BLOCK_HOME);
      return;
    }

    // A tick for the block meeting the board, whichever hole it was.
    hapticDrop();

    // The board is shuffled from level 2, so a hole's position is not its token.
    if (round && sameToken(arrangement[position], round.token)) {
      setPos({ x: holeCenterX(position), y: HOLE_Y });
      setSeatedPos(position);
      setOkNonce((n) => n + 1);
      // A different animal each time, never the same one twice running.
      setSpecies((previous: Species | null) => pickSpecies(previous?.id ?? null));
      setPhase("correct");
      hapticCorrect();
      audio.current.play("clap");
      audio.current.play("cheer");
      return;
    }

    const spent = wrong + 1;
    setPos(BLOCK_HOME);
    setWrongPos(position);
    setWrong(spent);
    setWrongNonce((n) => n + 1);
    /*
     * Bonk on impact, then the soft descending tone.
     *
     * The animals moved to the correct answer, so the correction is back to being small:
     * a knock, a two-note "no", and the X. That ordering is the point — the elaborate,
     * memorable thing belongs to the behaviour worth repeating, and a mistake should cost
     * as little as possible so the next thing that happens is another guess.
     */
    hapticWrong();
    audio.current.play("bonk");
    audio.current.play("wrong", 0.12);

    if (spent >= MAX_WRONG) {
      setPhase("restarting");
      audio.current.play("tryagain", 0.5);
      return;
    }

    setPhase("wrong");
  };

  const startLevel = useCallback((index: number) => {
    const next = LEVELS[index];
    const arrangement = makeArrangement(next);
    setLevelIndex(index);
    setBoard({ arrangement, rounds: makeRounds(next, arrangement) });
    setRoundIndex(0);
    setWrong(0);
    setSeatedPos(null);
    setWrongPos(null);
    setPos(BLOCK_HOME);
    setPhase("playing");
  }, []);

  // Feedback beats hold, then the game moves on. Cleanup matters: tapping a card
  // during a beat would otherwise be overwritten by the old timer.
  useEffect(() => {
    if (phase === "playing" || phase === "levelDone" || phase === "gameDone") {
      return;
    }

    const hold =
      phase === "correct"
        ? CORRECT_HOLD
        : phase === "restarting"
          ? RESTART_HOLD
          : WRONG_HOLD;

    const timer = window.setTimeout(() => {
      if (phase === "wrong") {
        setPhase("playing");
        return;
      }

      if (phase === "restarting") {
        // Same level, fresh rounds and a fresh board. Stars already banked stay.
        startLevel(levelIndex);
        return;
      }

      setSeatedPos(null);

      if (roundIndex + 1 >= rounds.length) {
        const earned = stars + starsFor(wrong);
        setStars(earned);
        // Save the level AFTER this one: reopening should offer what comes next, not replay
        // what was just finished.
        void saveProgress({
          levelIndex: Math.min(levelIndex + 1, LEVELS.length - 1),
          stars: earned,
        });
        setPhase("levelDone");
        audio.current.play(
          levelIndex + 1 >= LEVELS.length ? "cheer" : "nextlevel",
          0.35,
        );
        return;
      }

      setRoundIndex((i) => i + 1);
      setPos(BLOCK_HOME);
      setPhase("playing");
    }, hold);

    return () => window.clearTimeout(timer);
  }, [phase, roundIndex, rounds.length, levelIndex, wrong, stars, startLevel]);

  const advance = () => {
    audio.current.unlock();
    if (levelIndex + 1 >= LEVELS.length) {
      setPhase("gameDone");
      return;
    }
    startLevel(levelIndex + 1);
  };

  const restartGame = () => {
    audio.current.unlock();
    void clearProgress();
    setStars(0);
    startLevel(0);
  };

  const stageStyle = useMemo(
    () => ({
      width: STAGE.width,
      height: STAGE.height,
      transform: `scale(${scale})`,
    }),
    [scale],
  );

  const interactive = phase === "playing" || phase === "wrong";

  return (
    <div className="viewport">
      <div ref={stageRef} className="stage" style={stageStyle}>
        <Hud
          level={level.n}
          totalLevels={LEVELS.length}
          stars={stars}
          wrong={wrong}
          round={roundIndex + (phase === "correct" ? 1 : 0)}
          rounds={rounds.length}
          nonce={okNonce}
        />

        <Board
          hoverIndex={hoverPos}
          seatedIndex={seatedPos}
          arrangement={arrangement}
        />

        {/*
          The dragged block is taken off screen during the correct-answer beat. The
          block you then see in the hole is the one Board draws *behind* the board face,
          which is what makes it look like it went in rather than like it is sitting on
          top of the opening.
        */}
        {interactive && round ? (
          <div
            className="grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/*
              Keyed by level and round so each new block is a fresh element. Without the
              key the block would animate from the hole it just dropped into back up to
              the start position, which reads as the machine spitting it out again.
            */}
            <Block
              key={`${levelIndex}-${roundIndex}`}
              token={round.token}
              rotation={round.rotation}
              at={pos}
              held={dragging}
              dragging={dragging}
            />
          </div>
        ) : null}

        {phase === "correct" && seatedPos !== null ? (
          <>
            <Sparkles x={holeCenterX(seatedPos)} y={HOLE_Y} nonce={okNonce} />
            {species ? <Critter species={species} nonce={okNonce} /> : null}
          </>
        ) : null}

        {(phase === "wrong" || phase === "restarting") && wrongPos !== null ? (
          <WrongMark x={holeCenterX(wrongPos)} y={HOLE_Y} nonce={wrongNonce} />
        ) : null}

        {phase === "restarting" ? <RestartCard /> : null}

        {phase === "levelDone" ? (
          <LevelDoneCard
            level={level.n}
            stars={starsFor(wrong)}
            wrong={wrong}
            isLast={levelIndex + 1 >= LEVELS.length}
            onNext={advance}
          />
        ) : null}

        {phase === "gameDone" ? (
          <GameDoneCard
            stars={stars}
            maxStars={MAX_STARS}
            onReplay={restartGame}
          />
        ) : null}
      </div>
    </div>
  );
};
