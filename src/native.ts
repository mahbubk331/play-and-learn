/**
 * Native device integration, and the graceful nothing it does on the web.
 *
 * Every call here is guarded by `isNative`. Capacitor plugins have web implementations that
 * either no-op or throw "not implemented", and a game that throws on desktop because it
 * asked for a haptic is worse than a game with no haptics.
 *
 * These are not decoration. App Store review guideline 4.2 asks, in effect, whether an app
 * does app things; haptics, a locked orientation, a hidden status bar and saved progress are
 * exactly the things a webview-wrapped page does not do, and they are also all genuinely
 * better for the child holding the tablet.
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import { LEVELS_VERSION, type Mode } from "./levels";

export const isNative = Capacitor.isNativePlatform();

/** Swallow anything a plugin throws. A failed nicety must never take the game down. */
const quietly = async (work: () => Promise<unknown>): Promise<void> => {
  try {
    await work();
  } catch {
    // Plugin missing, unsupported on this device, or web. Either way: not fatal.
  }
};

/**
 * Called once, after the first render.
 *
 * Orientation is locked here as well as in Info.plist. The plist is what the App Store and
 * the springboard read; this is what catches an iPad, where the plist's supported
 * orientations are advisory and the system will happily rotate anyway.
 */
export const prepareDevice = async (): Promise<void> => {
  if (!isNative) return;

  await quietly(() => ScreenOrientation.lock({ orientation: "landscape" }));
  await quietly(() => StatusBar.hide());
  await quietly(() => StatusBar.setStyle({ style: Style.Dark }));
};

/** Called once the game is actually interactive, not on a timer. */
export const dismissSplash = async (): Promise<void> => {
  if (!isNative) return;
  await quietly(() => SplashScreen.hide());
};

/**
 * A correct answer.
 *
 * `NotificationType.Success` is the system's own "that worked" pattern — two light taps —
 * which is more legible through a tablet case than a single buzz, and is the pattern the rest
 * of iOS already uses for the same meaning.
 */
export const hapticCorrect = (): void => {
  if (!isNative) return;
  void quietly(() => Haptics.notification({ type: NotificationType.Success }));
};

/**
 * A wrong answer: one light bump, matching the knock the block makes.
 *
 * Deliberately the gentlest of the impact styles. The whole design of the correction is that
 * it costs as little as possible, and a heavy buzz on a mistake undoes that in the one channel
 * a child cannot look away from.
 */
export const hapticWrong = (): void => {
  if (!isNative) return;
  void quietly(() => Haptics.impact({ style: ImpactStyle.Light }));
};

/** The block landing in a hole. Light, because it happens on every single drop. */
export const hapticDrop = (): void => {
  if (!isNative) return;
  void quietly(() => Haptics.selectionChanged());
};

/**
 * Saved progress.
 *
 * Preferences on device (backed by UserDefaults), localStorage on the web. Two reasons for the
 * web path rather than a native-only feature: the game still works as a web build, and it means
 * persistence can actually be TESTED in a browser instead of only on a device.
 */
const KEY = "shape-machine-progress";

/** Where one track was left, and what it has banked. */
export type TrackProgress = { levelIndex: number; stars: number };

/**
 * Progress for every track that has been played, keyed by track id.
 *
 * Partial on purpose: a track with no entry has not been started, which is exactly what the
 * picker needs to show "Start" rather than "Level 1". It also means ADDING a track is not a
 * breaking change to the stored format — the new one simply has no entry yet — which is why
 * LEVELS_VERSION only has to move when an existing track's level list changes meaning.
 */
export type Progress = Partial<Record<Mode, TrackProgress>>;

/** What is actually stored: the progress plus the level-structure version it was earned under. */
type Stored = { v: number; tracks: Progress };

export const saveProgress = async (p: Progress): Promise<void> => {
  // The version is stamped HERE rather than passed in, so no caller can omit it.
  const value = JSON.stringify({ v: LEVELS_VERSION, tracks: p } satisfies Stored);
  if (isNative) {
    await quietly(() => Preferences.set({ key: KEY, value }));
    return;
  }
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Private browsing, or storage full. Losing progress is not worth an exception.
  }
};

/**
 * Validate one track's entry rather than trust it.
 *
 * A stale or hand-edited value must not put the game on a level that does not exist. The upper
 * bound is checked by the caller against the track's own length, because this module
 * deliberately knows nothing about how long any track is.
 */
const validEntry = (value: unknown): TrackProgress | null => {
  if (typeof value !== "object" || value === null) return null;
  const { levelIndex, stars } = value as Partial<TrackProgress>;
  if (typeof levelIndex !== "number" || typeof stars !== "number") return null;
  if (levelIndex < 0 || stars < 0) return null;
  if (!Number.isInteger(levelIndex)) return null;
  return { levelIndex, stars };
};

export const loadProgress = async (): Promise<Progress> => {
  let raw: string | null = null;

  if (isNative) {
    try {
      raw = (await Preferences.get({ key: KEY })).value;
    } catch {
      raw = null;
    }
  } else {
    try {
      raw = window.localStorage.getItem(KEY);
    } catch {
      raw = null;
    }
  }

  // An empty map rather than null: "nothing played yet" and "nothing saved" are the same state
  // to every caller, and returning one of them spares every caller a null check.
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Partial<Stored>;

    /*
     * Earned under a different level list, so the indices no longer mean what they meant.
     * Unversioned records, and versions 1 and 2, predate the split into tracks and stored a
     * single index into one thirteen-level ladder — there is no honest way to map that onto
     * four tracks, so it goes.
     */
    if (parsed?.v !== LEVELS_VERSION) return {};
    if (typeof parsed.tracks !== "object" || parsed.tracks === null) return {};

    const out: Progress = {};
    for (const [id, entry] of Object.entries(parsed.tracks)) {
      const valid = validEntry(entry);
      // One corrupt track entry loses that track, not the other three.
      if (valid) out[id as Mode] = valid;
    }
    return out;
  } catch {
    return {};
  }
};

/**
 * Wipe every track at once.
 *
 * Not what "Play again" does — that resets the one track that was just finished, by saving a
 * map with that entry zeroed, so a child replaying colours does not lose their number stars.
 * This is the whole-app reset, kept for the case where the stored record has to go entirely.
 */
export const clearProgress = async (): Promise<void> => {
  if (isNative) {
    await quietly(() => Preferences.remove({ key: KEY }));
    return;
  }
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
};
