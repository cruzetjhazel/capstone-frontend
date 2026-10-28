import { test, expect } from '@playwright/test';
import { installApiFixtures } from '../fixtures/api-fixtures';

test.describe('Public discovery and informational pages', () => {
  test.beforeEach(async ({ page }) => installApiFixtures(page));

  test('PUB-001 home exposes discovery actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Studios' })).toBeVisible();
  });

  test('PUB-002 explore supports URL-backed search and filters', async ({ page }) => {
    await page.goto('/explore?service=Wedding');
    await expect(page).toHaveURL(/service=Wedding/);
    await expect(page.locator('h1').filter({ hasText: 'Explore photographers' })).toBeVisible();
  });

  test('PUB-003 photographers directory renders without API data', async ({ page }) => {
    await page.goto('/photographers');
    await expect(page.getByText('Photographers', { exact: true })).toBeVisible();
  });

  test('PUB-004 about and terms pages are reachable', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1').filter({ hasText: 'About Kislap' })).toBeVisible();
    await page.goto('/terms');
    await expect(page.locator('h1').filter({ hasText: 'Terms & Conditions' })).toBeVisible();
  });

  test('PUB-005 unknown route shows not found state', async ({ page }) => {
    await page.goto('/route-that-does-not-exist');
    await expect(page.locator('body')).toContainText(/page not found|not found/i);
  });
});
