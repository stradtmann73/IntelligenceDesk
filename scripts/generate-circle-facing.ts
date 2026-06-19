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
const previewHtmlPath = path.join(outputDirectory, "circle-preview.html");
const snapshotPath = path.join(outputDirectory, "snapshot.json");
const instructionsPath = path.join(outputDirectory, "README.md");

await writeFile(customHtmlPath, artifacts.customHtml, "utf8");
await writeFile(previewHtmlPath, artifacts.previewHtml, "utf8");
await copyFile(snapshotSourcePath, snapshotPath);
await writeFile(
  instructionsPath,
  [
    "# Circle-Facing Deliverables",
    "",
    "- `circle-custom-html.html`: paste this into Circle once. This file fetches the hosted `snapshot.json` directly and refreshes itself automatically.",
    "- `circle-preview.html`: local QA file for checking the same Circle block renderer before pasting into Circle.",
    "- `snapshot.json`: host this file at a public URL with CORS enabled so the Circle block can fetch it.",
    "",
    "Recommended path: deploy GitHub Pages, verify `circle-preview.html`, then paste `circle-custom-html.html` into Circle as the one-time block."
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify({
    custom_html_path: customHtmlPath,
    preview_html_path: previewHtmlPath,
    snapshot_path: snapshotPath,
    instructions_path: instructionsPath
  })
);
