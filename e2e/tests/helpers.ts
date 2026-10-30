import { expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { API_URL } from "../playwright.config";

export const SAMPLE_VIDEO = path.resolve(__dirname, "../../frontend/public/samples/juggling-42524.mp4");

export function uniqueEmail(tag = "e2e"): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Creates an account through the API (fast) and logs the page in by storing the token before any page loads. */
export async function signedUp(page: Page, request: APIRequestContext, plan = "trial", name = "Test Player") {
  const email = uniqueEmail(plan);
  const res = await request.post(`${API_URL}/auth/signup`, { data: { name, email, password: "goodpass123", plan } });
  expect(res.status(), await res.text()).toBe(201);
  const { access_token } = await res.json();
  await page.addInitScript((t) => localStorage.setItem("pitchiq.token", t), access_token);
  return { email, token: access_token as string };
}

export async function demoLogin(page: Page) {
  await page.goto("/login");
  await page.getByTestId("demo-login").click();
  await expect(page.getByTestId("player-card")).toBeVisible({ timeout: 30_000 });
}

/** No serious or critical accessibility violations (WCAG 2 A/AA rules). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`)).toEqual([]);
}

export const isPhone = (projectName: string) => projectName !== "desktop-chrome";
