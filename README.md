# Shape Machine — the drag-and-drop game

The playable version of the [Wrong-Shape Machine](../remotion-app/src/wrongshape/README.md)
video. A block appears, its shape is spoken aloud, and you drag it to the hole it fits.

- **Right hole** → **one of five animals runs in and applauds** — dinosaur, tiger, lion,
  monkey or cow, picked at random — plus applause, **a different word of praise every time**
  ("Good job!", "Great work!", "Keep it up!", or the recorded "Hooray!"), and a progress star
- **Wrong hole** → a big red X on the hole you chose, a knock and a soft "no" tone, and one
  of three tries is spent
- **Three wrong tries** → "Let's try again!" and the level restarts
- **Level complete** → 1–3 stars depending on how many tries it took, then the next level

**Four games, chosen from a picker** — colours, shapes, numbers, letters — with their own
levels, their own level numbering and their own saved progress. Eighteen levels in total, and
54 stars.

**Plus four more games**, on the picker's second row:

- **Bubbles** — a scatter of bubbles, each holding a colour, shape, numeral or letter. One is
  asked for; pop it and it bursts. Four levels, one per kind, with the same three-try rule and
  stars the tracks have. See [The bubble game](#the-bubble-game).
- **Animals** — four animals roam the screen and the narrator asks for one: "Can you touch the
  cow?" Find it and you get praised, hear the cow, and are invited to moo back. Sixteen animals,
  no levels, no score, nothing to lose.
- **Memory** — pairs of animals face down; turn two over. Three, four then six pairs, stepping up
  each time a board is finished. No score, no timer, no fail state.
- **Boxes** — Dots and Boxes, for the older sibling. Two players, or a computer opponent at three
  strengths. Under its own heading on the picker, **"Fun game for kids"**, because it is the one
  thing in the app that teaches nothing and the one thing that can be lost; see
  [The boxes game](#the-boxes-game).

## Commands

```bash
bun install
bun run dev            # http://localhost:5173
bun run dev --host     # also serves on the LAN, for a tablet
bun run build          # static site in dist/
bun run preview        # serve the build
bun run lint           # tsc --noEmit
```

Regenerating audio. The letter, praise and animal clips are generated **from this repo**;
everything else still lives in the Remotion project:

```bash
# letters + praise + animals. Needs two packages that are deliberately not dependencies:
bun add -d msedge-tts playwright-core
node scripts/gen-voice.mjs           # write game-l*, game-p*, game-a* into public/audio
node scripts/gen-voice.mjs --check   # verify pronunciation and lengths, write nothing

# then re-apply the five real animal recordings, which overwrite five of the game-a* clips.
# ORDER MATTERS: gen-voice.mjs writes a voice clip for all sixteen animals, so running it
# afterwards would silently replace the real recordings with imitations again.
node scripts/fetch-animal-sounds.mjs # tiger, cat, dog, duck, horse + rewrite ATTRIBUTION.md

cd ../remotion-app
python scripts/gen-kids-sfx.py       # clap, bonk, wrong tone, T-rex roar
bun run voice shapegame              # spoken shape names + phrases
bun run voice kids                   # the shared "Hooray!"
python scripts/export-game-audio.py  # trim + copy into this project
```

## Deploying

Firebase Hosting, project `mkhan-play-and-learn`. Two workflows in
[.github/workflows](.github/workflows):

| Trigger | Channel |
|---|---|
| push to `main`, or **Run workflow** on the Actions tab | `live` |
| any pull request **from this repo** | a preview channel, expiring in 7d |

Forked PRs are skipped rather than run, by the `if:` on the preview job: the trigger is
`pull_request` and not `pull_request_target`, so a fork never gets the deploy credential, and a
job that cannot deploy should not spend nine minutes discovering it.

### The one-time setup, which is easy to forget

**Both workflows need a repository secret**, `FIREBASE_SERVICE_ACCOUNT_MKHAN_PLAY_AND_LEARN`,
holding a service-account JSON key for the project. There is no fallback and no default — without
it nothing can deploy.

```bash
firebase init hosting:github    # creates the service account AND uploads the secret
```

Answer **no** when it offers to overwrite the two workflow files; the ones here are already set up
(and commented). Or do it by hand: Firebase console → Project settings → Service accounts →
Generate new private key, then paste the whole JSON into Settings → Secrets and variables →
Actions.

**This was missed once, and it cost an afternoon.** The workflows were committed on a branch and
only reached `main` later, so their first ever run was also their first failure — and the deploy
action's error for a missing credential mentions neither the secret nor the workflow. Both
workflows now **check the credential as their very first step** and fail with a message naming it,
ahead of installing ffmpeg, bun and running a production build. If a run gets past that step and
still fails, the credential exists and the problem is something else.

## The four games

The home screen is a picker: four game cards plus the animal game ([Menu.tsx](src/components/Menu.tsx)).
Tap a game and you are in that track, at the level it was last left on; the grid button in the
HUD comes back here.

**It used to be one thirteen-level ladder** — colours, then shapes, then numbers, in the order a
child acquires the skills. That ordering was right about the skills and wrong about the child in
front of the tablet: a two-year-old working on colours had to be walked past the shape and
number levels by an adult, and a four-year-old who wanted numbers had to sit through six levels
of things they already knew.

| Track | Levels | Stars | What it asks |
|---|---|---|---|
| **Colours** | 3 | 9 | drop the ball in the matching coloured hole |
| **Shapes** | 3 | 9 | circle, square, triangle, star |
| **Numbers** | 7 | 21 | numerals, 1 to 20 |
| **Letters** | 5 | 15 | capitals, A to Z |

**Nothing is locked.** The card order is still the acquisition order, and it is a
recommendation. A gate would mean a four-year-old who is ready for letters has to be walked
through colours first, and the person doing the walking is the one holding the tablet.

The picker is designed for two readers at once, which is the whole difficulty of that screen.
The child cannot read a word of it, so every card leads with a picture of what the track
actually asks for — four coloured dots, the four outlines, "123", "ABC" — drawn from the same
`SHAPES` polygons and `HUES` values the board uses, so a card cannot advertise a game the track
does not contain. The adult is the one choosing, and needs the blurb and the star count.

**Opening the app no longer resumes into a level**, which it used to do. It cannot: there are
four tracks and no way to know which one the child wants today, and guessing "the one they
played last" would drop a child who wanted letters into numbers with no explanation. The saved
progress is still used — it is just presented as a choice rather than acted on, one resume point
per card.

### The levels in each track

| Track | Level | Rounds | Tokens | Board | Blocks |
|---|---|---|---|---|---|
| Colours | 1 | 6 | **4 of 7 colours** | fixed order | — |
| Colours | 2-3 | 8 | 4 of 7 colours | shuffled | — |
| Shapes | 1 | 6 | 4 shapes | fixed order | upright |
| Shapes | 2 | 8 | 4 shapes | shuffled | upright |
| Shapes | 3 | 8 | 4 shapes | shuffled | rotated up to 32 deg |
| Numbers | 1 | 6 | numbers **1-5** | shuffled | upright |
| Numbers | 2 | 8 | numbers **1-10** | shuffled | upright |
| Numbers | 3-6 | 8 | numbers 1-12 ... 1-18 | shuffled | upright |
| Numbers | 7 | 8 | numbers **1-20** | shuffled | upright |
| Letters | 1 | 6 | letters **A-E** | alphabetical | upright |
| Letters | 2 | 8 | letters **A-J** | shuffled | upright |
| Letters | 3-4 | 8 | letters A-P, A-U | shuffled | upright |
| Letters | 5 | 8 | letters **A-Z** | shuffled | upright |

Level 1 of every track keeps its holes in their natural order — shapes as authored, hues in
palette order, numerals and letters ascending. That is the same promise the video series makes,
and it is what lets a new player answer by position before they can answer by shape.

### The colour levels

Seven hues in [hues.ts](src/hues.ts); **four drawn at random per attempt**, so a replay is a
different board. Seven is enough that the four are rarely the same twice; more than that and the
hues start colliding with each other rather than being distinct names to learn. There is no
range to ramp across the three levels — the difficulty comes from the board being unfamiliar,
not from more colours being on it.

**On red and green:** both are present and that is unavoidable — you cannot teach colour names
without them. The mitigations are the Sorting Factory video's: they are never adjacent in the
palette order, the colour's **name is printed** under its hole, and it is **spoken** when the
block appears. A colour-blind child can play by word and by position.

### The shape levels

"Harder" cannot mean "more shapes" — there are only four. It means removing the crutches, in the
order a child stops needing them: level 1's fixed order lets them answer by position (a real
intermediate step, not cheating), level 2 takes that away, level 3 additionally requires
recognising an outline independently of its orientation.

### The number levels

The ramp is the *range*. The board still shows **four numerals at a time**, because four is what
fits and four is what a child can scan — a wider range does not mean a busier board, it means
the four could be any of more numbers, so recognising them matters more than remembering where
they were. A replay draws a different four.

**Rotation stays off here.** A rotated numeral is a different and much harder question than a
rotated triangle — 6 and 9 stop being distinguishable at all — and it is not the skill these
levels are for. The same goes for letters, where it would also collapse M into W.

### The letter levels

The same shape of ramp as numbers, over A-E, A-J, A-P, A-U, A-Z: four holes throughout, a
widening pool to draw them from.

**Uppercase only** ([letters.ts](src/letters.ts)), and that is a decision rather than a
shortcut. Two reasons, and the second is mechanical:

1. Capitals are the forms a two-to-five year old meets first, and they are far more distinct
   from each other than lowercase is — b, d, p and q are four rotations of one shape, and a game
   whose entire premise is "does this fit that hole" would be teaching the confusion rather than
   the letters.
2. Every capital sits on the baseline inside one cap height. A hole is a cut-out of its letter,
   so a descender (g, j, p, q, y) would punch through the bottom edge of the board and into the
   strip where the printed labels go. Uppercase keeps every hole on the board face without
   special-casing nine letters.

No letter is left out. I and O are the thin ones and their cut-outs are narrow slots, but that
is only a visual matter: the drop test is distance to the hole **centre**, never whether the
block is inside the outline, so a narrow hole is exactly as easy to hit as a wide one.

Letters are drawn at 100% of the base size against a single digit's 105%, because "W" and "M"
are the widest glyphs in the font by some margin and their hole — cut at `HOLE_SCALE`, so 16%
wider again — has to stay clear of the gap to the next hole. Sizing them per letter was the
alternative and it is worse: the holes would then be visibly different sizes, which is a cue
about which letter it is that has nothing to do with reading it.

**The letter track has no recorded voice yet.** See [Sound](#sound) — it is the one real gap in
the feature.

## The animal game

**The narrator asks for an animal; finding it is the task.** Four animals roam the screen
([Animals.tsx](src/components/Animals.tsx)):

1. "Can you touch the cow?"
2. the child touches the cow → **"Good job!"**
3. the cow's own noise
4. **"Can you make the sound the cow makes? Moo, moo!"**

**Step 4 is the actual point of the section.** Everything before it teaches the NAME; that one asks
the child to make a noise out loud, and it is the only thing anywhere in this app that asks them to
produce rather than recognise. Nothing can verify they did it, and nothing tries to — the
invitation is the whole feature.

**It still has no score, no levels and no fail state**, which is why it is still not a `Track`. A
wrong touch shakes the animal it landed on, gets a kind line ("Have another look!"), and asks the
question again. Nothing is spent. At this age a wrong answer that costs something stops the
guessing, and guessing is the activity — so the wrong animal is not even removed.

Two smaller decisions in the same spirit:

- **The question is on screen as well as spoken.** The child cannot read it; the adult can, and
  otherwise has no idea what was asked and cannot help.
- **An unanswered question is asked again after ~13 seconds.** That is not nagging, it is the
  opposite: a two-year-old who has forgotten the question has no way to get it back, and four
  animals with no task is just noise. Any touch resets the timer, so an engaged child never hears
  it.

### How the game is built

**SIXTEEN ANIMALS, FOUR ON SCREEN.** Bee, owl, elephant and bear were added for this version,
bringing the cast to sixteen. Four at once makes finding one a
real search while staying scannable, and a duplicate is never spawned because that would make the
question ambiguous. Neither is the animal that was just found: it is the one candidate *not* on
screen, so without excluding it a popped dinosaur could be replaced by a new dinosaur fading in
next to where it burst, which reads as the pop having failed.

**THREE NESTED ANIMATION LAYERS, and they have to be three separate elements**, because all three
animate `transform` and CSS animations on the same property do not compose — the last declared
simply wins, so one element would do one of these and silently drop the other two:

| element | does |
|---|---|
| `.zoo-roam-x` | horizontal wander. **Also the button**, so the hit area travels with the animal |
| `.zoo-roam-y` | vertical wander, on a **different** period |
| `.zoo-art` | the pop when found, or the shake when wrong |

The two sweeps having different periods is the whole movement mechanism: they drift in and out of
phase, so the path traced is a slowly-precessing loop rather than a line. It is a Lissajous figure,
and it costs **no JavaScript at all** — no rAF loop, no position state, nothing running between
taps.

**Each animal roams inside one of four cells, and this was wrong first.** Letting all four roam the
whole field failed in both directions at once: rest positions could only vary over the width the
sweep did not use, so all four started in a narrow band — and with random phases they regularly
bunched into one corner, three deep, with most of the screen empty and their labels unreadable. A
tap into that pile is a coin toss, which is not acceptable when the task is "touch the cow". Cells
are disjoint and every animal's box always fits inside its own, so **overlap is impossible by
construction rather than by luck**; a new animal inherits the cell of the one it replaced. Verified,
not assumed: the checks sample every hit area repeatedly *while they move* and assert both zero
overlaps and zero escapes off the stage.

**Narration is chained off real clip lengths, not guesses.** `AudioEngine.duration()` exists for
this. Timings were hard-coded first and were immediately wrong — "Can you touch the crocodile?" is
half a second longer than "Can you touch the cow?", so one fixed delay either talked over itself or
left dead air. The durations are sitting in the decoded buffers, so nothing has to be estimated.

**The state updater had to be made pure.** The first version computed the next round inside
`setRoamers(current => ...)` and called `ask`, `setTarget` and `place` from in there. React is
entitled to run an updater twice, and does — the symptom was the new question being spoken twice
every round and a wasted spawn key each time. The work now happens outside the updater, reading the
roster from a mirror ref.

**`prefers-reduced-motion` stops the roaming** and leaves the animals parked wherever their rest
box put them, which is still a perfectly playable screen: the question is asked, four animals are
visible, one is right. The pop and the shake stay, because those are feedback for something the
user just did.

An earlier version of this screen was a static grid of all twelve in bordered cards. It got two
things wrong that were invisible in code and obvious on screen:

- **The card could not be `overflow: hidden`.** The artwork is taller than the space left under
  the label, so every animal lost its legs, and the tap animation was clipped too.
- **Three animals had their signature feature hidden inside their own skull** — see below.

### The animals are the same cast, drawn once

Five of the twelve — cow, lion, tiger, monkey, dinosaur — are the artwork already drawn for the
animals that applaud a correct answer, reused rather than redrawn, which is most of why twelve
was affordable. The other seven are in [zoo.tsx](src/critters/zoo.tsx), built from the same
`kit.tsx` primitives so the park and the reward beat share one cast rather than having two.

`ZOO_PARTS` is typed `Record<AnimalId, Parts>`, which is what turns "someone added an animal and
forgot to draw it" into a compile error rather than a tile that throws when a child touches it.
That is also why the five reused entries are listed one by one instead of spread in from
`DISTINCT` — a spread of `Record<string, Parts>` satisfies any key check trivially, so it would
have quietly defeated the exhaustiveness it appears to provide. `ANIMALS` needs `as const` for
the same reason: without it every id is `string` and the check silently passes.

The reward pool is deliberately **not** widened in return. It stays at the original five, because
those have been checked against the clap-and-laugh animation and the seven new ones have not.

Adding these also meant scoping `.critter-jaw` and `.critter-arm-*` to `.critter` in the CSS.
Those animations were global and unconditional, so any artwork mounted anywhere would clap once
on mount — every animal applauding as the screen opened. The game and the dev gallery both wrap
in `.critter`, so nothing else changed.

Three of the seven had to be redrawn once after looking at them: the chicken's comb, the goat's
horns and the horse's ears were all authored inside the skull's own outline and were invisible.
Those three features are the entire silhouette cue for those three animals — a white animal with
floppy ears and no horns is a sheep — which is a good argument for rendering the thing before
believing the geometry.

### One game, not four

The tracks are four **level lists**, not four games. Everything downstream works on a **token**
([tokens.ts](src/tokens.ts)), and a level only says which kind it deals in — the board, the
block, the drag, the matching, the scoring and the spoken cue are all one implementation.
Picking "Letters" on the picker selects a level list; it does not select a code path. Adding a
fifth track is an entry in `TRACKS` ([tracks.ts](src/tracks.ts)) plus a token kind.

A track's id **is** its token kind and **is** the key its progress is stored under, so there is
one identifier for "which game is this" rather than three that have to agree.

The four kinds differ in what carries the cue, and each choice is forced:

| kind | the cue |
|---|---|
| **shape** | the hole is a cut-out of that shape; the printed word is a bonus |
| **number** | the hole is a cut-out of the digits, so a "7" drops into a 7-shaped hole |
| **letter** | the same, one letter at a time: an "R" drops into an R-shaped hole |
| **colour** | every hole is the same circle, because a colour cannot be a shape. The coloured rim is the cue, and the name is printed and spoken. The one kind where a block physically fits any hole — unavoidable, and exactly how the Sorting Factory video works |

Adding the letter kind is also what turned `makeArrangement`'s mode dispatch from a ternary
chain into a **switch**, and the difference is not style. The chain tested for "shape", then
"colour", and treated *everything else* as numbers — so the letter mode would have produced a
board full of numerals with no error anywhere. A switch over the `Mode` union means TypeScript
rejects the file until every mode is handled.

**A hole is the shape of its token — including the numerals.** A number block *is* the digit
"7", and it drops into a 7-shaped cut-out. Number holes started as identical squares with the
numeral printed underneath, which meant a block physically fitted any of them and the only
thing telling the holes apart was a label. Cutting the glyph restores the fits/doesn't-fit
fiction the shape levels have, and it costs nothing pedagogically: matching a numeral's *form*
is where numeral recognition starts, and the value is still spoken aloud.

That is why the board punches its holes with an SVG **mask** rather than an even-odd path. A
mask accepts text as happily as a polygon; the even-odd path it replaced could only cut point
lists, which is what forced the square-hole design in the first place. Every hole's geometry
comes from one component (`HoleShape`), so the cut-out, the ink rim, the hover highlight and
the seated block cannot drift apart — and the block is that same component at `scale: 1` while
the hole is at `HOLE_SCALE`, so "the hole is 16% bigger than the block" means one thing across
both kinds.

Two-digit numerals are drawn at 74% size. At full size "11" or "20" would run into the
neighbouring hole; the resulting height difference between "7" and "17" reads as two different
tiles, which they are.

Shape holes still print their word underneath, small. Number holes print nothing — the hole is
the numeral, so a printed one would be the same information twice.

Rounds are drawn **from the arrangement**, not from the whole token space, which is what
stops a number level asking for a numeral — or a letter level asking for a letter — that is not
on the board. The four tokens per board are always distinct: two holes wanting the same thing
would make one unreachable and the other ambiguous.

## The bubble game

**Pop the one you are asked for** ([bubbles.ts](src/bubbles.ts),
[Bubbles.tsx](src/components/Bubbles.tsx)). Four or five bubbles drift on screen, each holding one
token. The name is spoken, the question is printed, and you touch the answer:

1. "Red" is spoken; **Can you pop the red one?** is printed
2. the child taps the red bubble → it **bursts**, with a pop, applause and a word of praise
3. a wrong tap gets the red X and **costs one of three tries**; three and the level restarts

### It is almost entirely the tracks' engine

This is the cheapest game in the app by some distance, and deliberately so. It runs the same
token model ([tokens.ts](src/tokens.ts)) over the same round generator ([game.ts](src/game.ts))
as the four drag tracks:

| Borrowed | What it gives |
|---|---|
| `makeArrangement` | the distinct tokens that go in the bubbles |
| `makeRounds` | the running order, with nothing asked twice in a row |
| `MAX_WRONG`, `starsFor` | the three tries and the 1–3 stars |
| `Hud` | the title, level, round stars, tries left and score — unchanged |
| `Sparkles`, `WrongMark`, `RestartCard`, `LevelDoneCard`, `GameDoneCard` | every feedback beat |

**What is actually new is the input.** You touch the answer instead of dragging a block to it. So
it is a screen and not a fifth track — a `Track` is a level list the *drag* engine runs — but the
reason is the opposite of the memory board's. There the token model did not fit at all; here it
fits perfectly and only the engine does not.

### The four levels are the four kinds

| Level | Kind | Bubbles | Pool |
|---|---|---|---|
| 1 | Colours | 5 | the 7 hues |
| 2 | Shapes | **4** | all 4 shapes |
| 3 | Numbers | 5 | 1–10 |
| 4 | Letters | 5 | A–J |

**The kind IS the ramp**, which is what makes this four levels rather than four tracks. On the
picker's first four cards the kind is the whole game and the ramp happens inside it — seven number
levels widening from 1–5 to 1–20. Here colours are the easiest thing to pop and letters the
hardest, so moving from one to the next is the progression.

**Shapes has four bubbles because there are only four shapes.** A fifth would have to repeat one,
and a repeat would give the spoken prompt two correct answers. Numbers and letters keep a
deliberately small pool rather than the tracks' full 1–20 and A–Z: this game asks a child to
*find* a character among five at a glance rather than fit one into a hole they can take their time
over, and five of twenty-six is a harder search than five of ten without being a better one.

### The pop is synthesized, not recorded

There is no `pop.m4a`, and there was no way to make one — every other sound here is generated by
scripts in the Remotion project next door, which is not checked out (`sync-shapes.mjs` says so on
every build). So `AudioEngine.pop` builds it in the Web Audio graph from **two voices**:

- **the body** — a sine sweeping steeply *down*, ~800Hz to 150Hz in 90ms. The downward sweep is
  the whole illusion: it reads as a cavity losing its air. Sweeping up is a drip; a fixed pitch is
  a woodblock.
- **the click** — 30ms of noise through a bandpass at 1.9kHz, the film giving way. Without it the
  pop is soft and underwater.

The start frequency is jittered a few hundred Hz per call, for the same reason the praise pool
never repeats a line: a chain of identical pops stops sounding like popping and starts sounding
like one sample being retriggered.

### Three smaller decisions

**The spoken cue is the token's name, not the printed question.** There is no recorded "Can you pop
the red one?" — the only token clips are the bare names, because that is all the tracks needed.
The child hears "Red" and the adult reads the sentence, which is the same split the animal park
makes. It is the same known gap listed below, in a second place.

**The verb varies** — pop, find, touch, never the same twice running. The adult beside the child is
the one reading it out, and one fixed sentence read forty times is one the child stops hearing as
a question.

**Positions reshuffle every round**, which is the one place this departs from the tracks
deliberately. There the board shuffles once per attempt, with a note that per-round would be
re-teaching the board every few seconds instead of testing recognition. That does not transfer: a
bubble drifts while you look at it, so position was never a learnable cue here, and holding them
still between rounds would make them read as buttons on a board.

## The boxes game

**Dots and Boxes** ([boxes.ts](src/boxes.ts), [Boxes.tsx](src/components/Boxes.tsx)). Three rules,
and the third is the game:

1. Draw a line between two neighbouring dots.
2. Close the **fourth side** of a box and it is yours — **then go again**, as many times over as
   you keep closing boxes.
3. The game ends when every line is drawn. Most boxes wins.

**Rule 2 is why this is a real game.** Drawing the *third* side of a box hands it over for free, so
the middle game is about being the last player with a harmless move left. The endgame is about
**declining boxes on purpose**: when a chain is opened for you, taking all of it means you then have
to open the next chain yourself, so taking all *but two* and drawing the line through the middle of
the last two gives those two away and forces your opponent to open the next chain instead. Two boxes
for the rest of the board is usually a bargain.

### It is the one screen here that is not for a two-year-old

Everything else in this app is recognition with no way to lose. This has a winner. That is
deliberate rather than an oversight — it is here so an older sibling has something of their own in
the app — but it does mean the picker now serves two audiences, and the consequences are visible in
the design:

- It is the **only** screen whose words are written to be read **by the player** rather than by the
  adult beside them. The setup screen spells the three rules out, because the extra turn is the one
  thing here that is not learnable by trying it: a player who has not been told about it reads their
  own second move as the game having skipped their opponent.
- It sits **last** in the bottom row, furthest from the colour track a two-year-old would be
  reaching for.
- It is **the only card on the picker with a category heading over it**: *Fun game for kids*. See
  below.
- The **Tiny** board is the little one's way in, and it is first in the size list.

### Its own category on the picker

The Boxes card carries a heading — **"Fun game for kids"** — and nothing else on the picker does.
The four tracks are the app doing what its name says; the park and the memory board still are too,
in that they teach animal names and where things were. Boxes teaches nothing, and it is the only
thing here that can be lost. Left unlabelled among six cards that are all *Play and Learn*, it
reads as a fifth thing to learn from.

**The heading spans exactly the card beneath it** (both come from `extraSlotLeft` in
[stage.ts](src/stage.ts), so they cannot drift apart). That is what scopes it to one card: a
full-width heading over the bottom row would label Animals and Memory as well, and they are not in
this category.

**A fourth card row would have been the obvious way to separate it, and it does not fit on either
stage.** The landscape picker would need about 782 units for four rows of cards against the 720 it
has, and shrinking the track cards to make room reflows the title, blurb and status line inside all
four of them. So the separation is a labelled band instead:

- `menu.extraGap` (44 units) replaces the single `card.gap` that used to sit between the last track
  row and the bottom row. That band is the only room the heading has.
- The 44 units are bought by **starting the track grid higher** — `card.top` 188 → 176 in landscape,
  190 → 170 in portrait — rather than by shrinking any card.
- `wideTop` had to be corrected as part of this. It was `card.top + (height + gap) × rows`, which
  multiplies the gap by the row count; the gap goes *between* rows, so it is `rows - 1` of them plus
  the band once. The old form only gave the right answer because that extra gap was standing in for
  a band nothing was using yet.

### Four sizes, as a setting rather than a ramp

| | Boxes | Lines | |
|---|---|---|---|
| **Tiny** | 4 | 12 | one idea in it; playable by a four-year-old |
| **Small** | 9 | 24 | chains start to matter |
| **Big** | 16 | 40 | the shape of the game as it is played on paper |
| **Huge** | 25 | 60 | chain parity decides the result |

This is **the opposite of the call the memory game makes**, which ramps its board size rather than
offering it. The reason is that here the size changes what the game *is*, not just how long it
takes. A ramp would start a thirteen-year-old on the toddler board and make them win their way out
of it.

Square only. The board is fitted into one square area on both stages, so one dimension is always
slack — 420 units of it on the landscape stage, which is where the score cards go. Stretching the
board into that slack would not make a 4×4 board any bigger, it would just stop it looking like the
thing you draw on paper.

### Three opponents, and they are three algorithms

Not one algorithm with a randomness dial. A dial produces an opponent that plays well and then
throws a game away for no reason, which a child reads as being let off. Each of these plays a
coherent strategy, and the strategy is what the setup screen is naming:

- **Rookie** — takes a box when one is going, otherwise plays anywhere. It will happily draw the
  third side of a box and hand it over. That is how a beginner plays, and it is what makes it
  beatable by a five-year-old.
- **Tricky** — takes boxes, avoids handing any over, and when every move hands something over it
  opens the **shortest** chain. Competent play, and where most people stop. It never declines a box,
  so it loses the endgame to anyone who knows the double-cross.
- **Sharp** — **solves the position outright** once few enough lines are left, and searches one move
  deep with a playout to the end before that. It will decline boxes.

**Sharp's solver is a negamax over a bitmask of the lines still free, with the mask as the whole
memo key.** That last part is only sound because the value returned is *net boxes for whoever is to
move*: at a node whose move claimed something the mover keeps the turn and the child value is
**added**, and at one that claimed nothing the turn passes and the child value is **negated**. An
absolute score would need the mover in the key and would double the table. The mask covers the lines
that were free *at the root* rather than all of the board's, so the Huge board's 60 lines still
compress into the 18 bits the solver is allowed to search.

`EXACT_EDGES = 18` is 262,144 positions at one byte each — a 256KB `Int8Array`, sized to land inside
the 480ms pause the screen already waits out for effect. What it buys, per board:

| Board | Solved from | |
|---|---|---|
| Tiny | move 1 | 12 lines, so **Sharp cannot be beaten on Tiny** |
| Small | move 7 | |
| Big | move 23 | |
| Huge | move 43 | late, but it still covers the endgame |

Above 18 free lines, Sharp searches one move deep over **every** free line with a greedy playout as
the evaluation. Narrowing the candidates to "capture if you can" is the obvious saving, and it is
exactly what hides the double-cross — which is a move that captures nothing, played at a moment when
captures are available.

### The look and the touch are separate layers

The board is a single SVG with `pointer-events: none`, and every line the player can draw is an
invisible `<button>` on top of it. That split exists to let one geometry serve the eye and a
different one serve the finger:

- **The drawn line** spans the whole gap between two dots, corner to corner, because a closed box
  has to look closed.
- **The tap target** is **inset from both dots by 0.18 of the pitch**, so the target for a
  horizontal line and the target for the vertical line leaving the same dot share an edge and *no
  area at all*. That matters more here than anywhere else in the app: a mis-hit near a dot is not a
  card you can turn back, it is a **move**, and a move is permanent.

Drawing the line inside the button instead would have forced one geometry to do both jobs, and it
would have been the visual that gave way.

**Every line is a `<button>`**, same reasoning as the memory board and it applies more strongly:
this screen is playable start to finish with Tab and Enter, and the focus ring is not decoration —
without it a player tabbing through has no way to know which line Enter is about to draw.

### Blue and orange, with a mark in every box

Not red and green, which is the obvious two-player pair and is also both of the two colours that
collide under every common kind of colour blindness. Blue and orange are the furthest apart in that
respect. This is the same problem the colour track has, with a solution available here that is not
available there — nothing on this screen has to *be* red or green.

A **mark** is drawn in each claimed box on top of the colour (a circle for blue, a square for
orange), for the same reason the colour track prints the colour's name under its hole: colour alone
is one channel, and one channel is one thing to get wrong.

### It adds no audio, and reuses the pools carefully

- **You close a box** → applause plus a word of praise, from the same eleven-line pool the tracks
  use. **Once per line, not once per box** — a line can claim two and a chain can run to five, and a
  praise clip per box overruns the next one and turns the best moment in the game into noise.
- **The computer closes a box** → `bonk`, an impact with no verdict attached. Using the
  wrong-answer tone there would tell a child they had made a mistake, when what happened is that
  their opponent played well.
- **The board fills** → `cheer` if you won, `nextlevel` on a draw, `tryagain` if you lost — which is
  literally the words, and the right thing to say about a loss.

### The computer waits 480ms before drawing

Not for realism: the move is ready in single-digit milliseconds. It is because a line that appears
on the same frame as yours does not read as a reply, and because during a chain of captures an
instant five-box sweep reads as a bug rather than as a beating. Each line is one pass of the effect
rather than a loop, so a chain arrives *as* a chain — and the cleanup on that effect is
load-bearing, not tidiness: without it, leaving the screen mid-think fires a move worked out from a
position that has been thrown away.

## Scoring

Stars per level come from the number of wrong tries, since a third wrong restarts:

| Wrong tries | Stars |
|---|---|
| 0 | ★★★ |
| 1 | ★★ |
| 2 | ★ |

Never zero — a level you finished is a level you finished, and a zero-star result for
completing something reads as a failure. Maximum is 54 across the eighteen levels: 9 for
colours, 9 for shapes, 21 for numbers, 15 for letters.

The card also spells out the try count, because the stars are derived from it and
showing only the stars leaves the scoring feeling arbitrary to the adult in the room,
who is the person reading it.

**Stars are counted per track, and the HUD shows the current track's total.** A running total
across all four would climb while you played colours because of numbers you finished yesterday,
which tells a child nothing about what they are doing now. The all-four total is on the picker,
where it is the answer to a question somebody is actually asking. The end-of-track card is the
same: 9/9 for finishing colours, not 9/54, because the second reads as a failure.

Finishing a track offers **Pick a game** first and **Play again** second. Finishing is the
natural moment to try a different track — a child who has just finished colours is exactly who
the shapes track is for — and before the split there was nowhere else to go, so the only offer
was a replay. Replaying is still there, second, and it zeroes **that track only**: a child
replaying colours does not lose the number stars they earned yesterday.

## The three-try restart, and a caveat

This game has a fail state at your request, and it is worth recording that it cuts
against how the rest of the series is built. The videos and the first cut of this game
deliberately had no way to lose, because a two-to-five year old who is told they have
failed tends to stop playing.

Everything around the rule is aimed at keeping that cost small and legible:

- **The three tries are on screen from the first frame.** A consequence a child cannot
  see coming is the version of the rule that actually upsets them; three pips that
  visibly go out make it something they are tracking.
- **A restart costs the current level only.** Stars already banked stay, and so does
  which level you are on.
- **It is announced as "let's try again"** — no red, no "failed", no score shown.
- **A completed level never scores zero.**

If it does turn out to end sessions early, `MAX_WRONG` in `src/levels.ts` is the single
number to change; raising it high restores the original no-lose behaviour.

## Other design decisions that are load-bearing

**Every block is the same colour.** Inherited from the video and it matters more here:
colour-coding the shapes would let a three-year-old solve the whole game by matching
colour to colour without ever looking at an outline. See the note at the top of the
shared `shapes.ts`. Do not "improve" this.

**Dropping in empty space is not a wrong answer.** `holeAt()` returns `null` for a drop
nowhere near a hole, and that path produces no X, no sound and no cost. A failed drag is
a failure of a three-year-old's hands, not of their thinking — and with a three-strike
rule in play, scoring it as wrong would restart levels for no reason.

**Snapping is generous but never ambiguous.** `SNAP_RADIUS` is capped at 46% of the hole
spacing. Generous because aim is bad; strictly under half because at exactly half a drop
equidistant between two holes resolves arbitrarily, and the child would be told they
were wrong about a shape they were right about.

**The whole stage is the grab handle.** `pointerdown` anywhere picks the block up.
Requiring a hit on the 140px block itself means a child who taps 30px to the left gets
nothing.

**The red X lands on the hole you chose,** not screen-centre. "Not THAT hole" teaches
more than a general "no" — and a centred X sat directly on top of the block springing
home, hiding the one thing the child needed to see.

**The shape is named on a new round but not on a retry.** Repeating the name every time
the block springs back turns a cue into nagging, and the child already knows what they
are holding.

**The animals belong to the CORRECT answer, and that ordering is the point.** They were
originally a single T-rex that arrived on a *wrong* answer and roared. Moving them to the
reward is the better design: the memorable, elaborate thing now belongs to the behaviour
worth repeating, and the correction is a red X and a quiet tone. For a two-to-five year old
that ordering matters more than almost anything else here — it also removes the risk that a
frightening reaction to a mistake stops them guessing, and guessing is the activity.

**Their heads face the viewer.** Two eyes with centred pupils is what "looking at you" is
made of; a profile head shows one eye and makes no eye contact. Bodies stay front-on too,
so all five share one build.

**Three styles to choose from.** `STYLE` in
[`critters/registry.tsx`](src/critters/registry.tsx) selects which set is live:

| style | what | |
|---|---|---|
| `chibi` | one big round head and one small round body, for all five | the original, and the weakest — the head ellipse and body are **identical** across species, so only ears and colour distinguish them and side by side they read as one animal in five hats |
| `distinct` | its own head shape and body proportions per species | Cow widest with an enormous muzzle and horns; lion mane-dominated with a small face; tiger with scalloped cheek ruffs; monkey with huge side ears and long arms; dinosaur with a low skull and a protruding toothed snout |
| `portrait` | the distinct head blown up to fill the frame, paws clapping at the bottom | **currently live.** The most legible of the three, because every feature is twice the size — which is what matters on a tablet held at arm's length by someone who cannot read |

All three are kept so they can be compared in the gallery rather than argued about. The
`distinct` heads are reused by `portrait` at a larger scale rather than drawn a third time.

The lesson worth keeping: the fix for "they all look the same" was **not more detail**, it was
a different SILHOUETTE per species, because silhouette is what recognition runs on.

**Five species, one harness.** [`critters/kit.tsx`](src/critters/kit.tsx) has the body, the
two clapping arms, the dropping jaw and the face furniture;
[`critters/species.tsx`](src/critters/species.tsx) supplies only what differs — palette,
head outline, ears/horns/mane, markings. Adding a sixth animal is one entry in `SPECIES`
and needs no changes to the wrapper or the CSS.

They are deliberately all the same chibi build. A child is not comparing them for
anatomical accuracy; they are looking for *who turned up this time*, and one consistent
silhouette makes the species read faster. Each has to be identifiable **from its head
alone**, because that is what gets looked at — so ears, horns, mane and muzzle colour are
the entire job.

A different animal every time, never the same one twice running — same reasoning as the
round order: a repeat is a wasted surprise.

**Two consequences of the front view**, both easy to get wrong when editing:

- **The jaw drops, it does not rotate.** With the head facing camera the hinge axis points
  at the viewer, so a 2D rotation would swing the chin sideways across the face.
- **The clap is two arms mirrored about the centre line.** In profile there was only ever
  one visible arm, and one arm cannot clap.

**The `sfx-roar.wav` clip is still generated but no longer played.** So is `sfx-wrong.wav`'s
predecessor role — the roar was replaced by applause when the animals moved to the reward.
Kept because regenerating it is free and it is the obvious asset if a future feature wants
one.

**Dev gallery.** `/critters.html` renders every animal side by side, and `?frame=N` freezes
the shared CSS animations at N ms so the clap and the open jaw can be inspected without
racing a screenshot against a keyframe. It is not a build input, so it never reaches
`dist/` — verified.

**The reward is much louder than the correction.** Applause at 0.85 gain and the cheer at
1.0, against 0.55 for the "no" tone, on top of peak levels already staggered in the
generator (−9 / −12 / −15 dBFS). A game that punishes louder than it praises teaches a
three-year-old to stop guessing, and guessing is the activity.

### Saved progress carries a version, and a mismatch resets it

Progress is `{ v, tracks: { [trackId]: {levelIndex, stars} } }` — a **per-track index into that
track's level list**. An index is fine until the list changes shape: inserting the three colour
levels at the front of the old single ladder turned a stored "index 4" from a number level into
shape level 5, so anyone with saved progress reopened the game **past the new levels** with no
indication anything had happened. The game was not wrong by its own rules; the record simply
meant something different than when it was written.

So the record stores `LEVELS_VERSION` too, and `loadProgress` discards anything that does not
match. That includes unversioned records and versions 1 and 2, which predate the split and
stored a single index into one thirteen-level ladder — there is no honest way to map that onto
four tracks. Throwing away a few banked stars is by far the cheaper failure.

Five details that matter more than they look:

- The version is stamped inside `saveProgress`, not passed in by callers, so no call site can
  omit it.
- `LEVELS_VERSION` lives in [levels.ts](src/levels.ts) beside the arrays it describes, because
  that is the file someone edits when they cause the problem. Appending a level to the **end** of
  a track is the one safe change; anything else needs a bump.
- **Adding a whole track is safe too**, and does not need a bump: the map is keyed by track id
  and a track with no entry simply starts at level 1. That is why the stored type is a partial
  record rather than a complete one.
- One corrupt track entry loses that track, not the other three. Validation is per entry.
- A level completion writes **one** track's slot and carries the other three through untouched,
  which is the entire point of keying progress by track.

## It shares the shapes with the video

The polygons are authored once, in `../remotion-app/src/wrongshape/shapes.ts`, and shared
with the Wrong-Shape Machine video — artwork drifting between the two would be a real bug.

`bun run sync` copies that file to `src/shared/shapes.ts`, which is committed. It used to
be a direct cross-project import, which kept a single copy but meant the game could not
build without the sibling project checked out — verified: any deploy of this folder alone
failed at `tsc` with "Cannot find module". `prebuild` runs `sync --check` so the copy
cannot silently go stale. Same generated-and-committed pattern the video pipeline uses
for `audio-durations.ts`.

Edit the Remotion copy, run `bun run sync`, commit.

The **palette** is copied rather than imported (`src/theme.ts`): the video's theme module
pulls in `@remotion/google-fonts`, which drags the Remotion font loader into a plain web
app. Ten hex values drifting is cosmetic; the artwork drifting is not.

Fonts come from the Google Fonts CDN, linked in `index.html`.

## Sound

A hundred and twenty-six clips in `public/audio/`, all generated rather than sourced — none of them bought,
and none of them from a sample library:

| clip | what |
|---|---|
| `sfx-clap.wav` | applause |
| `sfx-bonk.wav` | hollow knock, 182 Hz |
| `sfx-roar.wav` | cartoon roar, 1.40s — **generated, no longer played** |
| `sfx-wrong.wav` | A4→F4 descending tone — **generated but no longer played** |
| `kids-cheer.wav` | a child's "Hooray!" |
| `game-{circle,square,triangle,star}.wav` | the shape names |
| `game-n1.wav` ... `game-n20.wav` | the numerals, spoken |
| `game-cred.wav` ... `game-cpink.wav` | the seven colour names, spoken |
| `game-tryagain.wav` | "Let's try again" |
| `game-nextlevel.wav` | "Well done! Next level" |
| `game-lA.wav` ... `game-lZ.wav` | the twenty-six letter names, spoken |
| `game-pgoodjob.wav` ... | the eight praise lines, spoken |
| `game-alion.wav` ... | each animal's own noise. **Five contain a real recording**, nine are the voice — see below |
| `game-askcow.wav` ... | "Can you touch the cow?", one per animal |
| `game-sndcow.wav` ... | "Can you make the sound the cow makes? **Moooo! Moooo!**", one per animal |
| `game-nudge*.wav` | the three gentle lines for a wrong touch |

### Praise on a correct answer varies

A correct drop plays the applause and then **one of nine lines**: the recorded "Hooray!" plus
eight spoken ones — "Good job!", "Great work!", "Keep it up!", "Well done!", "Nice one!", "You
got it!", "Brilliant!", "That's it!".

One fixed response, which is what the recorded cheer was on its own, stops being information
after the third time you hear it — and the reward beat is the single thing in this game most
worth keeping alive. Nine lines means a child has to get nine right before anything can repeat,
and `pickPraise` never repeats back-to-back even then (the same no-repeat rule, for the same
reason, as `pickSpecies` for the animals).

**The recorded "Hooray!" stays in the rotation** rather than being replaced by it. It is the only
one of the nine in the child's voice used everywhere else in the app, so it is the best of them —
it just should not be the only one.

The applause fires on the instant the block seats, and the praise is held back **220ms**.
Applause is broadband noise and a simultaneous "Good job!" is close to unintelligible
underneath it; the delay puts the words in the tail of the clap. That was true of the recorded
"Hooray!" as well and simply mattered less when the words never changed. The longest line is
about 900ms, comfortably inside `CORRECT_HOLD` (1.7s), so nothing is still talking when the next
block arrives.

### Five animals are real recordings; seven are a voice

An honest split, and worth stating plainly rather than glossing.

| | animals | what you hear |
|---|---|---|
| **real recording** | tiger, cat, dog, duck, horse | an actual field recording, then the name spoken |
| **voice** | lion, cow, goat, chicken, monkey, crocodile, dinosaur | the neural voice saying "Moo! Cow." |

The whole audio set was originally generated rather than sourced, and real recordings were added
on request. Getting to twelve was not possible: **Wikimedia Commons is the only source reachable
with machine-readable licences, and it has a usable recording for five of them.** A dinosaur has
no real sound at all.

What the search actually turned up is worth recording, because none of it is obvious:

- Commons' free-text search is hostile to this. "cow" returns a 1922 ragtime record and a diving
  alarm called *Cow Fart*; "tiger" returns a European bison; "horse" returns cockatoos.
- Worse, most keyword hits are **Lingua Libre** files — `LL-Q1860 (eng)-Someone-meow.wav` is a
  volunteer pronouncing the *word* "meow" for a dictionary. They pass every keyword filter
  perfectly and are *more* of a human imitation than the voice clips they were meant to replace.
  Anything matching `LL-*`, `En-xx-*` or "pronunciation" is now excluded on sight.
- Species sound categories (`Category:Dog sounds`) mostly do not exist.
- **NC licences are excluded outright.** This ships in an app store, and non-commercial means
  non-commercial.

Two of the five are **CC BY-SA 3.0**, which means attribution and share-alike on those clips —
see [ATTRIBUTION.md](ATTRIBUTION.md) and the licence table below. That is a real consequence of
using third-party audio, and it is why the rest of the project generates everything.

**Level-matching the two kinds together mattered more than expected.** Peak-normalising a field
recording and appending the spoken name produced clips that were loud then quiet *inside
themselves*, and about 4dB louder than the seven all-voice animals — so tapping the tiger and
then the lion jumped in volume. They are matched on **RMS**, not peak, because that is what
loudness tracks: a bark is far peakier than a spoken word, so equal peaks sound very unequal. The
recording sits at 1.1x the name so the noise stays forward of the label. A final limiter scales
(never clips) anything over 0.9 peak — the horse needed it. All twelve now sit between 0.083 and
0.136 RMS.

**The onomatopoeia needed prosody, and that was the worst of the robot problem.** Text-to-speech
has no idea it is imitating an animal: left alone it reads "Moo, moo!" as a word, at conversational
speed, in the same breath as the question. Two things fix it, and both were needed:

- **The spelling** — `"Moooo! Moooo!"`, not `"Moo, moo!"`. Stretched vowels are what stop the voice
  treating it as a dictionary word, and they are how children's books spell it anyway.
- **`<prosody rate="-24%" pitch="+18%">` around the noise only**, so the question wrapped around it
  stays conversational. This is why the generator sends raw SSML rather than plain text.

**`<prosody>` is the only SSML this endpoint accepts.** `<break>`, `<emphasis>` and the expressive
`<mstts:express-as>` styles (cheerful, friendly) each close the websocket mid-synthesis — verified,
and a shame, because an expressive style is exactly the right tool for this. So the levers are the
voice, the prosody and the spelling, and nothing else.

**Sentences are also trimmed less tightly than words**: 70ms/200ms of padding against 20ms/60ms. A
one-syllable letter wants a tight trim, because a cue that starts late reads as lag; a sentence has
a soft onset and a decaying tail, and the tight trim clipped both, which was itself part of why the
narration sounded abrupt.

**One clip per animal, noise then name**, so the two can never arrive out of order.

**A tap cuts off the previous tap** — `AudioEngine.playAlone`. A two-year-old with a twelve-tile
grid taps far faster than 2s, and four animals talking at once is mush; mush teaches nothing, so
the newest tap wins. That is the opposite of what the game cues do, where applause and praise fire
together on purpose and overlapping playback is the reason this engine is Web Audio at all.

The generator's length check started at 2.2s and flagged four clips that were simply that long
("Cluck cluck! Chicken." is five syllables). It is 2.8s now: a check that fires on correct output
trains you to ignore it.

### The letter and praise clips, and the synthesiser that used to stand in for them

The letter track and the varied praise came after this repo was split off from the Remotion
project, so the pipeline that made the other clips was not available. The first cut shipped them
through `window.speechSynthesis` instead, and **that was the right call to reject**: it sounded
like a screen reader. Worth recording why, because the failure is not obvious in advance.

Voice *selection* can only choose from what a device happens to have installed. Left to itself
`speechSynthesis` uses the platform default, which on Windows is usually David or Zira —
2013-era concatenative SAPI voices. Scoring the inventory to prefer `natural`/`neural`/`online`
families genuinely helped where a neural voice was present, and did nothing at all where one was
not. Rate and pitch tuning is cosmetic next to that. A per-device lottery for how the app sounds
is not a thing you can tune your way out of.

So the clips are recorded, from the same source as the others: **Microsoft Edge neural voices
over the read-aloud endpoint**, via [scripts/gen-voice.mjs](scripts/gen-voice.mjs). Same
provenance, so the letter track matches the rest of the game rather than sitting next to it — and
the same redistribution caveat applies. `speechSynthesis` is gone from the app entirely; there is
no fallback path left.

**The voice is `en-US-EmmaNeural`, chosen by ear twice.**

The first audition was over single **words** — letters and praise — and picked
`en-GB-LibbyNeural`. The second was over **sentences**, once the animal game needed narration, and
Libby lost. It is a "General" tier voice and it reads a sentence flatly; Emma is one of the newest
generation (Microsoft's "Conversation" tier) and paces one far better — it renders the same line in
2.9s where Libby takes 3.8s. That pacing difference is most of what "sounds like a robot" actually
was.

**The switch has a cost**: Emma is American, so the letters now say "zee" rather than "zed". If the
British accent matters more than the narration does, `en-GB-SoniaNeural` was the best GB
alternative and `VOICE` in [gen-voice.mjs](scripts/gen-voice.mjs) is the one line to change.

Three things about generating them that were not obvious:

- **The endpoint rejects `<say-as interpret-as="characters">`** — it closes the websocket
  mid-synthesis. That would have been the clean way to force letter names, so the names have to
  come from the spelling instead. Verified, not assumed: `say-as` failed and plain text succeeded
  on the same voice in the same run.
- **Only mp3 and opus come back** (`riff-24khz-16bit-mono-pcm` is refused), and the only ffmpeg
  likely to be on a dev machine here is Playwright's video-only build with no mp3 decoder. So the
  script decodes through **Chromium**, which handles mp3 natively and resamples to the context
  rate on the way — which is how the output lands at mono 48kHz 16-bit, matching every clip that
  was already there.
- **Trimming is not optional.** The endpoint pads short clips with up to 1.25s of silence, which
  on a one-syllable letter is most of the file. Same reason `export-game-audio.py` strips it for
  the video-pipeline clips: a cue that starts a quarter-second after the block appears reads as
  lag. The letters come out 0.33–0.75s, the praise lines 0.59–0.86s, against ~0.68s for the
  existing shape names.

**On pronunciation, and on a check that stopped working.** The bare character is the right input
for almost every letter; the exceptions are the ones whose bare character is also a common English
word, and *which* of the two needs help depends on the accent:

| | bare `A` | bare `I` |
|---|---|---|
| **US voices** | the indefinite article — needs `"ay"` | already correct |
| **GB voices** | already correct (corr 1.00) | *not* "eye" (corr −0.07) — needs `"eye"` |

Each is only wrong on one side of the Atlantic, so the one `{A: "ay", I: "eye"}` table is correct
for either voice.

`--check` cross-correlates each letter against an independent spelling of its name. **That check
worked on Libby and does not work on Emma**, and the reason is worth recording: it rests on
identical input phonemes producing byte-identical audio, which held for Libby (24 of 26 matched
exactly, and a "B" vs "B" control gave 1.00) but does not hold for the newer model — Emma
tokenises a bare letter differently from the spelled word, so 12 of 26 now "mismatch" without any
of them being mispronounced. A check that fires on correct output is worse than no check.

What is left is **duration plausibility**, which is weaker but still structural: the 26 letters run
0.17-0.58s, and **W is by far the longest at 0.58s** — exactly what "double-you" needs against
"ess" at 0.17s. That pattern holding across the whole alphabet is good evidence the letters are
being read as names. It is not proof, and the letters want an ear under the new voice.

The praise clip **id is the filename** (`game-pgoodjob.wav`), not an array index. Praise was
keyed by index first, which meant reordering the list would have silently repointed every clip.

### Where the audio actually comes from

Worth being precise about, because "generated" covers two different things and only one of
them is unambiguously mine to redistribute:

- **The four SFX** (`sfx-clap`, `sfx-bonk`, `sfx-wrong`, `sfx-roar`) are synthesized from
  scratch with numpy — noise shaping, waveshaping, additive formants. No sample anywhere in
  them.
- **The 34 spoken clips** are Microsoft Edge neural voices, via `msedge-tts` against the Edge
  read-aloud endpoint. Free to call, and there is no per-clip licence fee — but Microsoft's
  terms do not clearly grant the right to *redistribute* the resulting audio, which is a
  different question from whether generating it was allowed. If that matters for your use,
  regenerate them: `remotion-app/scripts/generate-voice.mjs` plus `export-game-audio.py`
  rebuild every clip from the scripts in `src/kids/`, so swapping in a different TTS engine
  touches one file and nothing downstream notices.

The bundled fonts are SIL OFL 1.1 and carry their licence at
[public/fonts/LICENSE.txt](public/fonts/LICENSE.txt).

**The spoken clips are trimmed copies.** The pipeline pads every synthesized clip with
~0.23s of silence at the head and ~1.0s at the tail. In a video that padding is
load-bearing — the whole think-pause schedule is built on measuring it. In a game a cue
that starts a quarter-second after the block appears reads as lag, so
`export-game-audio.py` strips it: the shape names go from ~1.8s to ~0.7s. Nothing is
re-synthesized, so the video and the game can never disagree about what the voice says.

The bonk and the wrong tone were written for this game. They *could* also close the gap
flagged in the video's README — its rejected block still bounces off in silence — but
the video is not wired to them: that is a `<Sequence>` in `wrongshape/SceneView.tsx`
firing `sfx-bonk` on the rejection frame, plus a re-render.

Playback is Web Audio, not `<audio>` elements, because a correct answer fires the
applause and the cheer on the same instant and overlapping playback is what
`HTMLAudioElement` is worst at. The context is created immediately in `suspended` state
and the clips are decoded up front; only `resume()` waits for the first gesture. Doing it
the other way round means the first correct answer of a session plays silently while it
decodes — the one answer you most want to reward.

**Sound will not play until the first tap.** Browsers require a user gesture; that is the
browser, not a bug.

## Layout

### The picker holds eight cards because they are all one shape

The four learning cards used to be 420×150 with the icon **beside** a title, blurb and star line,
and the others 272×150 with the icon **over** a shorter stack. Two shapes meant two budgets, and
the wide one is what filled the stage: two columns of 420 is 864 units of width to show four
things, and it left no row free for a fifth game. Adding one meant shaving cards off a row that
was already full — the landscape picker ended 26 units short of the stage, and a card is 150.

Every card is now the narrow, centred shape: **4×2 on the landscape stage and 2×4 on the portrait
one**. Eight cards take the room six used to, with a row spare. The geometry comes from one
`menuSlot(slot)` in [stage.ts](src/stage.ts), which the cards, the category heading and the grid
height all read — working the position out twice is how a heading ends up four units off the card
it labels. `MENU_SLOTS` is asserted against the card list in Menu.tsx, so a ninth card cannot be
added without widening the grid and silently drawing itself off the bottom of the stage.

### The stage itself

A fixed 1000×720 logical stage, scaled to fit and letterboxed. Every coordinate is in
logical units and `App.tsx` is the only place the real screen size is considered.
Fixed-then-scaled rather than fluid because a fluid layout has to be correct at every
width, and this one only has to be correct once — which matters when the thing being
positioned is a drop target a two-year-old has to hit.

`touch-action: none`, no user-select, no tap highlight, `maximum-scale=1` — a dragged
finger must never scroll, rubber-band, select text or pinch-zoom the board away.

## Verified

> **The suite below predates the split into four tracks, and it is not checked into this
> repository** — `gamekit.py` and the eight suites live wherever they were run from, so they
> could not be re-run here. Nine of its checks assert the old single ladder and are now wrong by
> construction: *level 1 is colours*, *level 4 switches to shapes*, *resumes on level 7*, *every
> one of 98 rounds across all 13 levels*, *resumes on the next level*, and the four
> stale-record cases (the format changed, so the "current-version record still resumes" case
> needs rewriting against the per-track map). Everything else — feedback paths, audio, animals,
> the restart rule, offline — is untouched by the split and should still hold.
>
> What was actually run for the split, with Playwright driving the dev server:
>
> ```
> picker         four cards render with the right titles, blurbs, per-track
>                maxima (9/9/21/15) and 0/54 total
> every track    opens from its card, board and block are the right kind
>                (colour rims, shape outlines, 1-5 numerals, A-E letters)
> hud button     returns to the picker from all four tracks
> playthrough    all 3 shape levels, 22 correct drags, zero wrong drops,
>                including the rotated blocks on level 3
> cards          level-done card per level; end-of-track card shows
>                "Shapes - every level", 9/9, and both buttons
> persistence    stored as {"v":3,"tracks":{"shape":{"levelIndex":2,"stars":9}}}
>                - only the played track written, survives a reload
> stale record   a v2 record is discarded, not misread: all four tracks
>                return to 0 rather than resuming at a bogus index
> ```
>
> And for the boxes game, with `bun` on the rules module and Playwright on the screen:
>
> ```
> topology       all four sizes: line and box counts, four distinct sides
>                per box, every line borders one or two boxes, boxesOf
>                inverts sidesOf, edge ids round-trip through edgeAt
> rule 2         claiming keeps the turn, claiming nothing passes it, one
>                line CAN claim two boxes at once (and still gets only one
>                extra turn), replaying a drawn line is a no-op
> termination    every size plays to a full board with every box claimed
> skill order    120 games, alternating who opens: sharp > tricky > rookie
>                on both 3x3 and 4x4, by net boxes, in every pairing
> latency        slowest Sharp move over a full game: 1ms on Tiny, 65ms on
>                Small and Big, 68ms on Huge - all inside the 480ms pause
> full game      Small vs Sharp played out in the browser: reaches a result,
>                no undrawn lines left, scores sum to 9, and the banner
>                shows "again!" mid-chain
> keyboard       Tab reaches a line, Enter draws it
> teardown       leaving the screen mid-think does not fire the pending move
> geometry       all 4 sizes x both stages, measured in the DOM: 18 units
>                between the board artwork and the score cards, >=34 between
>                the turn banner and the top row of dots, nothing outside
>                the stage
> picker         both stages: the "Fun game for kids" heading spans exactly
>                the Boxes card and no other, sits above it rather than on
>                it, clears the track grid, and the bottom row is still
>                inside the stage after the reflow (694/720, 1074/1138)
> console        no errors or page errors on any screen
>
> all 4 tracks   level 1 of colours, shapes, numbers AND letters played to
>                completion - 24 rounds, 24 correct drops, zero wrong
> voice choice   against a simulated default-Windows inventory (David, Zira,
>                Aria Online Natural, Google US English, fr-FR Denise,
>                en-IN Ravi) it picks Aria Online (Natural)
> letter cues    spoken per round; "A" comes out as "ay", not the article
> praise         24 correct drops -> 22 spoken lines + 2 recorded "Hooray!",
>                7 distinct, zero back-to-back repeats
>
> recorded audio all 34 new clips fetch AND decode (a 200 that is not valid
>                audio would be swallowed by the engine's try/catch), all
>                mono 48kHz matching the existing clips, 0.33-0.86s
> no fallback    speechSynthesis.speak is monkey-patched to count calls;
>                a full letters level makes zero of them
> pronunciation  24 of 26 letters confirmed against an independent spelling
>                producing byte-identical audio; "B" vs "B" control = 1.00
>
> animal game    5 picker cards; exactly 4 animals on screen, never a
>                 duplicate; the question always names one that IS on screen
> the question    spoken on entry and re-asked after a wrong touch, both
>                 confirmed by buffer duration rather than by network request,
>                 since every clip is decoded at boot
> wrong touch     shakes the animal it landed on, plays a nudge, then asks
>                 again - and the animal STAYS, nothing pops, nothing scored
> correct touch   pops (1 .zoo-pop, 8 burst particles) then plays three clips
>                 in order: praise, the animal's own noise, and the 3.8s
>                 "make the sound" invitation
> next round      the found animal is gone, a new one has arrived, the count
>                 is back to 4 and a new question names one of them
> rapid taps      6 taps in ~1s still leave exactly 4, with no duplicates
> roaming         hit areas sampled repeatedly WHILE MOVING: zero overlaps and
>                 zero escapes off the stage. Cells are what guarantee this
> all 14 drawn    every animal surfaced over repeated reloads and draws 20+
>                 SVG nodes - which is what caught the three whose signature
>                 feature was hidden behind their own skull
> ```
>
> The board reader used for that is token-kind agnostic — glyph holes by their text, shapes by
> vertex count, colours by the block's fill against the printed name — which is what let the
> letter and number tracks be played rather than just screenshotted.
>
> Not covered, and worth doing before this ships to a child: the three-wrong restart inside a
> track, the letter track above level 1 (levels 2-5 shuffle and widen to A-Z), how any of the
> spoken audio actually sounds on a real iOS device, and anything at all on a real touchscreen.

Driven end to end with Playwright. Shared helpers live in one `gamekit.py`, consolidated after
the level structure changed three times and each change broke every suite's private copy of
"read the board" in a slightly different way.

```
feedback paths   correct advances + sparkles - wrong shows X, costs no star
                 empty-space drop ignored - block returns home

level flow       level 1 is colours, 4 distinct of 7 - 3rd wrong restarts
                 restart keeps banked stars, resets tries, same level
                 clean run = 3 stars - one wrong = 2 stars
                 advances 1->2 and banks stars - level 4 switches to shapes

audio            correct = clap + cheer - wrong = bonk + quiet tone, no roar
                 new round speaks its token - a retry does not repeat the cue

animals          on correct only, never on wrong - they vary, no repeats

numbers          resumes on level 7 - board is 4 numerals in range
                 block is a glyph - the numeral is spoken
                 correct celebrates - wrong shows the X

solvable         every one of 98 rounds across all 13 levels is winnable

persistence      progress written on completion, version-stamped
                 resumes on the next level - cleared storage starts over
                 stale records rejected: unversioned, older, newer
                 a current-version record still resumes

offline          zero external requests - both fonts resolve locally
```

**46 checks, eight suites, zero failures**, run against the **production build** served from
`dist/` rather than the dev server.

Clips are identified by reading the real durations off disk, and the "was this token spoken"
check compares durations rather than names: several clips are the same length ("circle" and
"square" are identical), and a colour's clip id is `cred`, not `red`.

## Known gaps

- **Three of the eight cards have visible slack at the bottom.** Animals, Memory and Boxes have
  no star line, so their contents stop a line short of the five that do. The icons and titles
  across a row still align, which is what matters, and the extra air arguably reads as "these
  have nothing to score" — but it is an asymmetry, not a design.
- **The memory game is not documented here.** It was added in its own commit and this README was
  not updated with it, so the only account of why it works the way it does is the header comment in
  [memory.ts](src/memory.ts) — which is thorough, but it is not where anyone would look first. The
  intro list above now at least mentions the game exists.
- **Sharp is unbeatable on Tiny.** That board is 12 lines, which is inside `EXACT_EDGES`, so it
  plays perfectly from the opening. The pairing is a choice made on a screen that says "plays to
  win", so it is informed rather than a trap — but nothing warns about it, and a four-year-old who
  picks the small board and the strong opponent loses 0–4 every time.
- **The Huge board has the smallest tap targets in the app on a landscape phone.** 59×33 logical
  units, which is roughly 24×14 real pixels in an 800×400 window. Fine on a tablet and fine in
  portrait (72×40). It is the same landscape-phone squeeze everything else here has, and this
  screen feels it most because its targets are the thinnest thing in the app.
- **No spoken question, only the shape name.** The video asks "which hole does it fit?";
  the game just says "circle". Deliberate — the full sentence every round becomes
  something to sit through — but a first-round-only long form would be better than
  either.
- **Still a webview.** Capacitor wraps it, with real native integrations (haptics, saved
  progress, orientation, splash) - but the renderer is a web view. If review pushes back under
  4.2, the answer is an **Expo / React Native** port: the ~575 lines of game logic, levels,
  tokens and geometry are pure TypeScript and move unchanged, the ~2,370 lines of SVG are
  mostly mechanical (`react-native-svg` has nearly the same API), and the ~515 lines of CSS
  keyframes and Web Audio are a genuine rewrite. That route also removes the Mac requirement
  entirely, since EAS Build compiles in the cloud and Expo Go tests on a real device from
  Windows.
- **The narrator is an adult voice; the "Hooray!" is a child's.** Everything generated here is
  `en-US-EmmaNeural`. If that inconsistency ever starts to grate, Ana (`en-US-AnaNeural`) and
  Maisie (`en-GB-MaisieNeural`) are Microsoft's child voices — but both are "General" tier and
  would bring back the flat sentences Emma was chosen to fix.
- **`scripts/gen-voice.mjs` needs two packages that are not in `package.json`** (`msedge-tts`,
  `playwright-core`). Deliberate — the clips are committed and the script runs approximately
  never, so neither belongs in the app's dependency tree. It prints what to install.
- **Only five of the sixteen animals are real recordings.** Lion, cow, goat, chicken, monkey,
  crocodile, dinosaur, bee, owl, elephant and bear are still the voice, because Commons has
  nothing usable for them — see
  [Sound](#five-animals-are-real-recordings-seven-are-a-voice). A Freesound API key (free) would
  cover the rest as CC0 and is the obvious way to close this.
- **The park now mixes real recordings with a voice imitation**, which is a deliberate compromise
  and audibly inconsistent. Uniformly one or the other would be better.
- **Two animal clips are CC BY-SA 3.0**, so they are not MIT and they need the attribution in
  [ATTRIBUTION.md](ATTRIBUTION.md) to ship with the app.
- **Nothing checks whether the child actually made the sound.** Step 4 of the animal game is an
  invitation into a void: the app asks for a moo and then moves on regardless. Listening for it is
  possible (`getUserMedia` plus a loudness gate would do) and is a genuinely different feature,
  with a privacy conversation attached.
- **The eleven park-only drawings have not been checked against the clap animation.** They stay
  out of the reward pool for the four games, because that pool needs verifying against
  clap-and-laugh and a bee has no hands.
- **The letters are now an American voice and want re-listening.** Switching to Emma changed them
  from "zed" to "zee", replaced audio that had already been signed off, and cost the pronunciation
  check most of its power (see Sound). Reverting just the letters to Libby is possible but would
  put two voices in one app.
- **The found sequence is ~9 seconds** — praise, the animal's noise, then a ~4s invitation, plus a
  beat to answer in. That is a long time to hold a two-year-old between rounds, and it is the next
  thing to measure on a real child.
- **The park is three lanes and three slots, hard-coded.** More animals on screen at once means
  more lanes, and the lane count is what guarantees hit areas never overlap — so it is not a
  one-line change.
- **A crossing animal is a moving target.** That is the mechanic, but it is untested on a real
  touchscreen with a real two-year-old, and it is the thing most likely to need slowing down.
  `CROSSING` in `Animals.tsx` is the one constant to change.
- **`prefers-reduced-motion` cannot honour this screen properly.** It stops the vertical bob, but
  the crossing *is* the feature and removing it would leave three animals sitting off-screen. A
  reduced-motion variant would have to be a different screen — probably the static scatter this
  replaced.
- **The four per-animal tap motions are gone.** A tap pops now, so the hop, waddle, chomp and
  bounce that were assigned per animal were superseded and removed rather than left as dead CSS.
- **The seven new animals have not been checked against the clap-and-laugh animation**, which is
  why the reward pool stayed at five. Widening it means verifying that a duck with no arms and a
  beak instead of a jaw still reads correctly when it applauds.
- **Only four holes.** That bounds a number level to four numerals per attempt, so the last
  number level shows four of twenty rather than covering the range — and the last letter level
  four of twenty-six. Widening it means shrinking `SHAPE_PX` or going to two rows.
- **No lowercase letters.** Deliberate (see [The letter levels](#the-letter-levels)), but a
  later track that pairs "A" with "a" is the obvious next step, and it needs a token kind that
  holds two glyphs rather than one.
- **The picker has no reset.** Progress can only be cleared per track, by finishing one and
  tapping Play again. `clearProgress` wipes everything and nothing calls it — a long-press on
  the picker's star total is the obvious home for it.
- **The native app is still called "Shape Machine"** (`capacitor.config.ts`, `index.html`)
  while the picker is headed "Play and Learn". Renaming touches the App Store identity, so it
  is left alone deliberately rather than overlooked.
- **No counting, only recognition.** A level that showed *three dots* and wanted the numeral 3
  would teach more, and the token model has room for it — a fourth kind with a dot-pattern face.
- **No colour mixing.** Red + blue = purple is the obvious next colour level, and all seven hues
  are already there.
- **Never tested on a child.** Specifically unknown: whether `SNAP_RADIUS` is forgiving
  enough on a real touchscreen, whether the three-try restart discourages more than it
  motivates, and **whether the roaring T-rex is funny or upsetting**. The last one is the
  biggest open question in the app — it is designed to be comic and it may still land as
  a punishment. If it does, the fix is small: `Trex` is one component rendered from one
  place in `App.tsx`, the roar is one line, and `sfx-wrong` is still there as the gentle
  alternative.

## Licence

MIT — see [LICENSE](LICENSE).

Several sets of bundled assets are deliberately carved out of it, because they are not mine to
relicense:

| | |
|---|---|
| `public/fonts/*.woff2` | Baloo 2 and Fredoka, **SIL OFL 1.1** ([notice](public/fonts/LICENSE.txt)). Redistributing the files requires that notice to travel with them. |
| `public/audio/game-*`, `kids-*` | **Microsoft Edge neural voices**, generated via `msedge-tts`. Included for convenience so a clone runs, not as MIT-licensed. Regenerate them if the distinction matters to you. |
| `public/audio/sfx-*` | Synthesized from scratch with numpy, no samples. MIT like the code. |
| `game-atiger`, `acat`, `adog`, `aduck`, `ahorse` | Contain a **real field recording from Wikimedia Commons** — the only third-party audio in the project. Two are CC0, one public domain, and **two are CC BY-SA 3.0**, which requires attribution and makes those two clips share-alike rather than MIT. Every source, author and licence is listed in [ATTRIBUTION.md](ATTRIBUTION.md), regenerated from live Commons metadata by `scripts/fetch-animal-sounds.mjs`. |
