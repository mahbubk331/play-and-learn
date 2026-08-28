import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/*
 * Declared rather than pulling in @types/node for one property. This config is the only
 * file in the project that touches a Node global, and the dependency would couple the
 * project's TypeScript version to the @types/node release train for no benefit.
 */
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  /*
   * Asset URLs are absolute by default ("/assets/..."), which is correct for a site
   * served from a domain root — Cloudflare Pages, Netlify, Vercel, or a custom domain.
   *
   * It is WRONG for a project served from a subdirectory, e.g. GitHub Pages at
   * user.github.io/shape-game/, where "/assets/..." and "/audio/..." both 404. Build
   * those with:
   *
   *     BASE_PATH=/shape-game/ bun run build
   */
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
});
