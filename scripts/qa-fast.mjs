import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL && !process.env.RP_SKIP_DEV_DB) {
  const database = spawnSync("node", ["scripts/dev-db.mjs", "start"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (database.status !== 0) process.exit(database.status ?? 1);
}
process.env.DATABASE_URL ??= "postgresql://postgres:recruiterpal@127.0.0.1:5499/recruiterpal";
process.env.RP_APP_DATABASE_URL ??= "postgresql://rp_app:recruiterpal@127.0.0.1:5499/recruiterpal";
process.env.BETTER_AUTH_SECRET ??= "qa-local-only-secret";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";

const commands = [
  ["pnpm", ["format:check"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test:unit"]],
  ["pnpm", ["--filter", "@recruiterpal/contracts", "test:unit"]],
  ["pnpm", ["db:migrate"]],
  ["pnpm", ["test:db"]],
  ["pnpm", ["test:workflows"]],
  ["pnpm", ["evals"]],
  ["pnpm", ["audit", "--audit-level", "high"]],
  ["pnpm", ["scan:clean-room"]],
  ["pnpm", ["scan:secrets"]],
  ["pnpm", ["--filter", "@recruiterpal/web", "build"]],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
