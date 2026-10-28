import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/api-fixtures';

test.describe('Business rules from frontend test-case document', () => {
  test.fixme('DOC-BOOK-001 rejects a booking with a past event date', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByText(/event date/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-002 rejects a fully blocked date', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByText(/unavailable|blocked/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-003 rejects a conflicting starting time', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByText(/available time|starting time/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-004 prevents duplicate overlapping booking requests', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByText(/booking/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-005 creates a pending request and temporary hold', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-photographer');
    await expect(page.getByText(/submit|request/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-006 photographer rejection requires and records a reason', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/bookings/fixture-booking');
    await expect(page.getByText(/reject/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-007 client cancellation requires a reason and records the decision', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/details');
    await expect(page.getByText(/cancel/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-008 blocks modification or rescheduling inside the seven-day restriction', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/details');
    await expect(page.getByText(/reschedul|modif/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-009 completed bookings become review eligible exactly once', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/reviews');
    await expect(page.getByText(/review/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-010 accepted bookings require payment before confirmation', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/details');
    await expect(page.getByText(/payment/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-011 half-payment and full-payment records use separate status transitions', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/booking/fixture-booking/pay');
    await expect(page.getByText(/50%|100%|payment/i).first()).toBeVisible();
  });

  test.fixme('DOC-BOOK-012 historical booking snapshots remain unchanged after package edits', async ({ page }) => {
    await loginAs(page, 'studio');
    await page.goto('/studio/packages');
    await expect(page.getByText(/package/i).first()).toBeVisible();
  });
});
