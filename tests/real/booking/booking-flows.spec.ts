import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

/**
 * Booking flows in the browser. Need: E2E_REAL_API=true and the seeded bookings.
 * BST-02 uses E2E_BOOKING_PENDING and BKG-21 uses E2E_BOOKING_B. Both change the booking,
 * so run `php artisan e2e:seed-bookings --env=...` again before re-running.
 */
test.describe('Booking flows (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.setTimeout(120_000);

  test('BST-02 photographer must give a reason to decline, then the client sees it', async ({ page }) => {
    test.skip(!e2e.bookingPending, 'Set E2E_BOOKING_PENDING.');
    const reason = `Playwright decline ${Date.now()}`;

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto(`/studio/bookings/${e2e.bookingPending}`);
    await page.getByRole('button', { name: 'Decline Request' }).click();

    // No reason yet: the form refuses and stays open.
    await page.getByRole('button', { name: 'Confirm Decline' }).click();
    await expect(page.getByText('Reason required').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Decline Booking Request' })).toBeVisible();

    await page.getByPlaceholder(/Schedule fully booked/).fill(reason);
    await page.getByRole('button', { name: 'Confirm Decline' }).click();
    await expect(page.getByText('Booking request declined').first()).toBeVisible({ timeout: 20_000 });

    // The client sees the decline and the reason.
    await switchTo(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${e2e.bookingPending}/details`);
    await expect(page.getByText('Booking Request Declined')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(reason)).toBeVisible();
  });

  test('BKG-20 client cancels an unpaid booking and it is cancelled right away', async ({ page }) => {
    test.skip(!e2e.bookingB, 'Set E2E_BOOKING_B.');
    await loginViaUi(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${e2e.bookingB}/details`);
    await expect(page.getByRole('heading', { name: `Booking #${e2e.bookingB}` })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Cancel Booking' }).click();
    await page.getByPlaceholder('Please explain your request in detail...').fill('Playwright cancellation');
    // The modal's submit button has the same name as the page button, so scope it to the form.
    await page.locator('form').getByRole('button', { name: 'Cancel Booking' }).click();

    await expect(page.getByRole('heading', { name: 'Confirm Request' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm Submit' }).click();

    await expect(page.getByText('Your booking has been cancelled and the photographer was notified.').first())
      .toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Booking Cancelled').first()).toBeVisible();
  });

  test('BST-13 another client cannot open this booking', async ({ page }) => {
    test.skip(!e2e.otherClient.email, 'Set E2E_OTHER_CLIENT_EMAIL / E2E_OTHER_CLIENT_PASSWORD.');
    test.skip(!e2e.bookingA, 'Set E2E_BOOKING_A.');
    await loginViaUi(page, e2e.otherClient, '**/bookings');
    await page.goto(`/booking/${e2e.bookingA}/details`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: `Booking #${e2e.bookingA}` })).toHaveCount(0);
  });
});