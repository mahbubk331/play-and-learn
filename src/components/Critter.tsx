import { CRITTER } from "../stage";
import type { Species } from "../critters/registry";

/**
 * The animated wrapper: whichever animal turned up, sliding in, applauding, sliding out.
 *
 * All the motion is CSS in index.css — `.critter` carries the travel and the bounce,
 * `.critter-jaw` the laugh, `.critter-arm-l` / `-r` the clap. The species supplies only
 * artwork, and because every species uses the same class names on the same parts, adding a
 * sixth animal needs no changes here or to the CSS.
 */
export const Critter = ({
  species,
  nonce,
}: {
  species: Species;
  nonce: number;
}) => (
  <div
    // Remounting restarts the CSS animation; without a changing key a second correct
    // answer in a row would show a motionless animal.
    key={nonce}
    className="critter"
    style={{
      position: "absolute",
      left: CRITTER.x,
      top: CRITTER.y,
      width: CRITTER.width,
      pointerEvents: "none",
    }}
  >
    <svg viewBox="0 0 200 170" width="100%" style={{ display: "block" }}>
      <species.Art />
    </svg>
  </div>
);
