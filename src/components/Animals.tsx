import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ANIMALS,
  animalById,
  animalClip,
  askClip,
  soundClip,
  type AnimalId,
} from "../animals";
import { pickNudge, pickPraise, type SoundName } from "../audio";
import { zooArt } from "../critters/zoo";
import { STAGE } from "../stage";
import { colors, fonts } from "../theme";

/**
 * The animal game: four animals roam the screen, the narrator asks for one by name, and finding it
 * earns praise and an invitation to make its noise.
 *
 *   "Can you touch the cow?"  ->  child touches the cow  ->  "Good job!"
 *   ->  [the cow's own noise]  ->  "Can you make the sound the cow makes? Moo, moo!"
 *
 * The last line is the actual point of the section. Everything before it teaches the NAME; that
 * one asks the child to make a noise out loud, which is the only thing anywhere in this app that
 * asks them to produce rather than recognise. Nothing verifies they did it and nothing tries to.
 *
 * NO SCORE, NO LEVELS, NO FAIL STATE — see the note at the top of animals.ts. A wrong touch gets
 * a nudge and the question again, and costs nothing.
 *
 * THREE NESTED ANIMATION LAYERS, and they have to be three separate elements, because all three
 * animate `transform` and CSS animations on the same property do not compose — the last declared
 * simply wins, so one element would do one of these and silently drop the other two:
 *
 *   .zoo-roam-x   horizontal wander. Also the button, so the hit area travels with the animal.
 *   .zoo-roam-y   vertical wander, on a DIFFERENT period.
 *   .zoo-art      the pop, or the shake for a wrong touch.
 *
 * Two oscillations on different periods is what makes them roam the whole screen rather than
 * shuttle along a line: the x and y cycles drift in and out of phase, so the path traced is a
 * slowly-precessing loop that covers the area. It is a Lissajous figure, and it costs no
 * JavaScript at all — no rAF loop, no position state, nothing running between taps.
 */

/** How many roam at once. Four is enough to make finding one a real search, few enough to scan. */
const ON_SCREEN = 4;

/**
 * Where the animals may wander, in stage units. Below the header, inset from the edges.
 *
 * A FUNCTION rather than a const, because it is derived from STAGE and STAGE is chosen at
 * startup from the orientation. As a module-level const it was computed at import time, which
 * on a phone held upright meant the whole park was laid out for the landscape rectangle and
 * every animal roamed a field wider and shorter than the stage it was drawn on.
 */
const field = () => ({
  top: 120,
  bottom: STAGE.height - 20,
  left: 22,
  right: STAGE.width - 22,
});

/**
 * The field is split into four cells, and each animal roams inside one of them.
 *
 * FIRST ATTEMPT LET THEM ROAM THE WHOLE FIELD, and it was wrong in both directions at once: the
 * rest positions only varied over the fraction of the width the sweep did not use, so all four
 * started in roughly the same narrow band — and with random phases they regularly bunched into one
 * corner, three animals deep, with most of the screen empty and their labels unreadable. A tap into
 * that pile is a coin toss, which is not acceptable when the whole task is "touch the cow".
 *
 * Cells are disjoint and each animal's box always fits inside its own, so overlap is impossible by
 * construction rather than by luck. Every cell is ~478x290, so an animal still crosses a good part
 * of the screen, and between the four of them the whole field is covered and in constant motion.
 * A new animal inherits the cell of the one it replaces.
 */
const CELLS = 2;

const SIZE = { min: 126, range: 22 };
/** Seconds for one full sweep. X and Y differ per animal, which is what makes the path wander. */
const SWEEP_X = { min: 13, range: 7 };
const SWEEP_Y = { min: 8, range: 5 };

const ART_RATIO = 200 / 170;
const NAME_HEIGHT = 20;
const POP_MS = 460;
const SHAKE_MS = 520;
/** If the question goes unanswered this long, ask it again rather than leaving them stuck. */
const REASK_MS = 13000;

type Roamer = {
  key: number;
  id: AnimalId;
  /** Which of the four cells it roams inside. Inherited by whoever replaces it. */
  cell: number;
  size: number;
  /** Rest box, which the two roam animations move away from. */
  x: number;
  y: number;
  spanX: number;
  spanY: number;
  sweepX: number;
  sweepY: number;
  delayX: number;
  delayY: number;
};

type Phase = "asking" | "found" | "wrong";

const rand = (min: number, range: number) => min + Math.random() * range;

/** Pick animals that are not already on screen — a duplicate would make the question ambiguous. */
const pickIds = (count: number, taken: AnimalId[]): AnimalId[] => {
  const pool = ANIMALS.filter((a) => !taken.includes(a.id)).map((a) => a.id);
  const out: AnimalId[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
};

const BURST = [-90, -45, 0, 45, 90, 135, 180, 225];

/**
 * Lay an animal out inside its cell, with room to wander.
 *
 * The rest position takes the room the sweep does NOT use, and the sweep takes the rest — so
 * `x + jitter + spanX + width` lands exactly on the cell's right edge and no further. Getting this
 * wrong puts an animal, and its hit area, off the edge of the stage where it cannot be touched.
 */
const place = (id: AnimalId, key: number, cell: number): Roamer => {
  const size = rand(SIZE.min, SIZE.range);
  const width = size * ART_RATIO;
  const height = size + NAME_HEIGHT;

  const FIELD = field();
  const cellWidth = (FIELD.right - FIELD.left) / CELLS;
  const cellHeight = (FIELD.bottom - FIELD.top) / CELLS;
  const cellLeft = FIELD.left + (cell % CELLS) * cellWidth;
  const cellTop = FIELD.top + Math.floor(cell / CELLS) * cellHeight;

  const roomX = Math.max(0, cellWidth - width);
  const roomY = Math.max(0, cellHeight - height);
  // Most of the room goes to the sweep; what is left becomes the starting jitter.
  const spanX = roomX * 0.75;
  const spanY = roomY * 0.7;

  return {
    key,
    id,
    cell,
    size,
    x: cellLeft + (roomX - spanX) * Math.random(),
    y: cellTop + (roomY - spanY) * Math.random(),
    spanX,
    spanY,
    sweepX: rand(SWEEP_X.min, SWEEP_X.range),
    sweepY: rand(SWEEP_Y.min, SWEEP_Y.range),
    // Negative, so every animal is already mid-sweep on the first frame rather than lined up.
    delayX: -Math.random() * 20,
    delayY: -Math.random() * 20,
  };
};

const Roaming = ({
  roamer,
  state,
  onTouch,
}: {
  roamer: Roamer;
  state: "idle" | "popped" | "shaking";
  onTouch: (id: AnimalId) => void;
}) => {
  const Art = useMemo(() => zooArt(roamer.id), [roamer.id]);
  const animal = animalById(roamer.id);

  const width = roamer.size * ART_RATIO;
  const height = roamer.size + NAME_HEIGHT;

  return (
    <button
      type="button"
      className="zoo-roam-x"
      style={{
        left: roamer.x,
        top: roamer.y,
        width,
        height,
        animationDuration: `${roamer.sweepX}s`,
        animationDelay: `${roamer.delayX}s`,
        ["--span-x" as string]: `${roamer.spanX}px`,
        // A popped animal must stop taking taps while it fades, or a fast child pops it twice.
        pointerEvents: state === "popped" ? "none" : "auto",
        zIndex: state === "idle" ? 1 : 2,
      }}
      onPointerDown={() => onTouch(roamer.id)}
      aria-label={animal.name}
    >
      <div
        className="zoo-roam-y"
        style={{
          animationDuration: `${roamer.sweepY}s`,
          animationDelay: `${roamer.delayY}s`,
          ["--span-y" as string]: `${roamer.spanY}px`,
        }}
      >
        <div
          className={
            state === "popped"
              ? "zoo-art zoo-pop"
              : state === "shaking"
                ? "zoo-art zoo-shake"
                : "zoo-art"
          }
        >
          <svg viewBox="0 0 200 170" width={width} height={roamer.size}>
            <Art />
          </svg>
        </div>

        {state === "popped" ? (
          <div className="zoo-burst" style={{ top: roamer.size / 2 }}>
            {BURST.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <span
                  key={deg}
                  style={
                    {
                      ["--dx" as string]: `${Math.cos(rad) * roamer.size * 0.5}px`,
                      ["--dy" as string]: `${Math.sin(rad) * roamer.size * 0.5}px`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        ) : null}

        <div className="zoo-name">{animal.name}</div>
      </div>
    </button>
  );
};

export const Animals = ({
  onMenu,
  onSound,
  /** How long a clip runs, so narration can be chained without guessing. See audio.ts. */
  clipLength,
}: {
  onMenu: () => void;
  onSound: (clip: string) => void;
  clipLength: (clip: string) => number;
}) => {
  const nextKey = useRef(0);
  const timers = useRef<number[]>([]);
  const lastPraise = useRef<SoundName | null>(null);
  const lastNudge = useRef<SoundName | null>(null);

  const [roamers, setRoamers] = useState<Roamer[]>(() =>
    pickIds(ON_SCREEN, []).map((id, i) => place(id, nextKey.current++, i)),
  );
  const [target, setTarget] = useState<AnimalId>(() => roamers[0].id);
  const [phase, setPhase] = useState<Phase>("asking");
  const [poppedKey, setPoppedKey] = useState<number | null>(null);
  const [shakingKey, setShakingKey] = useState<number | null>(null);

  /**
   * A mirror of `roamers`, so `nextRound` can read the current roster without either closing over
   * a stale one or doing its work inside a state updater. Updated in an effect rather than during
   * render, and that is safe here because everything that reads it runs from a tap or a timer —
   * both of which happen well after the commit.
   */
  const roamersRef = useRef(roamers);
  useEffect(() => {
    roamersRef.current = roamers;
  }, [roamers]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /**
   * Ask for an animal, and keep asking.
   *
   * The re-ask is not nagging, it is the opposite: a two-year-old who has forgotten the question
   * has no way to get it back, and a screen full of animals with no task is just noise. Any touch
   * resets the timer, so a child who is engaged never hears it.
   */
  const ask = useCallback(
    (id: AnimalId) => {
      onSound(askClip(id));
      later(() => ask(id), Math.max(REASK_MS, clipLength(askClip(id)) * 1000 + REASK_MS));
    },
    [onSound, later, clipLength],
  );

  // Open with a question. The picker tap that got here is what unlocked audio.
  useEffect(() => {
    ask(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Replace the found animal and ask for a new one.
   *
   * All of this is computed OUTSIDE the state updater, from a mirror ref rather than the closure.
   * The first version did the work inside `setRoamers(current => ...)` and called `ask`, `setTarget`
   * and `place` from in there — an impure updater, which React is entitled to run twice, and does.
   * The symptom was the new question being spoken twice per round and a wasted spawn key each time.
   */
  const nextRound = useCallback(
    (foundKey: number) => {
      const found = roamersRef.current.find((r) => r.key === foundKey);
      const others = roamersRef.current.filter((r) => r.key !== foundKey);

      /*
       * The animal just found is excluded as well as the three still on screen.
       *
       * Without it that animal is the one candidate NOT on screen, so it was eligible to respawn
       * instantly — and a dinosaur popping and a new dinosaur fading in at a new position reads as
       * the pop having failed rather than as a new animal arriving.
       */
      const taken = others.map((r) => r.id);
      if (found) taken.push(found.id);

      const [fresh] = pickIds(1, taken);
      // The new animal inherits the vacated cell, so all four cells stay occupied.
      const next =
        fresh && found
          ? [...others, place(fresh, nextKey.current++, found.cell)]
          : others;

      // Ask for one that is definitely on screen.
      const chosen = next[Math.floor(Math.random() * next.length)].id;

      setRoamers(next);
      setTarget(chosen);
      setPhase("asking");
      setPoppedKey(null);
      ask(chosen);
    },
    [ask],
  );

  const touch = (id: AnimalId) => {
    if (phase !== "asking") return;
    clearTimers();

    const roamer = roamers.find((r) => r.id === id);
    if (!roamer) return;

    if (id !== target) {
      /*
       * Wrong animal. Shake it, say something kind, then ask again.
       *
       * The wrong animal is NOT removed and nothing is scored. At this age a wrong answer that
       * costs something stops the guessing, and guessing is the activity.
       */
      setPhase("wrong");
      setShakingKey(roamer.key);
      const nudge = pickNudge(lastNudge.current);
      lastNudge.current = nudge;
      onSound(nudge);

      later(() => setShakingKey(null), SHAKE_MS);
      later(
        () => {
          setPhase("asking");
          ask(target);
        },
        Math.max(SHAKE_MS, clipLength(nudge) * 1000 + 250),
      );
      return;
    }

    /*
     * Found it. Three things in a row, timed off the real clip lengths rather than guessed:
     * praise, the animal's own noise, then the invitation to copy it.
     */
    setPhase("found");
    setPoppedKey(roamer.key);

    const praise = pickPraise(lastPraise.current);
    lastPraise.current = praise;
    onSound(praise);

    const afterPraise = clipLength(praise) * 1000 + 180;
    later(() => onSound(animalClip(id)), afterPraise);

    const afterNoise = afterPraise + clipLength(animalClip(id)) * 1000 + 220;
    later(() => onSound(soundClip(id)), afterNoise);

    // Leave a beat after the invitation for the child to actually answer it out loud.
    const afterInvite = afterNoise + clipLength(soundClip(id)) * 1000 + 1400;
    later(() => nextRound(roamer.key), Math.max(POP_MS + 400, afterInvite));
  };

  const asked = animalById(target);

  return (
    <div className="zoo" style={{ width: STAGE.width, height: STAGE.height }}>
      <div className="zoo-head">
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
          The question, on screen as well as spoken.
          The child cannot read it — it is there for the adult, who otherwise has no idea what was
          asked and cannot help. Keyed by target so it re-animates when the question changes.
        */}
        <div
          key={target}
          className="zoo-ask"
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 38,
            color: colors.ink,
          }}
        >
          Can you touch the{" "}
          <span style={{ color: colors.blockDeep }}>{asked.name}</span>?
        </div>
      </div>

      {roamers.map((roamer) => (
        <Roaming
          key={roamer.key}
          roamer={roamer}
          state={
            roamer.key === poppedKey
              ? "popped"
              : roamer.key === shakingKey
                ? "shaking"
                : "idle"
          }
          onTouch={touch}
        />
      ))}
    </div>
  );
};
