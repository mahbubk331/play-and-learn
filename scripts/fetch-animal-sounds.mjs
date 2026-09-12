/**
 * Builds the animal park's clips from REAL recordings where one exists, and from the voice where
 * one does not.
 *
 *   node scripts/fetch-animal-sounds.mjs
 *
 * WHY ONLY FIVE ARE REAL. Wikimedia Commons is the only source reachable from here with
 * machine-readable licences, and it has a usable recording for five of the twelve. The rest keep
 * the spoken "Roar! Lion." from gen-voice.mjs. That split is a deliberate choice, taken knowing
 * the park sounds inconsistent as a result — see the README.
 *
 * WHAT THE SEARCH TAUGHT US, recorded because it is genuinely non-obvious:
 *
 *   - Commons' free-text search is hostile to this. "cow" returns a 1922 ragtime record and a
 *     diving alarm named "Cow Fart"; "tiger" returns a European bison; "horse" returns cockatoos.
 *   - Worse, most keyword hits are LINGUA LIBRE files — "LL-Q1860 (eng)-Someone-meow.wav" is a
 *     volunteer pronouncing the WORD "meow" for a dictionary. They pass every keyword filter and
 *     are more of a human imitation than the voice clips they were meant to replace. Anything
 *     matching LL-*, En-xx-* or "pronunciation" is excluded on sight.
 *   - Species categories ("Category:Dog sounds") mostly do not exist.
 *   - NC licences are excluded outright: this ships in an app store, and non-commercial means
 *     non-commercial.
 *
 * Each clip is: [real recording] + [180ms] + [the animal's name, spoken]. One file, so nothing
 * downstream changes — the noise and the name can never arrive out of order, and audio.ts still
 * sees one clip per animal.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "audio-src");
/**
 * Must match VOICE in gen-voice.mjs.
 *
 * The animal's name is spoken after the recording, by the narrator, so a mismatch here produces a
 * single clip that changes voice halfway through — which is worse than either voice on its own.
 */
const VOICE = "en-US-EmmaNeural";
const UA = "play-and-learn-asset-fetch/1.0 (educational app)";

/**
 * The five, hand-picked and hand-checked from the search results.
 *
 * `name` is what gets spoken after the recording and must match ANIMALS in src/animals.ts.
 * `keep` is how long a window to cut — long enough to be recognisable, short enough that a child
 * tapping across the grid is not waiting.
 */
const SOURCES = [
  {
    id: "tiger",
    name: "Tiger",
    file: "439280 schots angry-tiger.wav",
    keep: 1.6,
  },
  {
    id: "cat",
    name: "Cat",
    file: "Meow of a Siamese cat - freemaster2.wav",
    keep: 1.4,
  },
  {
    id: "dog",
    name: "Dog",
    file: "A dog making noises and barking.flac",
    keep: 1.5,
  },
  {
    id: "duck",
    name: "Duck",
    file: "Anas platyrhynchos - Mallard XC62258.mp3",
    keep: 1.6,
  },
  { id: "horse", name: "Horse", file: "Wiehern.ogg", keep: 1.8 },
];

let last = 0;
const api = async (params, attempt = 1) => {
  const wait = Math.max(0, 1500 - (Date.now() - last));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (r.status === 429 && attempt < 6) {
    await new Promise((res) => setTimeout(res, 5000 * attempt));
    return api(params, attempt + 1);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

/** Licence and author, read from Commons rather than transcribed by hand. */
const provenance = async (file) => {
  const j = await api({
    action: "query",
    titles: `File:${file}`,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
  });
  const page = j?.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Commons has no file "${file}"`);
  const md = info.extmetadata ?? {};
  const strip = (v) => (v ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    url: info.url.split("?")[0],
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    licence: strip(md.LicenseShortName?.value) || "unknown",
    licenceUrl: strip(md.LicenseUrl?.value),
    author: strip(md.Artist?.value) || "unknown",
    credit: strip(md.Credit?.value),
  };
};

/**
 * Fetch the file itself, throttled and retried.
 *
 * upload.wikimedia.org rate-limits separately from the API and will 429 a burst of five
 * downloads without complaint elsewhere — which is how this failed the first time, three files
 * in. Serial with a pause is both polite and the only thing that works.
 */
let lastDownload = 0;
const download = async (url, label, attempt = 1) => {
  const wait = Math.max(0, 2500 - (Date.now() - lastDownload));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastDownload = Date.now();

  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (r.status === 429 && attempt < 6) {
    await new Promise((res) => setTimeout(res, 6000 * attempt));
    return download(url, label, attempt + 1);
  }
  if (!r.ok) throw new Error(`${label}: download HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};

const collect = (stream) =>
  new Promise((res, rej) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => res(Buffer.concat(chunks)));
    stream.on("error", rej);
  });

const speak = async (text, attempt = 1) => {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text);
    return await collect(audioStream);
  } catch (e) {
    if (attempt < 4) return speak(text, attempt + 1);
    throw e;
  } finally {
    try {
      tts.close();
    } catch {
      /* already closed */
    }
  }
};

const wav = (samples, rate) => {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");

/**
 * Decode anything Chromium can read, then cut the best window out of it.
 *
 * "Best" is the highest-energy window of the requested length, which is what finds the actual
 * bark in fourteen seconds of a dog pottering about. Then: peak-normalise, because a field
 * recording is nowhere near the level of the studio-clean clips it sits beside, and fade 12ms
 * either end, because cutting a waveform mid-cycle clicks.
 */
const bestWindow = async (bytes, keepSeconds) =>
  page.evaluate(
    async ({ b64, keepSeconds }) => {
      const raw = atob(b64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

      const ctx = new OfflineAudioContext(1, 1, 48000);
      const buf = await ctx.decodeAudioData(arr.buffer);

      // Mixed to mono: several of these are stereo and the app is mono throughout.
      const n = buf.length;
      const mono = new Float32Array(n);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels;
      }

      const rate = buf.sampleRate;
      const win = Math.min(n, Math.round(keepSeconds * rate));

      // Sliding energy, via a prefix sum so this stays linear on a 65-second file.
      const sq = new Float64Array(n + 1);
      for (let i = 0; i < n; i++) sq[i + 1] = sq[i] + mono[i] * mono[i];
      let bestAt = 0;
      let bestEnergy = -1;
      const step = Math.max(1, Math.round(rate * 0.01));
      for (let s = 0; s + win <= n; s += step) {
        const e = sq[s + win] - sq[s];
        if (e > bestEnergy) {
          bestEnergy = e;
          bestAt = s;
        }
      }

      const cut = mono.slice(bestAt, bestAt + win);

      let peak = 0;
      for (const v of cut) peak = Math.max(peak, Math.abs(v));
      const gain = peak > 0 ? 0.92 / peak : 1;

      const fade = Math.round(rate * 0.012);
      for (let i = 0; i < cut.length; i++) {
        let g = gain;
        if (i < fade) g *= i / fade;
        if (i >= cut.length - fade) g *= (cut.length - 1 - i) / fade;
        cut[i] *= g;
      }

      return { samples: Array.from(cut), rate, sourceSeconds: +buf.duration.toFixed(1) };
    },
    { b64: bytes.toString("base64"), keepSeconds },
  );

/** Trim the padding silence off a spoken clip, as gen-voice.mjs does. */
const spokenName = async (text) => {
  const bytes = await speak(text);
  return page.evaluate(async (b64) => {
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const buf = await ctx.decodeAudioData(arr.buffer);
    const d = buf.getChannelData(0);
    const FLOOR = 0.012;
    let f = 0;
    let l = d.length - 1;
    while (f < d.length && Math.abs(d[f]) < FLOOR) f++;
    while (l > f && Math.abs(d[l]) < FLOOR) l--;
    f = Math.max(0, f - Math.round(buf.sampleRate * 0.02));
    l = Math.min(d.length - 1, l + Math.round(buf.sampleRate * 0.06));
    return { samples: Array.from(d.slice(f, l + 1)), rate: buf.sampleRate };
  }, bytes.toString("base64"));
};

const attribution = [];

for (const src of SOURCES) {
  const p = await provenance(src.file);

  const bytes = await download(p.url, src.file);

  const sound = await bestWindow(bytes, src.keep);
  const name = await spokenName(`${src.name}.`);

  /*
   * LEVEL-MATCH THE RECORDING TO THE VOICE, which is not optional and was wrong first time.
   *
   * Peak-normalising the recording to 0.92 and appending the name at its natural level produced
   * clips that were loud then quiet inside themselves, and about 4dB louder than the seven
   * all-voice animals — so tapping the tiger and then the lion jumped in volume. Matching on RMS
   * rather than peak, because RMS is what loudness actually tracks: a bark is far peakier than a
   * spoken word, and equal peaks means the bark sounds much louder.
   *
   * 1.1x the name, so the animal noise sits just forward of the label that follows it without
   * the whole clip being louder than the seven all-voice ones.
   */
  const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / (a.length || 1));
  const nameRms = rms(name.samples);
  const soundRms = rms(sound.samples);
  const scale = soundRms > 0 ? Math.min(4, (nameRms * 1.1) / soundRms) : 1;

  // recording + 180ms + name, all at 48kHz mono.
  const gap = new Array(Math.round(sound.rate * 0.18)).fill(0);
  const joined = [...sound.samples.map((v) => v * scale), ...gap, ...name.samples];

  /*
   * Peak-limit the finished clip by SCALING, never by clipping.
   *
   * The horse recording is dense enough that RMS-matching pushed its peaks to 0.97, which is
   * where a 16-bit render starts to sound crunchy. Scaling the whole clip preserves the balance
   * that was just established; hard-clipping the samples would have distorted the loudest part
   * of the one clip most likely to be tapped repeatedly.
   */
  const peak = joined.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (peak > 0.9) {
    const trim = 0.9 / peak;
    for (let i = 0; i < joined.length; i++) joined[i] *= trim;
  }

  writeFileSync(join(OUT, `game-a${src.id}.wav`), wav(joined, sound.rate));

  console.log(
    `${src.id.padEnd(8)} ${(joined.length / sound.rate).toFixed(2)}s ` +
      `(${src.keep}s of ${sound.sourceSeconds}s + "${src.name}")  ${p.licence}`,
  );

  attribution.push({ ...src, ...p });
}

await browser.close();

const lines = [
  "# Bundled animal recordings",
  "",
  "Five of the twelve animal clips in `audio-src/` contain a real field recording sourced from",
  "Wikimedia Commons. They are the only assets in this project not generated by it, and they are",
  "listed here because two of them require attribution and one requires share-alike.",
  "",
  "Each file is that recording (highest-energy window, peak-normalised, faded, resampled to mono",
  "48kHz) followed by the animal's name spoken by the project's own voice. The result is a",
  "derivative work of the recording.",
  "",
  "The other seven animals — lion, cow, goat, chicken, monkey, crocodile, dinosaur — contain no",
  "third-party audio. They are entirely generated; see the README.",
  "",
  "| clip | source | author | licence |",
  "|---|---|---|---|",
  ...attribution.map(
    (a) =>
      `| \`game-a${a.id}.wav\` | [${a.file}](${a.page}) | ${a.author} | [${a.licence}](${a.licenceUrl || "https://commons.wikimedia.org"}) |`,
  ),
  "",
  "## What each licence requires",
  "",
  "- **CC0** — public domain dedication. No attribution required; credited here anyway.",
  "- **Public domain** — no restrictions.",
  "- **CC BY-SA** — attribution required, and derivatives must carry the same licence. The clips",
  "  built from these recordings are therefore offered under CC BY-SA, not the MIT licence that",
  "  covers this project's code. See [LICENSE](LICENSE).",
  "",
  "Regenerate with `node scripts/fetch-animal-sounds.mjs`, which rewrites this file from the live",
  "Commons metadata rather than from anything typed by hand.",
  "",
];

writeFileSync(join(root, "ATTRIBUTION.md"), lines.join("\n"));
console.log("\nwrote ATTRIBUTION.md");
