import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const eveCli = resolve(scriptRoot, "../node_modules/eve/bin/eve.js");
const { EVE_INTERNAL_HOST_BUILD_OUTPUT_DIRECTORY: _hostOutputDirectory, ...environment } =
  process.env;

const result = spawnSync(process.execPath, [eveCli, "build"], {
  env: environment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
