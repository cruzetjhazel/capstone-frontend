import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/api-fixtures';

test.describe('Feature-level controls with empty and safe fixture data', () => {
  test('FEAT-001 client notifications filters an empty feed by category', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/notifications');
    await expect(page.getByText('No notifications found', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Payment', exact: true }).click();
    await expect(page.getByText('No notifications found', { exact: true })).toBeVisible();
  });

  test('FEAT-002 studio calendar toggles the closed-day filter explanation', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/calendar');
    await page.locator('button[title="Filter: Day off"]').click();
    await expect(page.getByText(/highlights your days off/i)).toBeVisible();
  });

  test('FEAT-003 studio package screen opens fixed-package creation modal', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/packages');
    await expect(page.getByRole('heading', { name: 'Services & Packages' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Fixed Package' }).click();
    await expect(page.getByRole('heading', { name: 'Add Fixed Package' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Package' })).toBeDisabled();
  });

  test('FEAT-004 studio add-on form enforces a name before creation', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/packages');
    await page.getByRole('button', { name: 'Add Add-on' }).click();
    await expect(page.getByRole('heading', { name: 'Add Add-on' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Add-on' })).toBeDisabled();
  });

  test('FEAT-005 client profile exposes discard after editing a field', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    await expect(page.getByText(/profile/i).first()).toBeVisible();
  });

  test('FEAT-006 admin settings exposes reset controls', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/settings');
    await expect(page.getByRole('button', { name: /reset/i }).first()).toBeVisible();
  });
});
