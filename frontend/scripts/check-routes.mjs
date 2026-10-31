// After `next build`: fail if any page is missing from the build. Added after a live 404: a .gitignore rule
// silently dropped the reports pages from git, so the deployed site had no reports pages (BUG-13).
import { existsSync } from "node:fs";

const LITE = ["dashboard", "events", "login", "profile", "reports", "samples", "signup", "support", "upload"];
const MAIN = ["assess", "assess/logic", "assess/mindset", "assess/reaction", "card", "challenges", "compare", "dashboard",
  "events", "login", "profile", "progress", "reports", "rooms", "samples", "settings", "signup", "support", "training", "upload"];
const expected = [
  ".next/server/app/lite.html",
  ...LITE.map((p) => `.next/server/app/lite/${p}.html`),
  ".next/server/app/lite/reports/[id]/page.js",
  ".next/server/app/main.html",
  ...MAIN.map((p) => `.next/server/app/main/${p}.html`),
  ".next/server/app/main/(app)/reports/[id]/page.js",
  ".next/server/app/main/(app)/rooms/[id]/page.js",
  ".next/server/app/main/(app)/rooms/[id]/reports/[aid]/page.js",
  ".next/server/middleware.js",
];
const missing = expected.filter((f) => !existsSync(f));
if (missing.length) {
  console.error("Missing from the build:\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log(`All ${expected.length} expected routes are in the build.`);
