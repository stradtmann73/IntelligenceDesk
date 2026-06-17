import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCircleHtml } from "../src/lib/rendering/build-circle-html.ts";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const outputDirectory = path.join(projectRoot, "dist", "circle-facing");
const snapshotSourcePath = path.join(projectRoot, "data", "current", "snapshot.json");

const artifacts = await buildCircleHtml();

await mkdir(outputDirectory, { recursive: true });

const customHtmlPath = path.join(outputDirectory, "circle-custom-html.html");
const embedHtmlPath = path.join(outputDirectory, "circle-embed.html");
const snapshotPath = path.join(outputDirectory, "snapshot.json");
const instructionsPath = path.join(outputDirectory, "README.md");

await writeFile(customHtmlPath, artifacts.customHtml, "utf8");
await writeFile(embedHtmlPath, artifacts.embedHtml, "utf8");
await copyFile(snapshotSourcePath, snapshotPath);
await writeFile(
  instructionsPath,
  [
    "# Circle-Facing Deliverables",
    "",
    "- `circle-custom-html.html`: paste this into Circle once, then replace `https://YOUR-HOSTED-SNAPSHOT-URL/snapshot.json` with the hosted URL of `snapshot.json`.",
    "- `snapshot.json`: host this file at a public URL with CORS enabled so the Circle block can fetch it.",
    "- `circle-embed.html`: legacy static export kept for reference only.",
    "",
    "Recommended path: host `snapshot.json` on a static host and use `circle-custom-html.html` as the one-time pasted Circle shell."
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify({
    custom_html_path: customHtmlPath,
    embed_html_path: embedHtmlPath,
    snapshot_path: snapshotPath,
    instructions_path: instructionsPath
  })
);
