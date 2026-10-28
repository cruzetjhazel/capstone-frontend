import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/api-fixtures';

test.describe('Role-based route permissions', () => {
  test('RBAC-001 client reaches client bookings', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page.getByRole('heading', { name: /my bookings|bookings/i })).toBeVisible();
  });

  test('RBAC-002 client cannot enter admin area', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('RBAC-003 approved studio reaches studio dashboard', async ({ page }) => {
    await loginAs(page, 'studio');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('RBAC-004 pending studio is routed to application status', async ({ page }) => {
    await loginAs(page, 'pendingStudio');
    await expect(page).toHaveURL('/photographer/status');
  });

  test('RBAC-005 studio cannot enter client-only route', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/payments');
    await expect(page).toHaveURL('/');
  });

  test('RBAC-006 admin reaches administration dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
