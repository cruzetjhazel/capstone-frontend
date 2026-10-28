import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

test.describe('Real seeded Laravel read-only workflows', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.setTimeout(90_000);

  const loginSeededClient = (page: Page) => loginViaUi(page, e2e.client, '**/bookings');

  test('REAL-001 authenticates the seeded client', async ({ page }) => {
    await loginSeededClient(page);
    await expect(page).toHaveURL(/\/bookings$/);
    await expect(page.getByText(/my bookings|bookings/i).first()).toBeVisible();
  });

  test('REAL-002 loads seeded client bookings', async ({ page }) => {
    await loginSeededClient(page);
    await expect(page.getByText(/failed to load bookings/i)).toHaveCount(0);
    await expect(
      page.getByText(/pending|accepted|confirmed|completed|cancelled|declined|expired|no bookings/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('REAL-003 loads seeded favorites', async ({ page }) => {
    await loginSeededClient(page);
    await page.goto('/favorites');
    await expect(page).toHaveURL('/favorites');
    await expect(page.getByRole('heading', { name: /favorites/i })).toBeVisible();
  });

  test('REAL-004 loads seeded payment records without gateway activity', async ({ page }) => {
    await loginSeededClient(page);
    await page.goto('/payments');
    await expect(page).toHaveURL('/payments');
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/xendit/i);
  });

  test('REAL-005 loads the seeded notification feed', async ({ page }) => {
    await loginSeededClient(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/failed to load/i);
  });

  test('REAL-006 loads and displays the seeded client profile', async ({ page }) => {
    await loginSeededClient(page);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('body')).not.toContainText(/unable to load your profile/i);
  });

  test('REAL-007 loads seeded public photographers', async ({ page }) => {
    await page.goto('/photographers');
    await expect(page.getByRole('heading', { name: /photographers/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/failed to load photographers/i);
  });

  test('REAL-008 explores seeded photographer data without mutating records', async ({ page }) => {
    await page.goto('/explore?service=Wedding');
    await expect(page).toHaveURL(/service=Wedding/);
    await expect(page.locator('body')).not.toContainText(/something went wrong|failed to load/i);
  });
});
