import { test, expect } from "@playwright/test";

test.describe("Chat Flow", () => {
  test("should load the app and show chat interface", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Hermes")).toBeVisible({ timeout: 10000 });
  });

  test("should show composer input", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder(/type a message/i)).toBeVisible({ timeout: 10000 });
  });

  test("should have sidebar visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("panel-sidebar")).toBeVisible({ timeout: 10000 });
  });

  test("should have main panel visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("panel-main")).toBeVisible({ timeout: 10000 });
  });
});
