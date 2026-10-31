import { expect, test, type Browser, type Page } from "@playwright/test";
import { ANALYSIS_TIMEOUT, API_URL, BASE_URL } from "../playwright.config";
import { expectAccessible, isPhone, SAMPLE_VIDEO, signedUp, uniqueEmail } from "./helpers";

// The Global (Main) edition: its own pages and design at the same URLs, chosen by the region cookie.
async function global(page: Page) {
  await page.context().addCookies([{ name: "pitchiq_region", value: "global", url: BASE_URL }]);
}

async function demo(page: Page, kind: "player" | "coach" = "player") {
  await global(page);
  const res = await page.request.post(`${API_URL}/auth/${kind === "coach" ? "demo-coach" : "demo"}`);
  const { access_token } = await res.json();
  await page.addInitScript((t) => localStorage.setItem("pitchiq.token", t), access_token);
}

async function noSidewaysScroll(page: Page) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(w);
}

test.describe("Main edition: public pages", () => {
  test("TC-MAIN-01 landing: tracking hero, platform, coaches, six plans, accessible", async ({ page }) => {
    await global(page);
    await page.goto("/");
    await expect(page.getByTestId("main-hero")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Train with numbers");
    for (const plan of ["trial", "skill", "coach", "events", "team", "federation"]) await expect(page.getByTestId(`plan-${plan}`)).toBeVisible();
    await expect(page.getByTestId("try-demo-coach")).toBeVisible();
    await noSidewaysScroll(page);
    await expectAccessible(page);
  });

  test("TC-MAIN-02 sample analysis shows the report next to the hand count", async ({ page }) => {
    await global(page);
    await page.goto("/samples");
    await page.getByTestId("analyse-juggling-43487").click();
    const sample = page.getByTestId("sample-juggling-43487");
    await expect(sample.getByTestId("report-view")).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    await expect(sample.getByTestId("touches")).toHaveText(/\d+/);
    await expect(sample.getByText(/hand count 39/)).toBeVisible();
  });

  test("TC-MAIN-03 sign-up from Global creates a Main account and opens the card", async ({ page }) => {
    await global(page);
    await page.goto("/signup?plan=skill");
    await page.getByTestId("signup-name").fill("Global Tester");
    await page.getByTestId("signup-email").fill(uniqueEmail("main"));
    await page.getByTestId("signup-password").fill("goodpass123");
    await expect(page.getByTestId("signup-plan-skill")).toBeChecked();
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL(/\/card/);
    await expect(page.getByTestId("gold-card")).toBeVisible();
  });
});

test.describe("Main edition: player", () => {
  test("TC-MAIN-04 demo player's command centre: rating, training, coach tasks, reports", async ({ page }) => {
    await demo(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("overall")).toHaveText(/\d+/);
    await expect(page.getByTestId("week-panel")).toContainText("Goal");
    await expect(page.getByTestId("tasks-panel")).toContainText("Riverside U16");
    await expect(page.getByTestId("report-tile").first()).toBeVisible();
    await noSidewaysScroll(page);
    await expectAccessible(page);
  });

  test("TC-MAIN-05 the full card only rates what was measured", async ({ page }) => {
    await demo(page);
    await page.goto("/card");
    await expect(page.getByTestId("gold-card")).toBeVisible();
    const skills = page.getByTestId("skills-panel");
    await expect(skills.getByText("Dribbling")).toBeVisible();
    await expect(skills.getByText("not measured").first()).toBeVisible();
    await expect(page.getByTestId("mindset-panel")).toContainText("Motivation");
    await expectAccessible(page);
  });

  test("TC-MAIN-06 mindset, reaction and logic tests complete the card", async ({ page, request }) => {
    await global(page);
    await signedUp(page, request);
    await page.goto("/assess/mindset");
    // The radios are visually hidden inside big labels: click the label, as a person would.
    for (let i = 1; i <= 12; i++) await page.locator("label", { has: page.getByTestId(`q${i}-4`) }).click();
    await page.getByTestId("mindset-submit").click();
    await expect(page.getByTestId("mindset-result")).toContainText("Team spirit");

    await page.goto("/assess/reaction");
    const pad = page.getByTestId("reaction-pad");
    await page.waitForLoadState("networkidle");
    for (let round = 0; round < 5; round++) {
      // Start the round; retried in case the first tap lands before the page is interactive.
      await expect(async () => {
        if ((await pad.getAttribute("data-phase")) !== "wait") await pad.click();
        await expect(pad).toHaveAttribute("data-phase", "wait", { timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await expect(pad).toHaveAttribute("data-phase", "go", { timeout: 10_000 });
      await page.waitForTimeout(250); // a human-speed tap: the server refuses anything under 100 ms
      await pad.click();
      if (round < 4) await expect(pad).toHaveAttribute("data-phase", /wait|go/);
    }
    await expect(page.getByTestId("reaction-result")).toContainText("ms");

    await page.goto("/assess/logic");
    for (let q = 0; q < 8; q++) await page.getByTestId("option-0").click();
    await expect(page.getByTestId("logic-result")).toContainText("/8");

    await page.goto("/card");
    await expect(page.getByText(/ms median/)).toBeVisible();
    await expect(page.getByText(/puzzles/)).toBeVisible();
  });

  test("TC-MAIN-07 compare two sessions from the reports page", async ({ page }) => {
    await demo(page);
    await page.goto("/reports");
    await page.getByTestId("pick-compare").click();
    const tiles = page.getByTestId("pick-tile");
    await tiles.nth(0).click();
    await tiles.nth(3).click();
    await page.getByTestId("go-compare").click();
    await expect(page.getByTestId("comparison")).toBeVisible();
    await expect(page.getByTestId("verdict")).toContainText(/touches|Same count/);
    await page.getByRole("button", { name: "Show as table" }).click();
    await expect(page.getByRole("columnheader", { name: "A (s)" })).toBeVisible();
    await expectAccessible(page);
  });

  test("TC-MAIN-08 progress analytics are locked on the trial and open on paid plans", async ({ page, request }) => {
    await global(page);
    await signedUp(page, request, "trial");
    await page.goto("/progress");
    await expect(page.getByTestId("progress-locked")).toBeVisible();
    await page.goto("/training");
    await expect(page.getByTestId("training-locked")).toBeVisible();
  });

  test("TC-MAIN-09 demo player's progress shows the trend and personal bests", async ({ page }) => {
    await demo(page);
    await page.goto("/progress");
    await expect(page.getByTestId("progress-chart")).toBeVisible();
    await expect(page.getByTestId("progress-best")).toContainText("29");
    await expectAccessible(page);
  });

  test("TC-MAIN-10 upload, report, then a training week built from it", async ({ page, request }, info) => {
    test.skip(isPhone(info.project.name), "one real analysis per run is enough: desktop only");
    await global(page);
    await signedUp(page, request, "coach");
    await page.goto("/upload");
    await page.getByTestId("data-saver").uncheck().catch(() => undefined);
    await page.getByTestId("file-input").setInputFiles(SAMPLE_VIDEO);
    await page.getByTestId("upload-submit").click();
    await expect(page).toHaveURL(/\/reports\/\d+/);
    await expect(page.getByTestId("report-view")).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    await expect(page.getByTestId("coaching")).toBeVisible();

    await page.goto("/training");
    await page.getByTestId("build-plan").click();
    await expect(page.getByTestId("plan-days").locator(":scope > li")).toHaveCount(7, { timeout: 60_000 });
    await page.getByTestId("session-d1s0").click();
    await expect(page.getByTestId("plan-progress")).toHaveText(/^1\//);
  });

  test("TC-MAIN-11 challenges and badges", async ({ page }) => {
    await demo(page);
    await page.goto("/challenges");
    await expect(page.getByTestId("challenge")).toBeVisible();
    await expect(page.getByTestId("badge-first_analysis")).toHaveAttribute("data-earned", "true");
    await expect(page.getByTestId("badge-club_40")).toHaveAttribute("data-earned", "false");
    await expectAccessible(page);
  });

  test("TC-MAIN-12 settings: plan switch unlocks rooms; notification choices are saved", async ({ page, request }) => {
    await global(page);
    await signedUp(page, request, "trial");
    await page.goto("/settings");
    await page.getByTestId("pref-badges").click();
    await expect(page.getByTestId("pref-badges")).toHaveAttribute("aria-checked", "false");
    await page.getByTestId("choose-team").click();
    await expect(page.getByTestId("settings-plan-team")).toContainText("Current");
    await page.reload();
    await expect(page.getByTestId("pref-badges")).toHaveAttribute("aria-checked", "false");
    await page.goto("/rooms");
    await expect(page.getByTestId("create-room")).toBeVisible();
  });

  test("TC-MAIN-13 the assistant answers Global questions from the FAQ", async ({ page }) => {
    await demo(page);
    await page.goto("/dashboard");
    await page.getByTestId("chat-open").click();
    await page.getByTestId("chat-input").fill("How do I join my coach's room?");
    await page.getByTestId("chat-input").press("Enter");
    await expect(page.getByTestId("chat-reply")).toContainText(/code/i, { timeout: 30_000 });
  });

  test("TC-MAIN-14 phone navigation: tabs and the More sheet reach every section", async ({ page }, info) => {
    test.skip(!isPhone(info.project.name), "phone layout");
    await demo(page);
    await page.goto("/dashboard");
    await page.getByTestId("more").click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Rooms" }).click();
    await expect(page).toHaveURL(/\/rooms$/);
    for (const path of ["/card", "/progress", "/training", "/rooms", "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await noSidewaysScroll(page);
    }
  });

  test("TC-MAIN-15 Lite-only addresses lead to their Global pages", async ({ page }) => {
    await demo(page);
    await page.goto("/events");
    await expect(page).toHaveURL(/\/challenges$/);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/settings$/);
  });
});

test.describe("Main edition: coach rooms", () => {
  async function account(browser: Browser, plan: string, name: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await global(page);
    await signedUp(page, page.request, plan, name);
    return page;
  }

  test("TC-MAIN-16 coach creates a room, a player joins with the code and gets the task", async ({ browser }) => {
    const coach = await account(browser, "team", "Coach Taylor");
    await coach.goto("/rooms");
    await coach.getByTestId("room-name").fill("E2E Squad");
    await coach.getByTestId("create-submit").click();
    await expect(coach).toHaveURL(/\/rooms\/\d+/);
    await coach.getByTestId("tab-settings").click();
    const code = (await coach.getByTestId("join-code").textContent())!.trim();

    const player = await account(browser, "trial", "Jamie Player");
    await player.goto("/rooms");
    await player.getByTestId("join-code").fill("NOPE99");
    await player.getByTestId("join-submit").click();
    await expect(player.getByText("No room has that code")).toBeVisible();
    await player.getByTestId("join-code").fill(code.toLowerCase());
    await player.getByTestId("join-submit").click();
    await expect(player).toHaveURL(/\/rooms\/\d+/);

    await coach.reload();
    await coach.getByTestId("tab-tasks").click();
    await coach.getByTestId("task-title").fill("Ten clean touches");
    await coach.getByTestId("task-submit").click();
    await expect(coach.getByTestId("coach-task")).toContainText("0/1 handed in");
    await coach.getByTestId("tab-players").click();
    await expect(coach.getByTestId("players-table")).toContainText("Jamie Player");

    await player.goto("/dashboard");
    await expect(player.getByTestId("tasks-panel")).toContainText("Ten clean touches");
    await player.getByTestId("bell").click();
    await expect(player.getByTestId("notifications")).toContainText("New task from Coach Taylor");
    await expectAccessible(player);
  });

  test("TC-MAIN-17 demo coach: team dashboard insights, player drawer, scoring a hand-in", async ({ page }) => {
    await demo(page, "coach");
    await page.goto("/rooms");
    await page.getByTestId("room-list").getByText("Riverside U16").click();
    await expect(page.getByTestId("team-dashboard")).toBeVisible();
    await expect(page.getByTestId("alerts")).toBeVisible();
    await expectAccessible(page);
    await page.getByTestId("tab-players").click();
    await page.getByTestId("player-row").first().click();
    await expect(page.getByTestId("player-drawer").getByTestId("gold-card")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("tab-tasks").click();
    const sub = page.getByTestId("submission").first();
    await sub.getByRole("textbox").fill("Nice work, keep the ball lower");
    await sub.getByTestId("review-save").click();
    await expect(sub).toContainText("/100");
  });
});
