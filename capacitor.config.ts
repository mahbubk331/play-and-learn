import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell configuration.
 *
 * The game is a web build wrapped by Capacitor, and everything here exists to make it
 * behave like an app rather than like a page in a browser — which is both what the child
 * needs and what App Store review guideline 4.2 is asking about.
 */
const config: CapacitorConfig = {
  appId: "com.shapemachine.game",
  appName: "Shape Machine",
  webDir: "dist",

  ios: {
    /*
     * The stage is 1000x720 — landscape. Left in portrait on a phone it letterboxes down to
     * a postage stamp, so the drop targets a two-year-old has to hit end up a few
     * millimetres across. Locked in Info.plist by the Xcode step (see the README) and
     * enforced at runtime by src/native.ts as a belt-and-braces measure.
     */
    contentInset: "never",
    /*
     * Bounce-scrolling a fixed full-screen stage does nothing except let a dragged finger
     * peel the whole game away from the top of the screen.
     */
    scrollEnabled: false,
    backgroundColor: "#F6E3C2",
  },

  plugins: {
    SplashScreen: {
      /*
       * Hidden explicitly by the app once React has mounted and the audio buffers have been
       * decoded, rather than on a timer. A timer either flashes the splash away before the
       * first frame is ready or holds it after the game is interactive.
       */
      launchAutoHide: false,
      backgroundColor: "#F6E3C2",
      showSpinner: false,
    },
  },
};

export default config;
