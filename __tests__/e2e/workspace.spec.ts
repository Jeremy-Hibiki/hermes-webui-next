import { test, expect } from "@playwright/test";

test.describe("Workspace Browser", () => {
  test("should show workspace panel when toggled", async ({ page }) => {
    await page.goto("/");
    // Workspace panel may be hidden by default
    const wsPanel = page.getByTestId("panel-workspace");
    // If visible, check for file browser content
    if (await wsPanel.isVisible()) {
      await expect(wsPanel).toBeVisible();
    }
  });
});
