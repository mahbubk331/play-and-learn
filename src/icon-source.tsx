import { createRoot } from "react-dom/client";

import { speciesFor } from "./critters/registry";
import { colors } from "./theme";
import "./index.css";

/**
 * Dev-only source for the App Store icon and splash.
 *
 * Rendered from the SAME artwork the game uses, so the icon can never drift from what is
 * inside the app, and regenerating it after an art change is one screenshot rather than a
 * round-trip through an image editor.
 *
 *   ?kind=icon      1024x1024, animal filling the square  (App Store requires 1024)
 *   ?kind=splash    2732x2732, animal small and centred   (Capacitor centre-crops it)
 *   ?species=lion   which animal
 *
 * Not a build input, so it never reaches dist/.
 */
const params = new URLSearchParams(location.search);
const kind = params.get("kind") ?? "icon";
const which = params.get("species") ?? "lion";

const size = kind === "splash" ? 2732 : 1024;
/*
 * The artwork is 200x170 — wider than tall — so scaling it to the square's WIDTH leaves bands
 * of empty background top and bottom, which on an app icon just reads as a small picture in a
 * big box. 1.1 scales past the width so the square fills vertically and the mane is trimmed a
 * little at the sides, which the device's rounded-rect mask was going to crop anyway.
 *
 * A splash is mostly background by convention, so it stays small and centred.
 */
const art = kind === "splash" ? 0.3 : 1.1;

const species = speciesFor("portrait").find((s) => s.id === which)!;

createRoot(document.getElementById("root")!).render(
  <div
    id="shot"
    style={{
      width: size,
      height: size,
      background: colors.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <div style={{ width: size * art }}>
      <svg viewBox="0 0 200 170" width="100%" style={{ display: "block" }}>
        <species.Art />
      </svg>
    </div>
  </div>,
);
