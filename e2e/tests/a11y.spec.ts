import { test } from "@playwright/test";
import { demoLogin, expectAccessible } from "./helpers";

// axe-core WCAG 2 A/AA rules; serious and critical violations fail the test.
for (const path of ["/", "/samples", "/login", "/signup", "/events", "/support"]) {
  test(`TC-A11Y ${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    await expectAccessible(page);
  });
}

test("TC-A11Y signed-in pages (demo): dashboard, reports, a report, upload", async ({ page }) => {
  await demoLogin(page);
  await expectAccessible(page);
  for (const path of ["/reports", "/upload"]) {
    await page.goto(path);
    await page.waitForLoadState("load");
    await expectAccessible(page);
  }
  await page.goto("/reports");
  await page.getByTestId("report-tile").first().click();
  await page.getByTestId("touch-count").waitFor();
  await expectAccessible(page);
});
