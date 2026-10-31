import { expect, test } from "@playwright/test";
import { ANALYSIS_TIMEOUT } from "../playwright.config";
import { demoLogin, signedUp, uniqueEmail } from "./helpers";

test.describe("Accounts", () => {
  test("TC-AUTH-01 sign up through the form, fill the profile, see it on the player card", async ({ page }) => {
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("Ama Mensah");
    await page.getByTestId("signup-email").fill(uniqueEmail("signup"));
    await page.getByTestId("signup-password").fill("goodpass123");
    await page.getByTestId("signup-submit").click();
    await expect(page).toHaveURL(/\/profile\?welcome=1/);
    await page.getByTestId("profile-age").fill("15");
    await page.getByTestId("profile-position").selectOption("Forward");
    await page.getByTestId("profile-save").click();
    await expect(page.getByTestId("profile-save")).toHaveText(/Saved/);
    await page.goto("/dashboard");
    const card = page.getByTestId("player-card");
    await expect(card).toContainText("Ama Mensah");
    await expect(card).toContainText("FOR");
    await expect(card).toContainText("15 yrs");
    await expect(page.getByTestId("allowance")).toContainText("3 of 3 analyses left in your trial");
  });

  test("TC-AUTH-02 wrong password shows an error and stays on the login page", async ({ page, request }, info) => {
    const { email } = await signedUp(page, request);
    await page.evaluate(() => localStorage.clear()).catch(() => {});
    await page.context().clearCookies();
    const fresh = await page.context().browser()!.newPage({ ...info.project.use });
    await fresh.goto("/login");
    await fresh.getByTestId("login-email").fill(email);
    await fresh.getByTestId("login-password").fill("wrongpass99");
    await fresh.getByTestId("login-submit").click();
    await expect(fresh.getByTestId("form-error")).toHaveText("Wrong email or password.");
    await expect(fresh).toHaveURL(/\/login/);
    await fresh.getByTestId("login-password").fill("goodpass123");
    await fresh.getByTestId("login-submit").click();
    await expect(fresh).toHaveURL(/\/dashboard/);
    await fresh.close();
  });

  test("TC-AUTH-03 pages behind login send visitors to log in and back", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login\?next=%2Freports/);
  });

  test("TC-AUTH-04 demo player: seeded history, read-only profile", async ({ page }) => {
    await demoLogin(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Hi, Demo/);
    await expect(page.getByText("You're exploring the shared demo player")).toBeVisible();
    await expect(page.getByTestId("report-tile").first()).toBeVisible();
    await page.goto("/profile");
    await expect(page.getByText("shared demo profile")).toBeVisible();
    await expect(page.getByTestId("profile-save")).toHaveCount(0);
  });

  test("TC-AUTH-05 a demo report has coaching with drills from the library", async ({ page }) => {
    await demoLogin(page);
    await page.goto("/reports");
    await page.getByTestId("report-tile").filter({ hasText: "Best one yet" }).click();
    await expect(page.getByTestId("touch-count")).toHaveText("29");
    const coaching = page.getByTestId("coaching");
    await expect(coaching).toBeVisible();
    await expect(coaching.locator("article")).toHaveCount(3);
  });
});

test.describe("Upload and analysis", () => {
  test("TC-UPL-01 upload a real video: live stages, then report and coaching; allowance goes down", async ({ page, request }) => {
    test.setTimeout(ANALYSIS_TIMEOUT + 90_000);
    await signedUp(page, request, "trial");
    await page.goto("/upload");
    await page.getByTestId("file-input").setInputFiles(require("./helpers").SAMPLE_VIDEO);
    await expect(page.getByTestId("chosen-file")).toContainText("juggling-42524.mp4");
    await page.getByTestId("upload-title").fill("Street session E2E");
    await page.getByTestId("upload-submit").click();
    await expect(page).toHaveURL(/\/reports\/\d+$/, { timeout: 120_000 });
    const count = page.getByTestId("touch-count");
    await expect(count).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    const n = Number(await count.textContent());
    expect(n).toBeGreaterThanOrEqual(12); // hand count 16
    expect(n).toBeLessThanOrEqual(18);
    await expect(page.getByTestId("coaching")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByTestId("allowance")).toContainText("2 of 3 analyses left");
  });

  test("TC-UPL-02 a non-video file is refused before upload", async ({ page, request }) => {
    await signedUp(page, request);
    await page.goto("/upload");
    await page.getByTestId("file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByTestId("form-error")).toContainText("isn't a video");
    await expect(page.getByTestId("upload-submit")).toBeDisabled();
  });
});

test.describe("Plans and gating (test mode)", () => {
  test("TC-PLN-01 trial: progress locked; switching to Skill Analysis unlocks it", async ({ page, request }) => {
    await signedUp(page, request, "trial");
    await page.goto("/dashboard");
    await expect(page.getByText(/Progress tracking comes with/)).toBeVisible();
    await page.goto("/profile#plan");
    await page.getByTestId("plan-skill").getByRole("button", { name: "Switch" }).click();
    await expect(page.getByTestId("plan-skill")).toContainText("Current plan");
    await page.goto("/dashboard");
    await expect(page.getByText(/Progress tracking comes with/)).toHaveCount(0);
    await expect(page.getByTestId("allowance")).toContainText("20 of 20 analyses left this month");
  });

  test("TC-PLN-02 challenge entry needs the Events plan", async ({ page, request }) => {
    await signedUp(page, request, "trial");
    await page.goto("/events");
    await expect(page.getByText("Your plan doesn't include challenges.")).toBeVisible();
    await page.goto("/profile#plan");
    await page.getByTestId("plan-events").getByRole("button", { name: "Switch" }).click();
    await expect(page.getByTestId("plan-events")).toContainText("Current plan");
    await page.goto("/events");
    await expect(page.getByText("You're in.")).toBeVisible();
  });
});

test.describe("Support", () => {
  test("TC-SUP-01 FAQ, help chat answers a filming question, contact form sends", async ({ page }) => {
    await page.goto("/support");
    await expect(page.getByTestId("faq").locator("details")).toHaveCount(10);
    await page.getByTestId("chat-input").fill("Why was my video rejected?");
    await page.getByTestId("chat-input").press("Enter");
    await expect(page.getByTestId("chat-reply").nth(1)).toContainText(/camera/i, { timeout: 40_000 });
    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill(uniqueEmail("contact"));
    await page.getByLabel("Message").fill("Testing the contact form end to end.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-sent")).toContainText("Thanks!");
  });
});
