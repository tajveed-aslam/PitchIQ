import { expect, test } from "@playwright/test";
import { expectAccessible, isPhone } from "./helpers";

// One site, two editions: Africa (Lite, default) and Global (Main), chosen by the region switch.
test.describe("Region switch", () => {
  test("TC-REG-01 Africa (Lite) is the default", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("edition-badge")).toHaveText("Lite");
    await expect(page.getByTestId("main-hero")).toHaveCount(0);
  });

  test("TC-REG-02 Global shows the Main edition everywhere, is remembered, and switches back", async ({ page }, info) => {
    await page.goto("/");
    if (info.project.name !== "desktop-chrome") await page.getByTestId("menu").click(); // switch lives in the phone menu
    await page.getByTestId("region-switch").filter({ visible: true }).selectOption("global");
    await expect(page.getByTestId("main-hero")).toBeVisible();
    await expect(page.getByTestId("edition-badge")).toHaveCount(0);
    await page.goto("/samples");
    await expect(page.getByTestId("sample-juggling-43487")).toBeVisible(); // Main's samples page, remembered
    await expectAccessible(page);
    await page.goto("/");
    if (info.project.name !== "desktop-chrome") await page.getByTestId("menu").click();
    await page.getByTestId("region-switch").filter({ visible: true }).selectOption("africa");
    await expect(page.getByTestId("edition-badge")).toHaveText("Lite");
  });

  test("TC-REG-03 switching keeps you on a page both editions have", async ({ page, baseURL }, info) => {
    await page.context().addCookies([{ name: "pitchiq_region", value: "global", url: baseURL! }]);
    await page.goto("/support");
    if (isPhone(info.project.name)) await page.getByTestId("menu").click();
    await page.getByTestId("region-switch").filter({ visible: true }).selectOption("africa");
    await expect(page.getByTestId("edition-badge")).toHaveText("Lite");
    await expect(page).toHaveURL(/\/support$/);
  });
});
