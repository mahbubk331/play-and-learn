/**
 * Dots and Boxes: the grid, the rules, and the opponent.
 *
 * DATA AND RULES ONLY, no JSX and no DOM — the same split memory.ts and animals.ts make, and
 * for the same reason: the rules and the opponent are the part worth reasoning about on their
 * own, and the part a test can reach without a browser. components/Boxes.tsx owns the screen.
 *
 * WHY THIS IS A SCREEN AND NOT A FIFTH TRACK, same answer as the memory board: every `Track`
 * runs one engine over the token model (tokens.ts), dragging a block into the hole that matches
 * it. Nothing here drags, and there is no matching answer to be right about — there is an
 * opponent. Bolting it onto the track engine would mean a "hole" that plays back.
 *
 * AND IT IS THE ONE SCREEN IN THIS APP THAT IS NOT FOR A TWO-YEAR-OLD. Everything else is
 * recognition with no way to lose. This has a winner, and on the 4x4 and 5x5 boards it is a
 * genuinely deep game. That is deliberate rather than an oversight: it is here so an older
 * sibling has something of their own in the app, and the 2x2 board is the little one's way in.
 * It is also why this is the only screen whose words are written to be read BY THE PLAYER
 * rather than by the adult beside them.
 *
 * THE RULES IN FULL, because the extra-turn rule is the whole game:
 *
 *   1. Players take turns drawing one line between two neighbouring dots.
 *   2. Drawing the FOURTH side of a box claims it — and you go again, as many times over as
 *      you keep completing boxes.
 *   3. The game ends when every line is drawn. Most boxes wins.
 *
 * Rule 2 is what makes this more than noughts and crosses. Drawing the THIRD side of a box
 * hands it over for free, so the middle game is about being the last player with a harmless
 * move left; and the endgame is about DECLINING boxes on purpose — see `chooseEdge`.
 */

/** A board, measured in BOXES rather than dots. A 3x3 grid is 9 boxes and 16 dots. */
export type Grid = { cols: number; rows: number };

/** 0 always plays blue, 1 always plays orange. See PLAYERS in components/Boxes.tsx. */
export type Player = 0 | 1;

/**
 * The board sizes on offer, in boxes per side.
 *
 * A SETTING RATHER THAN A RAMP, which is the opposite of the call memory.ts makes, and the
 * reason is that here the size changes the GAME and not just its length. Two boxes is a puzzle
 * with one idea in it; five is a board where chain parity decides the result. A ramp would
 * start a thirteen-year-old on the toddler board and make them win their way out of it.
 *
 * Square only. A rectangle plays fine, but the board is fitted into one square area on both
 * stages (see boxesGrid in stage.ts) and an oblong would leave the short side's dots adrift in
 * a lot of empty room.
 */
export const SIZES = [
  { boxes: 2, title: "Tiny", blurb: "4 boxes" },
  { boxes: 3, title: "Small", blurb: "9 boxes" },
  { boxes: 4, title: "Big", blurb: "16 boxes" },
  { boxes: 5, title: "Huge", blurb: "25 boxes" },
] as const;

/** How hard the computer plays. See `chooseEdge` for what each one actually does. */
export type Skill = "rookie" | "tricky" | "sharp";

/** Who is holding the other colour. "human" is pass-and-play on one screen. */
export type Opponent = "human" | Skill;

export const OPPONENTS = [
  { id: "human", title: "2 players", blurb: "Share the screen" },
  { id: "rookie", title: "Rookie", blurb: "Gives boxes away" },
  { id: "tricky", title: "Tricky", blurb: "Plays it safe" },
  { id: "sharp", title: "Sharp", blurb: "Plays to win" },
] as const satisfies readonly { id: Opponent; title: string; blurb: string }[];

/*
 * HOW A BOARD IS NUMBERED.
 *
 * Every line is an EDGE with an id, horizontals first then verticals, so a position is one flat
 * array and the opponent's search can key on a bitmask over it. The alternative — a {kind, row,
 * col} object per line — reads better at the call site and allocates a million objects inside
 * `exactBest`, which is the one place in this app where that matters.
 *
 *   horizontal  h(r, c)  r in 0..rows    c in 0..cols-1   id = r * cols + c
 *   vertical    v(r, c)  r in 0..rows-1  c in 0..cols     id = hEdges + r * (cols + 1) + c
 *
 * A box is r * cols + c, and its four sides are h(r,c), h(r+1,c), v(r,c), v(r,c+1).
 */
export type Topology = {
  grid: Grid;
  /** Total lines on the board. */
  edges: number;
  /** Total boxes. */
  boxes: number;
  /** Where the verticals start in the edge numbering. */
  hEdges: number;
  /** The four edge ids of each box. */
  sidesOf: number[][];
  /** The one or two boxes each edge can complete. A line on the border touches one. */
  boxesOf: number[][];
};

const buildTopology = (grid: Grid): Topology => {
  const { cols, rows } = grid;
  const hEdges = (rows + 1) * cols;
  const edges = hEdges + rows * (cols + 1);
  const boxes = rows * cols;

  const sidesOf: number[][] = [];
  const boxesOf: number[][] = Array.from(
    { length: edges },
    () => [] as number[],
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const four = [
        r * cols + c,
        (r + 1) * cols + c,
        hEdges + r * (cols + 1) + c,
        hEdges + r * (cols + 1) + c + 1,
      ];
      sidesOf[r * cols + c] = four;
      /*
       * Derived from `sidesOf` rather than worked out again from the numbering. The two have to
       * agree exactly — the whole engine reads one to update the other — and a second
       * derivation of the same arithmetic is a second chance to get an off-by-one into it.
       */
      for (const e of four) boxesOf[e].push(r * cols + c);
    }
  }

  return { grid, edges, boxes, hEdges, sidesOf, boxesOf };
};

/**
 * Cached per size, because the opponent asks for it inside its search loop and building it
 * allocates some hundreds of small arrays. There are four sizes, so this map holds at most four
 * entries for the life of the app.
 */
const topologies = new Map<string, Topology>();

export const topologyFor = (grid: Grid): Topology => {
  const key = `${grid.cols}x${grid.rows}`;
  const cached = topologies.get(key);
  if (cached) return cached;
  const built = buildTopology(grid);
  topologies.set(key, built);
  return built;
};

/** Where a line sits, for drawing it. The inverse of the numbering above. */
export const edgeAt = (
  topo: Topology,
  id: number,
): { kind: "h" | "v"; row: number; col: number } => {
  if (id < topo.hEdges) {
    return {
      kind: "h",
      row: Math.floor(id / topo.grid.cols),
      col: id % topo.grid.cols,
    };
  }
  const k = id - topo.hEdges;
  const span = topo.grid.cols + 1;
  return { kind: "v", row: Math.floor(k / span), col: k % span };
};

/**
 * A game in progress.
 *
 * `lines` and `owners` hold a player index or -1 rather than a boolean, because the screen
 * colours a drawn line by who drew it and the opponent's search only ever asks "is this drawn".
 * One array answers both questions.
 */
export type Game = {
  grid: Grid;
  /** Who drew each line, or -1 for not yet drawn. Indexed by edge id. */
  lines: Int8Array;
  /** Who owns each box, or -1 for unclaimed. Indexed by box index. */
  owners: Int8Array;
  turn: Player;
  /** The line just drawn, so the screen can point at it. Null before the first move. */
  last: number | null;
};

export const createGame = (grid: Grid, first: Player = 0): Game => {
  const topo = topologyFor(grid);
  return {
    grid,
    lines: new Int8Array(topo.edges).fill(-1),
    owners: new Int8Array(topo.boxes).fill(-1),
    turn: first,
    last: null,
  };
};

export const other = (p: Player): Player => (p === 0 ? 1 : 0);

/** Boxes each player holds, as [player 0, player 1]. */
export const scores = (game: Game): [number, number] => {
  let a = 0;
  let b = 0;
  for (const owner of game.owners) {
    if (owner === 0) a++;
    else if (owner === 1) b++;
  }
  return [a, b];
};

/**
 * Every line drawn.
 *
 * The rule as written, rather than the equivalent "every box claimed". They really are
 * equivalent — each line borders at least one box, so all boxes full means all lines drawn —
 * but only one of them is the sentence in the rulebook.
 */
export const isOver = (game: Game): boolean => game.lines.indexOf(-1) === -1;

/** How many sides a box has so far. */
const sideCount = (topo: Topology, lines: Int8Array, box: number): number => {
  let n = 0;
  for (const side of topo.sidesOf[box]) if (lines[side] >= 0) n++;
  return n;
};

/**
 * How many boxes drawing `edge` would complete. Asked BEFORE the line goes down, which is why
 * it looks for three sides rather than four.
 *
 * One line can complete TWO boxes at once — the shared side of a pair that each already had
 * three. That is worth two boxes and still only one extra turn.
 */
const completes = (topo: Topology, lines: Int8Array, edge: number): number => {
  let n = 0;
  for (const box of topo.boxesOf[edge]) {
    if (sideCount(topo, lines, box) === 3) n++;
  }
  return n;
};

/** Would drawing `edge` leave a box on three sides, i.e. hand it over for free? */
const opensABox = (
  topo: Topology,
  lines: Int8Array,
  edge: number,
): boolean => {
  for (const box of topo.boxesOf[edge]) {
    if (sideCount(topo, lines, box) === 2) return true;
  }
  return false;
};

/**
 * Draw one line. Returns the position after it and the boxes it claimed.
 *
 * The arrays are copied rather than mutated, because the caller is React state and the board is
 * at most 60 lines and 25 boxes — the copy costs nothing and it is what lets the screen hold on
 * to the previous position.
 *
 * The turn only passes when NOTHING was claimed. That one line is rule 2.
 */
export const play = (
  game: Game,
  edge: number,
): { next: Game; claimed: number[] } => {
  const topo = topologyFor(game.grid);
  if (game.lines[edge] >= 0) return { next: game, claimed: [] };

  const lines = Int8Array.from(game.lines);
  lines[edge] = game.turn;

  const owners = Int8Array.from(game.owners);
  const claimed: number[] = [];
  for (const box of topo.boxesOf[edge]) {
    if (sideCount(topo, lines, box) === 4) {
      owners[box] = game.turn;
      claimed.push(box);
    }
  }

  return {
    next: {
      ...game,
      lines,
      owners,
      turn: claimed.length > 0 ? game.turn : other(game.turn),
      last: edge,
    },
    claimed,
  };
};

/* ------------------------------------------------------------------------------------------- *
 * THE OPPONENT
 *
 * Three skills, and they are three different algorithms rather than one with a randomness dial.
 * A dial produces an opponent that plays well and then throws a game away for no reason, which
 * a child reads as the computer letting them win. These each play a coherent, describable
 * strategy, and the strategy is what the setup screen is naming:
 *
 *   rookie  Takes a box when one is going. Otherwise plays anywhere. It will happily draw the
 *           third side of a box and hand it over, which is how a beginner plays and is what
 *           makes it beatable by a five-year-old.
 *
 *   tricky  Takes boxes, then avoids handing any over, and when every move hands something over
 *           it opens the SHORTEST chain. That is competent play and it is where most people
 *           stop — it never declines a box, so it loses the endgame to anyone who knows the
 *           double-cross below.
 *
 *   sharp   Solves the position outright once the board is small enough (EXACT_EDGES), and until
 *           then searches one move deep with a playout to the end. It will decline boxes.
 *
 * THE DOUBLE-CROSS, which is the one idea separating `sharp` from `tricky`. When a chain of
 * boxes is opened for you, taking all of it means you then have to open the next chain yourself.
 * Taking all BUT TWO and drawing the line through the middle of the last two gives those two
 * away and forces your opponent to open the next chain instead. Two boxes for the rest of the
 * board is usually a bargain. Nothing in `tricky` can find that move, because it is a move that
 * declines a box sitting right there.
 * ------------------------------------------------------------------------------------------- */

const freeEdges = (topo: Topology, lines: Int8Array): number[] => {
  const free: number[] = [];
  for (let e = 0; e < topo.edges; e++) if (lines[e] < 0) free.push(e);
  return free;
};

/**
 * How many boxes the OTHER player collects if we draw `edge` and they then eat everything
 * reachable without ever declining one. In other words, the length of the chain this move opens.
 *
 * Used to choose the least bad move when every move is bad, which is the position both `tricky`
 * and the playout below spend the endgame in.
 */
const handout = (topo: Topology, lines: Int8Array, edge: number): number => {
  const work = Int8Array.from(lines);
  work[edge] = 0;

  let taken = 0;
  for (;;) {
    let ate = false;
    for (let e = 0; e < topo.edges; e++) {
      if (work[e] >= 0) continue;
      const got = completes(topo, work, e);
      if (got > 0) {
        work[e] = 0;
        taken += got;
        ate = true;
      }
    }
    if (!ate) break;
  }
  return taken;
};

/**
 * The competent-but-not-clever move, used as `tricky` itself and as the playout policy inside
 * `sharp`.
 *
 * DETERMINISTIC when `shuffle` is false, which is what the playout needs: it is comparing two
 * candidate moves by playing both out, and a policy that picks differently between the two
 * playouts would be measuring its own coin flips rather than the moves.
 */
const safeMove = (
  topo: Topology,
  lines: Int8Array,
  free: number[],
  shuffle: boolean,
): number => {
  // A box on three sides is a free box. There is never a reason for this policy to decline one.
  for (const e of free) if (completes(topo, lines, e) > 0) return e;

  const safe = free.filter((e) => !opensABox(topo, lines, e));
  if (safe.length > 0) {
    return shuffle ? safe[Math.floor(Math.random() * safe.length)] : safe[0];
  }

  // Every move opens something, so open the least. This is the endgame.
  let best = free[0];
  let least = Infinity;
  for (const e of free) {
    const loss = handout(topo, lines, e);
    if (loss < least) {
      least = loss;
      best = e;
    }
  }
  return best;
};

/**
 * Play the position out with `safeMove` on both sides, and report the net boxes the side to move
 * ends up AHEAD BY.
 *
 * Net rather than a pair of scores, because that is what the one-move search wants and because
 * it makes the sign flip on a passed turn the only bookkeeping in here.
 *
 * Its blind spot is the double-cross: the policy never declines a box, so a position whose value
 * turns on one is valued wrongly. That is tolerable precisely because the exact solver takes
 * over for the part of the game where declining boxes decides the result.
 */
const playout = (topo: Topology, lines: Int8Array): number => {
  const work = Int8Array.from(lines);
  const free = freeEdges(topo, work);

  let net = 0;
  let sign = 1;

  while (free.length > 0) {
    const edge = safeMove(topo, work, free, false);
    const got = completes(topo, work, edge);
    work[edge] = 0;
    free.splice(free.indexOf(edge), 1);

    // Claimed boxes score for whoever is moving; claiming nothing passes the turn, which from
    // there on flips the sign of everything.
    if (got > 0) net += sign * got;
    else sign = -sign;
  }

  return net;
};

/**
 * How few lines have to be left before the position is solved outright rather than estimated.
 *
 * 18 free lines is 262144 positions and the memo below is one byte each — a 256KB typed array
 * and a few million array reads, which lands inside the THINK pause the screen already waits
 * out for effect. Raising it to 20 quadruples both and starts to be felt on a phone.
 *
 * What it buys, per board: the 2x2 board has 12 lines, so `sharp` plays it perfectly from the
 * opening and cannot be beaten on it. The 3x3 board is solved from its seventh move, the 4x4
 * from its twenty-third, the 5x5 from its forty-third. In every case that covers the endgame,
 * which is the part that decides the game.
 */
const EXACT_EDGES = 18;

/** Outside any real net score, so it can mean "not worked out yet" inside an Int8Array. */
const UNKNOWN = -128;

/**
 * The best line in the position, solved exactly.
 *
 * NEGAMAX WITH THE MASK AS THE WHOLE KEY, and that is only sound because the value returned is
 * net boxes FOR WHOEVER IS TO MOVE. Who that is does not need to be in the key: at a node whose
 * move claimed something the mover keeps the turn and the child value is added, and at one that
 * claimed nothing the turn passes and the child value is negated. Storing an absolute score
 * instead would need the mover in the key and would double the table.
 *
 * The mask is over the lines that were free AT THE ROOT rather than over all of the board's, so
 * the 5x5 board's 60 lines still compress into the 18 bits this is allowed to search.
 */
const exactBest = (
  topo: Topology,
  lines: Int8Array,
  free: number[],
): number => {
  const n = free.length;
  const full = (1 << n) - 1;
  const memo = new Int8Array(full + 1).fill(UNKNOWN);

  /*
   * Mutated in step with the mask rather than copied per node. `drawn` always holds the root
   * position plus exactly the lines in the current mask, which is what makes the memo key valid
   * — see above.
   */
  const drawn = Uint8Array.from(lines, (v) => (v >= 0 ? 1 : 0));

  const filled = (box: number): boolean => {
    for (const side of topo.sidesOf[box]) if (!drawn[side]) return false;
    return true;
  };

  /** Net boxes for the side to move, from the position `mask` describes. */
  const search = (mask: number): number => {
    if (mask === full) return 0;
    const known = memo[mask];
    if (known !== UNKNOWN) return known;

    let best = -127;
    for (let j = 0; j < n; j++) {
      const bit = 1 << j;
      if (mask & bit) continue;

      const edge = free[j];
      drawn[edge] = 1;
      let got = 0;
      for (const box of topo.boxesOf[edge]) if (filled(box)) got++;
      const value = got > 0 ? got + search(mask | bit) : -search(mask | bit);
      drawn[edge] = 0;

      if (value > best) best = value;
    }

    memo[mask] = best;
    return best;
  };

  let bestEdge = free[0];
  let bestValue = -Infinity;
  for (let j = 0; j < n; j++) {
    const edge = free[j];
    drawn[edge] = 1;
    let got = 0;
    for (const box of topo.boxesOf[edge]) if (filled(box)) got++;
    const value = got > 0 ? got + search(1 << j) : -search(1 << j);
    drawn[edge] = 0;

    if (value > bestValue) {
      bestValue = value;
      bestEdge = edge;
    }
  }

  return bestEdge;
};

/**
 * The strong move: solved if the board is small enough, otherwise one move deep with a playout.
 *
 * EVERY FREE LINE IS A CANDIDATE, deliberately, even when boxes are going begging. Narrowing the
 * candidates to "capture if you can" is the obvious saving and it is exactly what hides the
 * double-cross, which is a move that captures nothing played at a moment when captures are
 * available. The cost of not narrowing is one playout per line, and a playout is a few hundred
 * operations on a board this size.
 */
const sharpMove = (topo: Topology, game: Game, free: number[]): number => {
  if (free.length <= EXACT_EDGES) return exactBest(topo, game.lines, free);

  /*
   * Nothing on the board has two sides yet, so no line can be punished and every candidate would
   * come back with the same playout. Skipping the search here covers most of the opening on the
   * 4x4 and 5x5 boards, which is where a playout per line is least affordable.
   */
  let atRisk = false;
  for (let box = 0; box < topo.boxes; box++) {
    if (sideCount(topo, game.lines, box) >= 2) {
      atRisk = true;
      break;
    }
  }
  if (!atRisk) return safeMove(topo, game.lines, free, true);

  const work = Int8Array.from(game.lines);
  let bestEdge = free[0];
  let bestValue = -Infinity;

  for (const edge of free) {
    const got = completes(topo, work, edge);
    work[edge] = 0;
    /*
     * Claiming keeps the turn, so the playout's "side to move" is still us and its value adds.
     * Claiming nothing passes the turn, so the playout belongs to the opponent and subtracts.
     */
    const value = got > 0 ? got + playout(topo, work) : -playout(topo, work);
    work[edge] = -1;

    if (value > bestValue) {
      bestValue = value;
      bestEdge = edge;
    }
  }

  return bestEdge;
};

/**
 * The computer's move, or null if the board is full.
 *
 * Returns an edge id rather than applying it, so the screen stays the only thing that advances
 * the game — which is what lets it put a pause and a sound around each line the computer draws
 * instead of a chain of five appearing at once.
 */
export const chooseEdge = (game: Game, skill: Skill): number | null => {
  const topo = topologyFor(game.grid);
  const free = freeEdges(topo, game.lines);
  if (free.length === 0) return null;

  if (skill === "rookie") {
    // Takes what is offered and is otherwise oblivious, third sides included.
    for (const e of free) if (completes(topo, game.lines, e) > 0) return e;
    return free[Math.floor(Math.random() * free.length)];
  }

  if (skill === "tricky") return safeMove(topo, game.lines, free, true);

  return sharpMove(topo, game, free);
};

/**
 * How long the computer waits before drawing, in ms.
 *
 * Not for realism — the move is ready in single-digit milliseconds — but because a line that
 * appears on the same frame as yours does not read as a reply, and because during a chain of
 * captures an instant five-box sweep reads as a bug rather than as a beating. This is also the
 * budget `EXACT_EDGES` is sized against, so the pause stays a pause rather than becoming a
 * stall.
 */
export const THINK = 480;

/** How long a claimed box celebrates before the screen checks whether the board is finished. */
export const CLAIM_HOLD = 420;
