/**
 * Dots and Boxes.
 *
 * A grid of dots, two players, one line each turn. Complete the fourth side of a box and it is
 * yours — and you go again. The rules and the opponent live in boxes.ts; this file is the screen.
 *
 * THE LOOK AND THE TOUCH ARE SEPARATE LAYERS, which is the one structural decision worth knowing
 * before reading the JSX. The board is drawn as a single SVG with `pointer-events: none`, and
 * every line the player can draw is an invisible <button> on top of it. Splitting them buys two
 * things at once:
 *
 *   the drawn line   spans the whole gap between two dots, corner to corner, because a completed
 *                    box has to look closed. The tap target cannot — see below.
 *   the tap target   is INSET from both dots by 0.18 of the pitch, so the target for a horizontal
 *                    line and the target for the vertical one leaving the same dot do not
 *                    overlap by even a pixel. That matters far more here than it would on the
 *                    memory board: a mis-hit near a dot is not a card you can turn back, it is a
 *                    move, and a move is permanent. Drawing the visual inside the button instead
 *                    would have forced one geometry to serve both jobs, and it would have been
 *                    the visual that gave way.
 *
 * EVERY LINE IS A <button>, same reasoning as the memory board and it applies more strongly: this
 * screen is playable start to finish with tab and Enter, and the tab order runs the horizontals
 * then the verticals, which is at least a consistent path through the board.
 *
 * THE BOARD IS LOCKED while the computer is thinking, and the buttons are really `disabled`
 * rather than merely ignored — an opponent that silently swallowed your tap would look broken,
 * where a target that does not respond to being pressed reads as "not yet".
 */

import { useEffect, useRef, useState } from "react";

import { pickPraise, type SoundName } from "../audio";
import {
  CLAIM_HOLD,
  OPPONENTS,
  SIZES,
  THINK,
  chooseEdge,
  createGame,
  edgeAt,
  isOver,
  other,
  play,
  scores,
  topologyFor,
  type Game,
  type Opponent,
  type Player,
  type Skill,
} from "../boxes";
import { HUES } from "../hues";
import { hapticCorrect, hapticDrop } from "../native";
import { BOXES_SCORE, STAGE, boxesGrid } from "../stage";
import { colors, fonts } from "../theme";
import { Sparkles } from "./Feedback";

/**
 * The human is always player 0, whoever opens.
 *
 * Fixed rather than following whoever moves first, so "your colour" never changes between games.
 * Who STARTS does alternate — see `again` — which is the part that has to alternate to be fair.
 */
const HUMAN: Player = 0;

const hueById = (id: string) => HUES.find((h) => h.id === id) ?? HUES[0];

/**
 * The two sides.
 *
 * Blue and orange out of the seven in hues.ts, and that pair is not arbitrary: they are the two
 * furthest apart for every common kind of colour blindness, which red and green — the obvious
 * two-player pair, and both present in the palette — are not. The same problem the colour track
 * has, with a solution available here that is not available there: nothing on this screen has to
 * BE red or green.
 *
 * A mark is drawn in each claimed box on top of the colour, for the same reason the colour track
 * prints the colour's name under its hole. Colour alone is one channel, and one channel is one
 * thing to get wrong.
 */
const PLAYERS = [
  { hue: hueById("blue"), mark: "circle" as const },
  { hue: hueById("orange"), mark: "square" as const },
];

const skillTitle = (skill: Skill) =>
  OPPONENTS.find((o) => o.id === skill)?.title ?? "Robot";

/**
 * What to call a player.
 *
 * Colour names in two-player, because they are the only names available and because the app
 * teaches those words anyway. "You" against the computer, because "Blue" for yourself reads as a
 * third party in a game with two people in it.
 */
const nameOf = (player: Player, opponent: Opponent) => {
  if (opponent === "human") return PLAYERS[player].hue.word;
  return player === HUMAN ? "You" : skillTitle(opponent);
};

/** The mark in a claimed box: a circle for blue, a square for orange. */
const BoxMark = ({
  player,
  cx,
  cy,
  size,
}: {
  player: Player;
  cx: number;
  cy: number;
  size: number;
}) =>
  PLAYERS[player].mark === "circle" ? (
    <circle cx={cx} cy={cy} r={size / 2} fill={PLAYERS[player].hue.deep} />
  ) : (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      rx={size * 0.22}
      fill={PLAYERS[player].hue.deep}
    />
  );

/** One score card: colour swatch, who it is, and how many boxes they hold. */
const ScoreCard = ({
  player,
  name,
  boxes,
  active,
  left,
  top,
  width,
  height,
}: {
  player: Player;
  name: string;
  boxes: number;
  active: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}) => (
  <div
    className={active ? "boxes-score boxes-score-on" : "boxes-score"}
    style={{ left, top, width, height, borderColor: PLAYERS[player].hue.deep }}
  >
    <svg width={38} height={38} viewBox="0 0 38 38" aria-hidden="true">
      <BoxMark player={player} cx={19} cy={19} size={30} />
    </svg>

    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 30,
        color: colors.ink,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {name}
    </div>

    <div
      style={{
        marginLeft: "auto",
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 42,
        lineHeight: 1,
        color: PLAYERS[player].hue.deep,
      }}
    >
      {boxes}
    </div>
  </div>
);

/** A pill in the setup screen's two rows of choices. */
const Choice = ({
  title,
  blurb,
  chosen,
  onPress,
}: {
  title: string;
  blurb: string;
  chosen: boolean;
  onPress: () => void;
}) => (
  <button
    type="button"
    className={chosen ? "boxes-choice boxes-choice-on" : "boxes-choice"}
    /* Not `disabled` when chosen, and `aria-pressed` rather than a visual state alone: this is a
       toggle group, and a screen reader has to be able to hear which one is on. */
    aria-pressed={chosen}
    onClick={onPress}
  >
    <span className="boxes-choice-title">{title}</span>
    <span className="boxes-choice-blurb">{blurb}</span>
  </button>
);

export const Boxes = ({
  onMenu,
  /** `delay` is in seconds, so a claim can fire the applause and the praise as one gesture. */
  onSound,
}: {
  onMenu: () => void;
  onSound: (clip: string, delay?: number) => void;
}) => {
  const lastPraise = useRef<SoundName | null>(null);
  const nonce = useRef(0);

  /**
   * Setup, then play.
   *
   * The setup screen exists because the size and the opponent change what game this IS, not just
   * how long it takes — see SIZES in boxes.ts. It is also where the three rules are written down,
   * which is the one place in this app that explains a game in words rather than by being
   * obvious.
   */
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [size, setSize] = useState<number>(SIZES[1].boxes);
  const [opponent, setOpponent] = useState<Opponent>("tricky");

  /** Who opened the current game. Kept so the next one can open with the other player. */
  const [starter, setStarter] = useState<Player>(HUMAN);

  const [game, setGame] = useState<Game | null>(null);

  /**
   * The boxes just claimed, and by whom.
   *
   * Drives the sparkle and the "goes again" in the banner, and is cleared the moment a move
   * claims nothing — which is exactly when the turn passes, so one piece of state answers both
   * "what just happened" and "is the same player still up".
   */
  const [beat, setBeat] = useState<{
    boxes: number[];
    by: Player;
    n: number;
  } | null>(null);

  /** Mouse only. There is no hover on a touch screen and nothing here depends on it. */
  const [hover, setHover] = useState<number | null>(null);

  const over = game !== null && isOver(game);
  const [mine, theirs] = game ? scores(game) : [0, 0];

  const begin = (first: Player) => {
    setGame(createGame({ cols: size, rows: size }, first));
    setStarter(first);
    setBeat(null);
    setHover(null);
    setPhase("play");
  };

  /** Another game, same settings, with the other player opening. */
  const again = () => begin(other(starter));

  /**
   * Draw one line, and say something about it.
   *
   * Reads `game` directly rather than going through a `setGame` updater, deliberately: the sounds
   * and the sparkle are side effects, and an updater is called twice under StrictMode in
   * development — which would double every clap and play the praise pool twice as fast.
   */
  const commit = (edge: number) => {
    if (!game || isOver(game) || game.lines[edge] >= 0) return;

    const by = game.turn;
    const { next, claimed } = play(game, edge);
    setGame(next);
    setHover(null);

    if (claimed.length === 0) {
      // A line that claims nothing is most of the game. A tick, and the turn passes.
      setBeat(null);
      hapticDrop();
      return;
    }

    setBeat({ boxes: claimed, by, n: nonce.current++ });

    /*
     * Praise for a person, a knock for the computer.
     *
     * ONCE PER LINE rather than once per box, which matters because a line can claim two and a
     * chain can run to five in a row: a praise clip per box overruns the next one and turns the
     * best moment in the game into noise. The computer gets "bonk" — an impact with no verdict
     * attached. Using the wrong-answer tone there would tell a child they had made a mistake,
     * when what happened is that their opponent played well.
     */
    if (opponent === "human" || by === HUMAN) {
      hapticCorrect();
      onSound("clap");
      const praise = pickPraise(lastPraise.current);
      lastPraise.current = praise;
      onSound(praise, 0.22);
    } else {
      onSound("bonk");
    }
  };

  /*
   * The computer's turn, one line per pass.
   *
   * One move per effect run rather than a loop, so a chain of captures arrives as a chain: the
   * move updates `game`, this effect re-runs because `game` changed, and it waits THINK again
   * before the next line. A loop would draw all five at once, which is the same result and looks
   * like the board glitching.
   *
   * The cleanup is load-bearing, not tidiness. Without it, leaving the screen or starting a new
   * game mid-think fires a move worked out from the position that has just been thrown away.
   */
  useEffect(() => {
    if (!game || over || phase !== "play") return;
    if (opponent === "human" || game.turn === HUMAN) return;

    const timer = window.setTimeout(() => {
      const edge = chooseEdge(game, opponent);
      if (edge !== null) commit(edge);
    }, THINK);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, over, phase, opponent]);

  /*
   * The finishing sound, fired from an effect rather than from the move that ended the board —
   * same reason as the memory game's: at the time the move is handled the board is not finished
   * yet, because the state holding the last line has not been committed.
   */
  useEffect(() => {
    if (!over || !game) return;
    const [a, b] = scores(game);
    if (opponent === "human") {
      onSound("cheer");
      return;
    }
    // "tryagain" is literally the words, which is the right thing to say about a loss.
    onSound(a > b ? "cheer" : a === b ? "nextlevel" : "tryagain");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  /** A tap is the human's only when the computer is not the one to move. */
  const playable =
    game !== null &&
    !over &&
    phase === "play" &&
    (opponent === "human" || game.turn === HUMAN);

  const MenuButton = (
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
  );

  if (phase === "setup") {
    return (
      <div
        className="boxes"
        style={{ width: STAGE.width, height: STAGE.height }}
      >
        <div className="boxes-head">
          {MenuButton}
          <div className="boxes-title">Boxes</div>
        </div>

        <div className="boxes-setup">
          {/*
            THE RULES, WRITTEN OUT, which nothing else in this app does. Everything else is
            learnable by trying it; the extra turn is not — a player who has not been told about
            it reads their own second move as the game having skipped their opponent.
          */}
          <ol className="boxes-rules">
            <li>Draw a line between two dots.</li>
            <li>Close a box and it is yours — then go again.</li>
            <li>Most boxes when the grid is full wins.</li>
          </ol>

          <div className="boxes-group-title">Board</div>
          <div className="boxes-row">
            {SIZES.map((s) => (
              <Choice
                key={s.boxes}
                title={s.title}
                blurb={s.blurb}
                chosen={size === s.boxes}
                onPress={() => setSize(s.boxes)}
              />
            ))}
          </div>

          <div className="boxes-group-title">Playing against</div>
          <div className="boxes-row">
            {OPPONENTS.map((o) => (
              <Choice
                key={o.id}
                title={o.title}
                blurb={o.blurb}
                chosen={opponent === o.id}
                onPress={() => setOpponent(o.id)}
              />
            ))}
          </div>

          <button
            type="button"
            className="replay"
            onClick={() => begin(HUMAN)}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const topo = topologyFor(game.grid);
  const grid = boxesGrid(game.grid.cols, game.grid.rows);
  const { pitch } = grid;

  const dotX = (col: number) => grid.left + col * pitch;
  const dotY = (row: number) => grid.top + row * pitch;

  /**
   * Where the score cards sit: right under the board, whatever size it came out.
   *
   * MEASURED FROM THE ARTWORK, not from `grid.height`. The grid rectangle is spanned by the dot
   * CENTRES, so the bottom row of dots hangs half a dot below it — and with the gap alone the
   * cards came within four units of touching them, close enough on the Tiny board that the dots
   * looked stuck to the card. The extra radius is what makes the gap a gap you can see.
   */
  const scoreTop =
    grid.top + grid.height + pitch * 0.085 + BOXES_SCORE.gap;

  const turnName = nameOf(game.turn, opponent);
  const chaining = beat !== null && beat.by === game.turn;

  return (
    <div className="boxes" style={{ width: STAGE.width, height: STAGE.height }}>
      <div className="boxes-head">
        {MenuButton}

        {/*
          Whose turn, and whether they are mid-chain. `aria-live` because for a player who cannot
          see the board this is the only announcement that the turn moved — and during a chain,
          the only sign that it did not.
        */}
        <div
          className="boxes-turn"
          style={{ borderColor: PLAYERS[game.turn].hue.deep }}
          aria-live="polite"
        >
          <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true">
            <BoxMark player={game.turn} cx={13} cy={13} size={21} />
          </svg>
          <span>
            {over
              ? "Game over"
              : chaining
                ? `${turnName} again!`
                : `${turnName} to draw`}
          </span>
        </div>
      </div>

      {/*
        The board. One SVG, no pointer events — the buttons below own every tap. See the note at
        the top of the file.
      */}
      <svg
        className="boxes-art"
        width={STAGE.width}
        height={STAGE.height}
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        aria-hidden="true"
      >
        {/* Claimed boxes, first so every line is drawn over them. */}
        {Array.from({ length: topo.boxes }, (_, box) => {
          const owner = game.owners[box];
          if (owner < 0) return null;
          const row = Math.floor(box / game.grid.cols);
          const col = box % game.grid.cols;
          return (
            <g key={box} className="boxes-claim">
              <rect
                x={dotX(col)}
                y={dotY(row)}
                width={pitch}
                height={pitch}
                fill={PLAYERS[owner as Player].hue.fill}
              />
              <BoxMark
                player={owner as Player}
                cx={dotX(col) + pitch / 2}
                cy={dotY(row) + pitch / 2}
                size={pitch * 0.3}
              />
            </g>
          );
        })}

        {/* Every line: a faint hint while it is free, the drawer's colour once it is down. */}
        {Array.from({ length: topo.edges }, (_, edge) => {
          const { kind, row, col } = edgeAt(topo, edge);
          const x1 = dotX(col);
          const y1 = dotY(row);
          const x2 = kind === "h" ? dotX(col + 1) : x1;
          const y2 = kind === "h" ? y1 : dotY(row + 1);
          const owner = game.lines[edge];
          const drawn = owner >= 0;

          return (
            <line
              key={edge}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={
                drawn
                  ? PLAYERS[owner as Player].hue.deep
                  : hover === edge
                    ? PLAYERS[game.turn].hue.fill
                    : colors.shadow
              }
              /*
               * The free lines are drawn at all, rather than left blank, because a blank grid of
               * dots does not say where a line may go — and on the 5x5 board "between which two
               * dots" is a real question. Thin and barely there, so the board still reads as the
               * lines that have actually been drawn.
               */
              strokeWidth={drawn || hover === edge ? pitch * 0.1 : pitch * 0.035}
              strokeLinecap="round"
              className={
                edge === game.last ? "boxes-line boxes-line-new" : "boxes-line"
              }
            />
          );
        })}

        {/* The dots last, so a line ends at a dot rather than across it. */}
        {Array.from({ length: (game.grid.rows + 1) * (game.grid.cols + 1) }, (
          _,
          i,
        ) => (
          <circle
            key={i}
            cx={dotX(i % (game.grid.cols + 1))}
            cy={dotY(Math.floor(i / (game.grid.cols + 1)))}
            r={pitch * 0.085}
            fill={colors.ink}
          />
        ))}
      </svg>

      {/*
        The tap targets. Inset from both dots by 0.18 of the pitch so a horizontal target and the
        vertical one leaving the same dot share an edge and no area at all — see the top of the
        file for why that is worth the arithmetic.
      */}
      {Array.from({ length: topo.edges }, (_, edge) => {
        if (game.lines[edge] >= 0) return null;
        const { kind, row, col } = edgeAt(topo, edge);
        const inset = pitch * 0.18;
        const long = pitch * 0.64;
        const thick = pitch * 0.36;

        const rect =
          kind === "h"
            ? {
                left: dotX(col) + inset,
                top: dotY(row) - thick / 2,
                width: long,
                height: thick,
              }
            : {
                left: dotX(col) - thick / 2,
                top: dotY(row) + inset,
                width: thick,
                height: long,
              };

        return (
          <button
            key={edge}
            type="button"
            className="boxes-edge"
            style={rect}
            disabled={!playable}
            onClick={() => commit(edge)}
            onPointerEnter={() => setHover(edge)}
            onPointerLeave={() => setHover((h) => (h === edge ? null : h))}
            onFocus={() => setHover(edge)}
            onBlur={() => setHover((h) => (h === edge ? null : h))}
            aria-label={
              kind === "h"
                ? `Horizontal line on dot row ${row + 1}, between columns ${col + 1} and ${col + 2}`
                : `Vertical line on dot column ${col + 1}, between rows ${row + 1} and ${row + 2}`
            }
          />
        );
      })}

      <ScoreCard
        player={0}
        name={nameOf(0, opponent)}
        boxes={mine}
        active={!over && game.turn === 0}
        left={BOXES_SCORE.left}
        top={scoreTop}
        width={BOXES_SCORE.width}
        height={BOXES_SCORE.height}
      />
      <ScoreCard
        player={1}
        name={nameOf(1, opponent)}
        boxes={theirs}
        active={!over && game.turn === 1}
        /* Mirrored from the right edge rather than laid out left-to-right, so the pair stays
           symmetrical on the stage whatever the card width is. */
        left={STAGE.width - BOXES_SCORE.left - BOXES_SCORE.width}
        top={scoreTop}
        width={BOXES_SCORE.width}
        height={BOXES_SCORE.height}
      />

      {/* On the first of the claimed boxes. Two boxes at once would be two bursts on top of each
          other, which is one burst that looks wrong. */}
      {beat && !over ? (
        <Sparkles
          x={dotX(beat.boxes[0] % game.grid.cols) + pitch / 2}
          y={dotY(Math.floor(beat.boxes[0] / game.grid.cols)) + pitch / 2}
          nonce={beat.n}
        />
      ) : null}

      {over ? (
        <div className="overlay" style={{ animationDelay: `${CLAIM_HOLD}ms` }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 60,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            {mine === theirs
              ? "A draw!"
              : opponent === "human"
                ? `${nameOf(mine > theirs ? 0 : 1, opponent)} wins!`
                : mine > theirs
                  ? "You win!"
                  : `${skillTitle(opponent as Skill)} wins`}
          </div>

          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 46,
              color: colors.text,
              opacity: 0.7,
            }}
          >
            {mine} - {theirs}
          </div>

          {/* "Play again" leads and keeps the settings, because the thing you want after a close
              game is the same game. Same pairing as the memory board's. */}
          <button type="button" className="replay" onClick={again}>
            Play again
          </button>

          {/*
            The other two share a line. Stacked, the card's three buttons plus a title and a
            score come to more than the landscape stage is tall, and what gave way was the top:
            the title ended up behind the turn banner. Side by side they also read as what they
            are — the two ways out, against the one way on.

            They wrap back to a stack on the portrait stage, which is 640 wide and cannot fit
            them; that is `flex-wrap` doing it, not a second layout.
          */}
          <div className="boxes-exits">
            <button
              type="button"
              className="replay replay-second"
              onClick={() => setPhase("setup")}
            >
              Change board
            </button>
            <button
              type="button"
              className="replay replay-second"
              onClick={onMenu}
            >
              Pick a game
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
