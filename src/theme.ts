/**
 * The preschool series palette.
 *
 * These hex values are the same ones in remotion-app/src/kids/theme.ts, deliberately
 * copied rather than imported: that module pulls in @remotion/google-fonts, which
 * drags the whole Remotion font loader into a plain web app. The shape polygons ARE
 * imported across (see stage.ts) because they are pure data and because artwork
 * drifting between the video and the game would be a real bug. Ten hex values drifting
 * would not.
 *
 * Fonts come from the Google Fonts CDN, linked in index.html.
 */
export const colors = {
  bg: "#FFF3DC",
  bgDeep: "#F6E3C2",

  machine: "#B8C4D4",
  machineDark: "#8F9EB2",
  machineLight: "#D7E0EC",
  interior: "#3A3347",

  ink: "#2A2438",
  text: "#2A2438",
  textOnDark: "#FFF8EC",

  spark: "#FFD34E",
  shadow: "rgba(42, 36, 56, 0.16)",

  /** One colour for every block. See the note in the shared shapes.ts. */
  block: "#F2A03D",
  blockDeep: "#C1741F",

  /** The wrong-answer X. The only red in the app, so it means exactly one thing. */
  wrong: "#E23B3B",
};

export const fonts = {
  display: "'Baloo 2', system-ui, sans-serif",
  sans: "'Fredoka', system-ui, sans-serif",
};
