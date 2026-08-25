import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const eveCli = resolve(scriptRoot, "../node_modules/eve/bin/eve.js");
const targetOutputDirectory = process.env.EVE_INTERNAL_BUILD_OUTPUT_DIRECTORY;
const hostOutputDirectory = process.env.EVE_INTERNAL_HOST_BUILD_OUTPUT_DIRECTORY;

if (!targetOutputDirectory || !hostOutputDirectory) {
  throw new Error(
    "EVE_INTERNAL_BUILD_OUTPUT_DIRECTORY and EVE_INTERNAL_HOST_BUILD_OUTPUT_DIRECTORY are required",
  );
}

// Vercel mounts the generated service output on a different volume. Eve's
// atomic rename cannot cross that boundary, so publish from a same-volume
// staging directory and copy the finished output to the generated target.
const stagedOutputDirectory = resolve(process.cwd(), ".eve", "vercel-service-output");
rmSync(stagedOutputDirectory, { force: true, recursive: true });
const environment = {
  ...process.env,
  EVE_INTERNAL_BUILD_OUTPUT_DIRECTORY: stagedOutputDirectory,
};

const result = spawnSync(process.execPath, [eveCli, "build"], {
  env: environment,
  stdio: "inherit",
});

if (result.error) throw result.error;
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

const resolvedTargetOutputDirectory = resolve(process.cwd(), targetOutputDirectory);
mkdirSync(dirname(resolvedTargetOutputDirectory), { recursive: true });
rmSync(resolvedTargetOutputDirectory, { force: true, recursive: true });
cpSync(stagedOutputDirectory, resolvedTargetOutputDirectory, { force: true, recursive: true });
