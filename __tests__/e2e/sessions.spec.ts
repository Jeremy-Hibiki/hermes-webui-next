import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test('should show new chat button in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/new chat/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show search input in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 10000 });
  });
});
