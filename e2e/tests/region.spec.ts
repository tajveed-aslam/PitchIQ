import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

// One site, two editions: Africa (Lite, default) and Global (Main, coming soon), chosen by the region switch.
test.describe("Region switch", () => {
  test("TC-REG-01 Africa (Lite) is the default", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("edition-badge")).toHaveText("Lite");
    await expect(page.getByTestId("main-coming-soon")).toHaveCount(0);
  });

  test("TC-REG-02 Global shows the coming-soon page everywhere, is remembered, and switches back", async ({ page }, info) => {
    await page.goto("/");
    if (info.project.name !== "desktop-chrome") await page.getByTestId("menu").click(); // switch lives in the phone menu
    await page.getByTestId("region-switch").filter({ visible: true }).selectOption("global");
    await expect(page.getByTestId("main-coming-soon")).toBeVisible();
    await expect(page.getByTestId("edition-badge")).toHaveCount(0);
    for (const path of ["/samples", "/dashboard", "/upload"]) {
      await page.goto(path);
      await expect(page.getByTestId("main-coming-soon")).toBeVisible(); // remembered across pages
    }
    await expectAccessible(page);
    await page.getByTestId("switch-to-africa").click();
    await expect(page.getByTestId("edition-badge")).toHaveText("Lite");
  });
});
