// After `next build`: fail if any page is missing from the build. Added after a live 404: a .gitignore rule
// silently dropped app/[edition]/reports from git, so the deployed site had no reports pages (BUG-13).
import { existsSync } from "node:fs";

const PAGES = ["dashboard", "events", "login", "profile", "reports", "samples", "signup", "support", "upload"];
const expected = [
  ...["lite", "main"].flatMap((e) => [`.next/server/app/${e}.html`, ...PAGES.map((p) => `.next/server/app/${e}/${p}.html`)]),
  ".next/server/app/[edition]/reports/[id]/page.js",
  ".next/server/middleware.js",
];
const missing = expected.filter((f) => !existsSync(f));
if (missing.length) {
  console.error("Missing from the build:\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log(`All ${expected.length} expected routes are in the build.`);
