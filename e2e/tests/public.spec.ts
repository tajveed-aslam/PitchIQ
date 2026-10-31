import { expect, test } from "@playwright/test";
import { SAMPLE_TIMEOUT } from "../playwright.config";
import { isPhone } from "./helpers";

test.describe("Landing page", () => {
  test("TC-WEB-01 hero, accuracy stats and calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("every touch");
    await expect(page.getByRole("img", { name: /bicycle kick/i })).toBeVisible();
    await expect(page.getByText("of touches found in our hand-counted tests")).toBeVisible();
    await page.getByRole("link", { name: /analyse a sample video/i }).click();
    await expect(page).toHaveURL(/\/samples$/);
  });

  test("TC-WEB-02 four Lite plans in test mode", async ({ page }) => {
    await page.goto("/#plans");
    const plans = page.locator("#plans article");
    await expect(plans).toHaveCount(4);
    await expect(page.locator("#plans")).toContainText("nothing is charged");
    await page.getByRole("link", { name: "Choose Skill Analysis" }).click();
    await expect(page).toHaveURL(/\/signup\?plan=skill/);
    await expect(page.getByRole("radio", { name: /Skill Analysis/ })).toBeChecked();
  });

  test("TC-WEB-03 testimonials are labelled as samples and use initials, not photos", async ({ page }) => {
    await page.goto("/");
    const quotes = page.locator("figure");
    await expect(quotes).toHaveCount(3);
    for (const q of await quotes.all()) {
      await expect(q.getByText("Sample", { exact: true })).toBeVisible();
      await expect(q.locator("img")).toHaveCount(0);
    }
  });

  test("TC-WEB-04 phone menu opens and navigates", async ({ page }, info) => {
    test.skip(!isPhone(info.project.name), "phone layout only");
    await page.goto("/");
    await page.getByTestId("menu").click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Samples" }).click();
    await expect(page).toHaveURL(/\/samples$/);
  });
});

test.describe("Sample library", () => {
  test("TC-SMP-01 every sample has a video, a download and a hand count", async ({ page }) => {
    await page.goto("/samples");
    const cards = page.locator("article[id^='juggling-']");
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card.locator("video")).toHaveAttribute("poster", /\/samples\/juggling-\d+\.jpg/);
      await expect(card.getByRole("link", { name: "Download" })).toHaveAttribute("href", /\/samples\/juggling-\d+\.mp4/);
    }
    const head = await page.request.head("/samples/juggling-43490.mp4");
    expect(head.status()).toBe(200);
    expect(Number(head.headers()["content-length"])).toBeLessThan(3_100_000);
  });

  test("TC-SMP-02 analysing a sample shows the AI count next to the hand count", async ({ page }) => {
    test.setTimeout(SAMPLE_TIMEOUT + 60_000);
    await page.goto("/samples");
    const card = page.locator("#juggling-43490");
    await card.getByTestId("analyse-juggling-43490").click();
    const count = card.getByTestId("touch-count");
    await expect(count).toBeVisible({ timeout: SAMPLE_TIMEOUT });
    const n = Number(await count.textContent());
    expect(n).toBeGreaterThanOrEqual(15); // hand count 19; regression band as in the worker tests
    expect(n).toBeLessThanOrEqual(21);
    await expect(card.getByText("hand count: 19")).toBeVisible();
    await expect(card.getByTestId("sample-result-source")).toBeVisible();
  });

  test("TC-SMP-03 the moving-camera sample is rejected by the quality check", async ({ page }) => {
    test.setTimeout(SAMPLE_TIMEOUT + 60_000);
    await page.goto("/samples");
    const card = page.locator("#juggling-43513");
    await card.getByTestId("analyse-juggling-43513").click();
    await expect(card.getByText("Please re-film")).toBeVisible({ timeout: SAMPLE_TIMEOUT });
    await expect(card.getByText(/camera moved/i)).toBeVisible();
  });
});

test.describe("Monthly challenge", () => {
  test("TC-EVT-01 leaderboard is public and sorted", async ({ page }) => {
    await page.goto("/events");
    const rows = page.getByTestId("leaderboard").locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const touches = (await rows.locator("td:last-child").allTextContents()).map(Number);
    expect(touches.length).toBeGreaterThanOrEqual(9);
    expect([...touches].sort((a, b) => b - a)).toEqual(touches);
    await expect(page.getByRole("link", { name: "Join the challenge" })).toBeVisible();
  });
});
