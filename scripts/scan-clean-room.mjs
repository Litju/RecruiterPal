import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbiddenWords = ["P" + "wC", "Recruiting " + "Insight " + "Engine"];
const forbiddenPath = /(?:pwc|recruiting[_ -]?insight|private[_ -]?dataset)/i;
const violations = [];

for (const file of files) {
  if (
    file.startsWith("docs/build-contract/") ||
    file === "scripts/scan-clean-room.mjs" ||
    file === "pnpm-lock.yaml"
  )
    continue;
  if (forbiddenPath.test(file)) violations.push(`${file}: forbidden artifact path`);
  const source = readFileSync(file, "utf8").toLowerCase();
  for (const word of forbiddenWords) {
    if (source.includes(word.toLowerCase())) violations.push(`${file}: forbidden provenance term`);
  }
}

if (violations.length > 0) {
  console.error("Clean-room scan failed:");
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Clean-room scan passed (${files.length} tracked files checked).`);
