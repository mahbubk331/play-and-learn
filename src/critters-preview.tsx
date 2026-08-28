import { createRoot } from "react-dom/client";

import { speciesFor, STYLES, type Style } from "./critters/registry";
import { colors, fonts } from "./theme";
import "./index.css";

/**
 * Dev-only gallery: every animal, in every style, side by side.
 *
 * Served by Vite at /critters.html and NOT a build input, so it never reaches production.
 * It exists because five animals cannot be iterated on through the game — the species is
 * random on a correct answer, so checking one specific drawing meant replaying until it
 * came up. Comparing three styles of five animals is flatly impossible that way.
 *
 *   ?frame=N   freezes the shared CSS animations at N ms, so the clap and the open jaw can
 *              be inspected without racing a screenshot against a keyframe
 *   ?style=x   show only one style
 */
const params = new URLSearchParams(location.search);
const frame = params.get("frame");
const only = params.get("style") as Style | null;

const styles = only ? [only] : STYLES;

const Row = ({ style }: { style: Style }) => (
  <div style={{ marginBottom: 4 }}>
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: 30,
        color: colors.ink,
        padding: "6px 0 0 12px",
      }}
    >
      {style}
    </div>
    <div style={{ display: "flex" }}>
      {speciesFor(style).map((s) => (
        <div key={s.id} style={{ width: 250 }}>
          <div
            className="critter"
            style={{
              width: 250,
              animationDelay: frame ? `-${frame}ms` : undefined,
              animationPlayState: frame ? "paused" : undefined,
            }}
          >
            <svg viewBox="0 0 200 170" width="100%" style={{ display: "block" }}>
              <s.Art />
            </svg>
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 21,
              color: colors.ink,
            }}
          >
            {s.name}
          </div>
        </div>
      ))}
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <div
    style={{
      background: colors.bg,
      minHeight: "100vh",
      padding: "8px 0",
    }}
  >
    {styles.map((s) => (
      <Row key={s} style={s} />
    ))}
  </div>,
);
