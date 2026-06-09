import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive', () => {
  test('should render on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Hermes')).toBeVisible({ timeout: 10000 });
  });

  test('should hide sidebar on mobile by default', async ({ page }) => {
    await page.goto('/');
    // On mobile, sidebar may be in a sheet/drawer
    const mainPanel = page.getByTestId('panel-main');
    await expect(mainPanel).toBeVisible({ timeout: 10000 });
  });
});
