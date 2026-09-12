import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { applyLayout, orientationFor } from "./stage";
import "./index.css";

/*
 * Pick the stage before the first render rather than letting an effect correct it afterwards.
 * stage.ts defaults to landscape at import time, so without this a phone held upright paints
 * one frame of the landscape layout and then remounts into the portrait one — a visible flash
 * on the slowest part of startup.
 */
applyLayout(orientationFor(window.innerWidth, window.innerHeight));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
