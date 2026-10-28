import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/api-fixtures';

test.describe('Photography booking workflows requiring isolated backend state', () => {
  test.fixme('FLOW-001 client submits a booking request with package and session details', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByRole('heading', { name: /booking/i })).toBeVisible();
  });

  test.fixme('FLOW-002 client validates and submits a custom budget request', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/details');
    await expect(page.getByText(/budget|offer/i).first()).toBeVisible();
  });

  test.fixme('FLOW-003 photographer responds to a budget offer and client sees the status transition', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/bookings/fixture-booking');
    await expect(page.getByText(/offer|budget/i).first()).toBeVisible();
  });

  test.fixme('FLOW-004 client submits an external payment reference and proof when required', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/pay');
    await expect(page.getByText(/payment/i).first()).toBeVisible();
  });

  test.fixme('FLOW-005 photographer verifies or rejects a recorded payment reference', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/bookings/fixture-booking');
    await expect(page.getByText(/payment/i).first()).toBeVisible();
  });

  test.fixme('FLOW-006 unauthorized client cannot verify a payment record', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/pay');
    await expect(page.getByRole('button', { name: /verify/i })).toHaveCount(0);
  });

  test.fixme('FLOW-007 photographer creates and publishes a package and custom-package components', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/packages');
    await expect(page.getByRole('heading', { name: /packages/i })).toBeVisible();
  });

  test.fixme('FLOW-008 photographer manages availability windows, blocked dates, and booking hours', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/calendar');
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible();
  });

  test.fixme('FLOW-009 client reads and marks notifications as read', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
  });

  test.fixme('FLOW-010 client updates profile and settings with validation', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});
