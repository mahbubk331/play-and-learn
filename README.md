# Shape Machine — the drag-and-drop game

The playable version of the [Wrong-Shape Machine](../remotion-app/src/wrongshape/README.md)
video. A block appears, its shape is spoken aloud, and you drag it to the hole it fits.

- **Right hole** → **one of five animals runs in and applauds** — dinosaur, tiger, lion,
  monkey or cow, picked at random — plus applause, a child shouting "Hooray!", and a
  progress star
- **Wrong hole** → a big red X on the hole you chose, a knock and a soft "no" tone, and one
  of three tries is spent
- **Three wrong tries** → "Let's try again!" and the level restarts
- **Level complete** → 1–3 stars depending on how many tries it took, then the next level

Thirteen levels — three of **colours**, three of shapes, seven of numbers — then a total
out of 39 stars.

## Commands

```bash
bun install
bun run dev            # http://localhost:5173
bun run dev --host     # also serves on the LAN, for a tablet
bun run build          # static site in dist/
bun run preview        # serve the build
bun run lint           # tsc --noEmit
```

Regenerating audio (all of it lives in the Remotion project):

```bash
cd ../remotion-app
python scripts/gen-kids-sfx.py       # clap, bonk, wrong tone, T-rex roar
bun run voice shapegame              # spoken shape names + phrases
bun run voice kids                   # the shared "Hooray!"
python scripts/export-game-audio.py  # trim + copy into this project
```

## Levels

**Colours, then shapes, then numerals** — the order a child acquires the skills, so the first
level is winnable immediately.

| Level | Rounds | Tokens | Board | Blocks |
|---|---|---|---|---|
| 1 | 6 | **4 of 7 colours** | fixed order | — |
| 2 | 8 | 4 of 7 colours | shuffled | — |
| 3 | 8 | 4 of 7 colours | shuffled | — |
| 4 | 6 | 4 shapes | fixed order | upright |
| 5 | 8 | 4 shapes | shuffled | upright |
| 6 | 8 | 4 shapes | shuffled | rotated up to 32 deg |
| 7 | 6 | numbers **1-5** | shuffled | upright |
| 8 | 8 | numbers **1-10** | shuffled | upright |
| 9-12 | 8 | numbers 1-12 ... 1-18 | shuffled | upright |
| 13 | 8 | numbers **1-20** | shuffled | upright |

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
order a child stops needing them: level 4's fixed order lets them answer by position (a real
intermediate step, not cheating), level 5 takes that away, level 6 additionally requires
recognising an outline independently of its orientation.

### The number levels

The ramp is the *range*. The board still shows **four numerals at a time**, because four is what
fits and four is what a child can scan — a wider range does not mean a busier board, it means
the four could be any of more numbers, so recognising them matters more than remembering where
they were. A replay draws a different four.

**Rotation stays off here.** A rotated numeral is a different and much harder question than a
rotated triangle — 6 and 9 stop being distinguishable at all — and it is not the skill these
levels are for.

### One game, not three

Rather than fork into three games, everything downstream works on a **token**
([tokens.ts](src/tokens.ts)), and a level only says which kind it deals in. The board, the
block, the drag, the matching and the spoken cue are all shared.

The three kinds differ in what carries the cue, and each choice is forced:

| kind | the cue |
|---|---|
| **shape** | the hole is a cut-out of that shape; the printed word is a bonus |
| **number** | the hole is a cut-out of the digits, so a "7" drops into a 7-shaped hole |
| **colour** | every hole is the same circle, because a colour cannot be a shape. The coloured rim is the cue, and the name is printed and spoken. The one kind where a block physically fits any hole — unavoidable, and exactly how the Sorting Factory video works |

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
stops a number level asking for a numeral that is not on the board. The four numerals per
board are always distinct — two holes wanting the same number would make one unreachable and
the other ambiguous.

## Scoring

Stars per level come from the number of wrong tries, since a third wrong restarts:

| Wrong tries | Stars |
|---|---|
| 0 | ★★★ |
| 1 | ★★ |
| 2 | ★ |

Never zero — a level you finished is a level you finished, and a zero-star result for
completing something reads as a failure. Maximum is 39 across the thirteen levels.

The card also spells out the try count, because the stars are derived from it and
showing only the stars leaves the scoring feeling arbitrary to the adult in the room,
who is the person reading it.

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

Progress is `{levelIndex, stars}` — an **index into `LEVELS`**. That is fine until the level
list changes shape: inserting the three colour levels at the front turned a stored "index 4"
from a number level into shape level 5, so anyone with saved progress reopened the game
**past the new levels** with no indication anything had happened. The game was not wrong by
its own rules; the record simply meant something different than when it was written.

So the record stores `LEVELS_VERSION` too, and `loadProgress` discards anything that does not
match — including unversioned records, which by definition predate the colour levels. Throwing
away a few banked stars is by far the cheaper failure.

Two details that matter more than they look:

- The version is stamped inside `saveProgress`, not passed in by callers, so no call site can
  omit it.
- `LEVELS_VERSION` lives in [levels.ts](src/levels.ts) beside the array it describes, because
  that is the file someone edits when they cause the problem. Appending to the end of `LEVELS`
  is the one safe change; anything else needs a bump.

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

Thirty-eight clips in `public/audio/`, all generated rather than sourced — none of them bought,
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

A fixed 1000×720 logical stage, scaled to fit and letterboxed. Every coordinate is in
logical units and `App.tsx` is the only place the real screen size is considered.
Fixed-then-scaled rather than fluid because a fluid layout has to be correct at every
width, and this one only has to be correct once — which matters when the thing being
positioned is a drop target a two-year-old has to hit.

`touch-action: none`, no user-select, no tap highlight, `maximum-scale=1` — a dragged
finger must never scroll, rubber-band, select text or pinch-zoom the board away.

## Verified

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
- **Only four holes.** That bounds a number level to four numerals per attempt, so level 13
  shows four of twenty rather than covering the range. Widening it means shrinking
  `SHAPE_PX` or going to two rows.
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

Two sets of bundled assets are deliberately carved out of it, because they are not mine to
relicense:

| | |
|---|---|
| `public/fonts/*.woff2` | Baloo 2 and Fredoka, **SIL OFL 1.1** ([notice](public/fonts/LICENSE.txt)). Redistributing the files requires that notice to travel with them. |
| `public/audio/game-*`, `kids-*` | **Microsoft Edge neural voices**, generated via `msedge-tts`. Included for convenience so a clone runs, not as MIT-licensed. Regenerate them if the distinction matters to you. |
| `public/audio/sfx-*` | Synthesized from scratch with numpy, no samples. MIT like the code. |
