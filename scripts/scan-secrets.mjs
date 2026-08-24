import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/,
  /\b(?:sk|rk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/i,
  /^\s*(?:DATABASE_URL|OPENCODE_GO_API_KEY|BETTER_AUTH_SECRET)\s*=\s*(?!\s*(?:$|#|your_|<|\$\{))/im,
];
const violations = [];

for (const file of files) {
  if (file === ".env.example" || file.includes("docs/build-contract/")) continue;
  const source = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

if (violations.length > 0) {
  console.error("Secret scan failed:");
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} tracked files checked).`);
