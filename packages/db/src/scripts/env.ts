import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

// Walk up from cwd to find the repo-root .env.local (app convention), then
// plain .env as fallback.
let dir = process.cwd();
for (let i = 0; i < 6; i++) {
  const local = resolve(dir, ".env.local");
  const plain = resolve(dir, ".env");
  if (existsSync(local)) {
    config({ path: local });
    break;
  }
  if (existsSync(plain)) {
    config({ path: plain });
    break;
  }
  const parent = resolve(dir, "..");
  if (parent === dir) break;
  dir = parent;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is required. Copy .env.example to .env.local and configure it.`,
    );
  }
  return value;
}
