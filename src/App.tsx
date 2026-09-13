import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioEngine, pickPraise, type SoundName } from "./audio";
import { Board, HoleShape } from "./components/Board";
import {
  GameDoneCard,
  LevelDoneCard,
  RestartCard,
  Sparkles,
  WrongMark,
} from "./components/Feedback";
import { Boxes } from "./components/Boxes";
import { Bubbles } from "./components/Bubbles";
import { Hud } from "./components/Hud";
import { Memory } from "./components/Memory";
import { Menu } from "./components/Menu";
import { Animals } from "./components/Animals";
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
import { MAX_WRONG, starsFor, type Mode } from "./levels";
import { maxStars, TRACKS, trackById } from "./tracks";
import {
  BLOCK_HOME,
  SHAPE_PX,
  STAGE,
  holeAt,
  holeCenterX,
  holeCenterY,
  applyLayout,
  currentOrientation,
  orientationFor,
} from "./stage";
import {
  sameToken,
  tokenClip,
  tokenGlyph,
  tokenHue,
  type Token,
} from "./tokens";
import {
  dismissSplash,
  hapticCorrect,
  hapticDrop,
  hapticWrong,
  loadProgress,
  prepareDevice,
  saveProgress,
  type Progress,
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
        The block IS the token: a polygon for a shape, the digits themselves for a number,
        the letter itself for a letter. Drawn by the same component as the hole at scale 1, so
        a block and the hole it belongs in can never be different shapes.
      */}
      <HoleShape
        token={token}
        cx={STAGE.width / 2}
        cy={STAGE.height / 2}
        scale={1}
        // One orange for every shape, number and letter block; a colour block is its own
        // colour. The single orange is load-bearing on the shape levels — colour-coding the
        // shapes would let a child solve them by matching colour and never look at an outline.
        fill={tokenHue(token)?.fill ?? colors.block}
        stroke={colors.ink}
        strokeWidth={8}
      />

      {/* Gloss on anything solid. Skipped for glyphs, which are mostly outline — a highlight
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

/**
 * Which screen is up.
 *
 * Six, and there is no router: "menu" is the picker, "playing" is one of the four level tracks,
 * "bubbles" is the popping game, "animals" is the park, "memory" is the matching-pairs board and
 * "boxes" is Dots and Boxes.
 *
 * The last four are their own screens rather than tracks five to eight because none of them is a
 * level ladder THE DRAG ENGINE can run. Three of them are not ladders at all; bubbles is one,
 * with four levels and stars and the three-try rule, but you touch the answer instead of
 * dragging a block to it, so it cannot be a Track either. See animals.ts, memory.ts, boxes.ts
 * and bubbles.ts.
 *
 * Everything about a TRACK comes from the selected Track, so for the four drag games this really
 * is the whole navigation model; the other four just need somewhere to be.
 */
type Screen = "menu" | "playing" | "animals" | "memory" | "boxes" | "bubbles";

export const App = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioEngine>(new AudioEngine());

  const [scale, setScale] = useState(1);

  /**
   * Which stage is live, mirrored into state purely so a flip can re-key the tree.
   *
   * The geometry itself lives in stage.ts and is mutated there, not held here — see the note
   * on the active layout. This value is the render trigger and the remount key, nothing more.
   */
  const [orientation, setOrientation] = useState(currentOrientation);

  const [screen, setScreen] = useState<Screen>("menu");


  /**
   * Which of the four games is being played, and how far into it.
   *
   * `trackId` is also the mode of every level in it and the key its progress is stored under
   * (see tracks.ts), so there is exactly one identifier for "which game is this" rather than
   * three that have to agree.
   */
  const [trackId, setTrackId] = useState<Mode>(TRACKS[0].id);
  const track = trackById(trackId);
  const levels = track.levels;

  const [levelIndex, setLevelIndex] = useState(0);
  const level = levels[levelIndex];

  /**
   * Saved progress for every track, held whole.
   *
   * The picker needs all four at once and a level completion writes one of them, so the map is
   * the unit of state as well as the unit of storage. Keeping four independent pieces of state
   * would mean the picker reading from somewhere other than where the game writes.
   */
  const [progress, setProgress] = useState<Progress>({});

  /*
   * The board and its running order are ONE piece of state, deliberately.
   *
   * They were two, and the initial value called makeArrangement twice — once for the
   * arrangement, once inside the rounds initialiser — so the rounds were drawn from a
   * different board than the one on screen. With shapes that was invisible, because every
   * shape level produces the same four shapes in the same order. The moment the first level
   * became a COLOUR level, which draws four of seven at random, it showed up immediately as a
   * green ball and no green hole: an unwinnable round.
   *
   * Holding them together makes it impossible to set one without the other, which is a
   * stronger guarantee than remembering to derive them in the right order.
   */
  const [board, setBoard] = useState<{ arrangement: Token[]; rounds: Round[] }>(
    () => {
      const first = TRACKS[0].levels[0];
      const arrangement = makeArrangement(first);
      return { arrangement, rounds: makeRounds(first, arrangement) };
    },
  );
  const { arrangement, rounds } = board;
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrong, setWrong] = useState(0);
  /** Stars banked in the CURRENT track. The other three tracks' totals live in `progress`. */
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

  /**
   * The last thing said on a correct answer, so the next one is different.
   *
   * A ref rather than state: nothing renders from it, and making it state would re-render the
   * whole stage on every correct drop to change a value only the audio engine reads.
   */
  const lastPraise = useRef<SoundName | null>(null);

  const round = rounds[roundIndex];

  /**
   * Boot: lock the device, decode the audio, load saved progress, then drop the splash.
   *
   * It no longer resumes into a level. It cannot: there are four tracks and no way to know
   * which one the child wants today, and guessing "the one they played last" would drop a child
   * who wanted letters into numbers with no explanation. So the picker opens instead, and each
   * card carries its own resume point — the progress is still used, it is just presented as a
   * choice rather than acted on.
   *
   * The splash is hidden LAST and explicitly, rather than on a timer, because it is the only
   * thing covering the gap between "React mounted" and "the picker is on screen with its audio
   * ready". A timer either flashes it away early or holds it after the app is usable.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await prepareDevice();
      await audio.current.load();

      const saved = await loadProgress();
      if (!cancelled) setProgress(saved);

      if (!cancelled) await dismissSplash();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Fit the fixed logical stage into whatever viewport this is, letterboxing rather
   * than stretching. Every coordinate in the game is in logical units and this is the
   * only place the real screen size is considered.
   */
  useEffect(() => {
    const fit = () => {
      /*
       * Layout BEFORE scale, and in that order for a reason: the scale below is a ratio
       * against whichever stage this picks, so reading STAGE first would size the new
       * orientation against the old rectangle for one frame.
       */
      applyLayout(orientationFor(window.innerWidth, window.innerHeight));
      setOrientation(currentOrientation());
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
   * Say the token's name whenever a new block is presented.
   *
   * Keyed on the round and the phase being playable, so it fires on a fresh round but
   * NOT when the block springs back after a wrong drop — repeating the name on every
   * retry turns the cue into nagging, and the child already knows what they are
   * holding.
   *
   * Guarded on the screen too, or leaving a track mid-round would announce a letter to an empty
   * picker.
   */
  useEffect(() => {
    if (screen !== "playing" || phase !== "playing" || !round) return;
    audio.current.play(tokenClip(round.token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, levelIndex, rounds, screen]);

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
     * The beat is 900ms, and a block that ignores a two-year-old for the best part of a second
     * does not read as "wait", it reads as broken — they will grab at it, get nothing, and grab
     * harder. Letting the drag start returns control immediately. Nothing is lost: the X and
     * the knock have already delivered the message by the time a child has reached for the
     * block again.
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

    // The board is shuffled from the second level of every track, so a hole's position is not
    // its token.
    if (round && sameToken(arrangement[position], round.token)) {
      setPos({ x: holeCenterX(position), y: holeCenterY(position) });
      setSeatedPos(position);
      setOkNonce((n) => n + 1);
      // A different animal each time, never the same one twice running.
      setSpecies((previous: Species | null) => pickSpecies(previous?.id ?? null));
      setPhase("correct");
      hapticCorrect();

      /*
       * Applause on the instant, then a different word of praise every time.
       *
       * The applause is what fires immediately — it is the impact, and it wants to land on the
       * same frame as the block seating. The praise is held back 220ms so it lands in the tail
       * of the clap rather than underneath it: applause is broadband noise and it makes a
       * simultaneous "Good job!" almost unintelligible, which was true of the recorded
       * "Hooray!" too and simply mattered less when the words never changed.
       *
       * Well inside CORRECT_HOLD (1.7s): the longest line here is about 900ms at rate 1.0, so
       * it has finished before the next block arrives.
       */
      const praise = pickPraise(lastPraise.current);
      lastPraise.current = praise;
      audio.current.play("clap");
      audio.current.play(praise, 0.22);
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

  /**
   * Start one level of one track, and reset everything a level owns.
   *
   * Takes the track explicitly rather than reading `trackId` from state, because the picker
   * calls it in the same tick as the track changes and reading state there would build the
   * board from the OUTGOING track — four colour holes under a letter block.
   */
  const startLevel = useCallback((id: Mode, index: number) => {
    const next = trackById(id).levels[index];
    const arrangement = makeArrangement(next);
    setTrackId(id);
    setLevelIndex(index);
    setBoard({ arrangement, rounds: makeRounds(next, arrangement) });
    setRoundIndex(0);
    setWrong(0);
    setSeatedPos(null);
    setWrongPos(null);
    setPos(BLOCK_HOME);
    setPhase("playing");
  }, []);

  /** A card was tapped on the picker: resume that track where it was left. */
  const pickTrack = (id: Mode) => {
    // The picker tap is usually the session's first gesture, so it is what unlocks audio.
    audio.current.unlock();

    const saved = progress[id];
    const chosen = trackById(id);
    /*
     * Clamped, because a stored index only has to be a valid index — it does not have to be
     * valid for THIS build. Removing a level from a track without bumping LEVELS_VERSION would
     * otherwise land here as an undefined level and a blank board.
     */
    const index = Math.min(saved?.levelIndex ?? 0, chosen.levels.length - 1);

    setStars(saved?.stars ?? 0);
    startLevel(id, Math.max(0, index));
    setScreen("playing");
  };

  /**
   * Open the animal park.
   *
   * Nothing to resume and nothing to set up — it holds no progress, so this is the tap that
   * unlocks audio and a screen change. That is the whole of what "not a game" buys.
   */
  const openAnimals = () => {
    audio.current.unlock();
    setScreen("animals");
  };

  /**
   * Open the memory board.
   *
   * Nothing to resume and nothing to set up, exactly like the park: it holds no progress, so
   * this is the tap that unlocks audio and a screen change.
   */
  const openMemory = () => {
    audio.current.unlock();
    setScreen("memory");
  };

  /**
   * Open the boxes game.
   *
   * Nothing to resume and nothing to set up, like the park and the memory board — and here that
   * is not only because it holds no progress. The board size and the opponent are chosen on the
   * game's own setup screen every time, so there is no saved state that a resume could restore
   * to the wrong thing. See the note on `phase` in components/Boxes.tsx.
   */
  const openBoxes = () => {
    audio.current.unlock();
    setScreen("boxes");
  };

  /**
   * Open the bubble game.
   *
   * The one of the four non-track screens that DOES hold progress, so unlike the other three
   * this is not just a screen change — the component is handed where it was left and what it has
   * banked, and hands back a level and a star count when one is finished. It owns its own level
   * and round state; this file owns only the storage, which is the same division the tracks have
   * except inverted.
   */
  const openBubbles = () => {
    audio.current.unlock();
    setScreen("bubbles");
  };

  /**
   * Bank the bubble game's progress.
   *
   * Writes that one slot and carries the other four through untouched, exactly as a finished
   * track level does — which is the entire point of progress being keyed by game rather than
   * held as one number.
   */
  const bankBubbles = useCallback(
    (levelIndex: number, stars: number) => {
      setProgress((current) => {
        const next: Progress = { ...current, bubbles: { levelIndex, stars } };
        void saveProgress(next);
        return next;
      });
    },
    [],
  );

  /**
   * Back to the picker, from the HUD button, the park, or finishing a track.
   *
   * Phase is reset on the way out. Leaving it as "correct" would leave a feedback timer to fire
   * against a screen that is no longer up, and the sparkles and the X would still be mounted
   * over the first frame of the next track.
   */
  const goMenu = () => {
    audio.current.unlock();
    setPhase("playing");
    setSeatedPos(null);
    setWrongPos(null);
    setScreen("menu");
  };

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
        startLevel(trackId, levelIndex);
        return;
      }

      setSeatedPos(null);

      if (roundIndex + 1 >= rounds.length) {
        const earned = stars + starsFor(wrong);
        setStars(earned);
        /*
         * Save the level AFTER this one: reopening should offer what comes next, not replay
         * what was just finished. Written into this track's slot only — the other three are
         * carried through untouched, which is the entire point of keying progress by track.
         */
        const next: Progress = {
          ...progress,
          [trackId]: {
            levelIndex: Math.min(levelIndex + 1, levels.length - 1),
            stars: earned,
          },
        };
        setProgress(next);
        void saveProgress(next);
        setPhase("levelDone");
        audio.current.play(
          levelIndex + 1 >= levels.length ? "cheer" : "nextlevel",
          0.35,
        );
        return;
      }

      setRoundIndex((i) => i + 1);
      setPos(BLOCK_HOME);
      setPhase("playing");
    }, hold);

    return () => window.clearTimeout(timer);
  }, [
    phase,
    roundIndex,
    rounds.length,
    levelIndex,
    levels.length,
    trackId,
    progress,
    wrong,
    stars,
    startLevel,
  ]);

  const advance = () => {
    audio.current.unlock();
    if (levelIndex + 1 >= levels.length) {
      setPhase("gameDone");
      return;
    }
    startLevel(trackId, levelIndex + 1);
  };

  /**
   * Replay the finished track from level 1.
   *
   * Zeroes THIS track and saves the map, rather than calling clearProgress — a child replaying
   * colours should not lose the number stars they earned yesterday.
   */
  const replayTrack = () => {
    audio.current.unlock();
    const next: Progress = {
      ...progress,
      [trackId]: { levelIndex: 0, stars: 0 },
    };
    setProgress(next);
    void saveProgress(next);
    setStars(0);
    startLevel(trackId, 0);
  };

  const stageStyle = useMemo(
    () => ({
      width: STAGE.width,
      height: STAGE.height,
      transform: `scale(${scale})`,
    }),
    [scale],
  );

  const interactive =
    screen === "playing" && (phase === "playing" || phase === "wrong");

  return (
    <div className="viewport">
      <div key={orientation} ref={stageRef} className="stage" style={stageStyle}>
        {screen === "menu" ? (
          <Menu
            progress={progress}
            onPick={pickTrack}
            onAnimals={openAnimals}
            onMemory={openMemory}
            onBoxes={openBoxes}
            onBubbles={openBubbles}
          />
        ) : screen === "animals" ? (
          <Animals
            onMenu={goMenu}
            onSound={(clip) => audio.current.playAlone(clip as SoundName)}
            clipLength={(clip) => audio.current.duration(clip as SoundName)}
          />
        ) : screen === "memory" ? (
          <Memory
            onMenu={goMenu}
            onSound={(clip) => audio.current.playAlone(clip as SoundName)}
            clipLength={(clip) => audio.current.duration(clip as SoundName)}
          />
        ) : screen === "bubbles" ? (
          <Bubbles
            onMenu={goMenu}
            onSound={(clip, delay) =>
              audio.current.play(clip as SoundName, delay)
            }
            onPopSound={() => audio.current.pop()}
            resumeAt={progress.bubbles?.levelIndex ?? 0}
            bankedStars={progress.bubbles?.stars ?? 0}
            onBanked={bankBubbles}
          />
        ) : screen === "boxes" ? (
          /*
            `play` rather than the `playAlone` the other two screens get, because a claimed box
            fires the applause and a word of praise as one gesture — the same overlap the tracks
            use on a correct answer, and the thing `playAlone` exists to prevent.
          */
          <Boxes
            onMenu={goMenu}
            onSound={(clip, delay) =>
              audio.current.play(clip as SoundName, delay)
            }
          />
        ) : (
          <>
            <Hud
              title={track.title}
              level={level.n}
              totalLevels={levels.length}
              stars={stars}
              wrong={wrong}
              round={roundIndex + (phase === "correct" ? 1 : 0)}
              rounds={rounds.length}
              nonce={okNonce}
              onMenu={goMenu}
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
                  Keyed by track, level and round so each new block is a fresh element.
                  Without the key the block would animate from the hole it just dropped into
                  back up to the start position, which reads as the machine spitting it out
                  again.
                */}
                <Block
                  key={`${trackId}-${levelIndex}-${roundIndex}`}
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
                <Sparkles
                  x={holeCenterX(seatedPos)}
                  y={holeCenterY(seatedPos)}
                  nonce={okNonce}
                />
                {species ? <Critter species={species} nonce={okNonce} /> : null}
              </>
            ) : null}

            {(phase === "wrong" || phase === "restarting") &&
            wrongPos !== null ? (
              <WrongMark
                x={holeCenterX(wrongPos)}
                y={holeCenterY(wrongPos)}
                nonce={wrongNonce}
              />
            ) : null}

            {phase === "restarting" ? <RestartCard /> : null}

            {phase === "levelDone" ? (
              <LevelDoneCard
                level={level.n}
                stars={starsFor(wrong)}
                wrong={wrong}
                isLast={levelIndex + 1 >= levels.length}
                onNext={advance}
              />
            ) : null}

            {phase === "gameDone" ? (
              <GameDoneCard
                title={track.title}
                stars={stars}
                maxStars={maxStars(track)}
                onReplay={replayTrack}
                onMenu={goMenu}
              />
            ) : null}
          </>
        )}
      </div>

    </div>
  );
};
