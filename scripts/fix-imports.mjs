import fs from "node:fs";
import path from "node:path";

const changed = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "dist", ".turbo"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) {
      let src = fs.readFileSync(p, "utf8");
      if (src.charCodeAt(0) === 0xfeff) {
        src = src.slice(1);
        changed.push(`${p} (BOM stripped)`);
      }
      const out = src.replace(
        /(from\s+['"])(\.\.?\/[^'"]*?)\.js(['"])/g,
        (_m, a, b, c) => a + b + c,
      );
      if (out !== src) {
        fs.writeFileSync(p, out);
        changed.push(p);
      }
    }
  }
}
walk(".");
console.log("files changed:", changed.length);
console.log(changed.join("\n"));
