import { defineConfig, devices } from "@playwright/test";

// BASE_URL: the website under test (local `next start`, or a Vercel URL). API_URL: the API it talks to, used by
// helpers to create test accounts quickly. Retries are OFF on purpose: the three-run flakiness check in
// docs/TEST_PLAN.md must see every failure.
export const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
export const API_URL = process.env.API_URL || "http://localhost:8010";
// LIVE=1 when testing the deployed site: the free server analyses at ~8x video length, one video at a time.
export const LIVE = !!process.env.LIVE;
export const ANALYSIS_TIMEOUT = LIVE ? 600_000 : 120_000;
// Sample pages in live mode fall back to the stored result after 180 s (SampleCard / SampleRunner), and the server
// analyses one video at a time, so a sample run queued behind others can legitimately take that long.
export const SAMPLE_TIMEOUT = 200_000;

export default defineConfig({
  testDir: "./tests",
  timeout: LIVE ? 900_000 : 150_000, // a real analysis runs inside some tests
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "iphone-14", use: { ...devices["iPhone 14"] } },
  ],
});
