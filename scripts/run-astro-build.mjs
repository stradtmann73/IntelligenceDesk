import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const astroCliPath = path.join(currentDirectory, "..", "node_modules", "astro", "astro.js");

const result = spawnSync(process.execPath, [astroCliPath, "build"], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1"
  }
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
