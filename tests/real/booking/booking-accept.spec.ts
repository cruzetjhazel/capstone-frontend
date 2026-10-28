import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo, apiPost } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import { acceptRequest, openClientBooking, openStudioBooking } from '../../helpers/bookings';
import { modalWithHeading } from '../../helpers/ui';

/**
 * Photographer accepts a booking (real API).
 * Uses E2E_BOOKING_ACCEPT: a Pending request far in the future. BST-01c changes it to Confirmed,
 * so run `php artisan e2e:seed-bookings --env=...` again before re-running this file.
 * (The BST-01 numbers are placeholders: rename them to match your test-case table.)
 */
test.describe('Photographer accepts a booking (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.skip(!e2e.bookingAccept, 'Set E2E_BOOKING_ACCEPT.');
  test.describe.configure({ mode: 'serial' }); // 01a and 01b must run before 01c accepts the booking
  test.setTimeout(120_000);

  const id = e2e.bookingAccept;

  test('BST-01a a client cannot accept a request, and it stays pending', async ({ page, request }) => {
    // The server refuses it, even if the screen is bypassed.
    const res = await apiPost(request, e2e.client, `/photographer/bookings/${id}/accept`, {});
    expect([403, 404], `client accept returned HTTP ${res.status()}`).toContain(res.status());

    await loginViaUi(page, e2e.client, '**/bookings');
    await openClientBooking(page, id);
    await expect(page.getByText('Waiting for Approval')).toBeVisible();
  });

  test('BST-01b cancelling the accept confirmation leaves the request pending', async ({ page }) => {
    await loginViaUi(page, e2e.photographer, '**/studio');
    await openStudioBooking(page, id);

    await page.getByRole('button', { name: 'Accept Request' }).click({ timeout: 30_000 });
    const modal = modalWithHeading(page, 'Accept Booking Request?');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Cancel' }).click();

    await expect(modal).toBeHidden();
    await expect(page.getByText('Pending Booking Request')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Request' })).toBeVisible();
  });

  test('BST-01c accepting confirms the booking and the client can go to pay', async ({ page }) => {
    await loginViaUi(page, e2e.photographer, '**/studio');
    await openStudioBooking(page, id);
    await acceptRequest(page);

    // The page refetches by itself (slow on local XAMPP), so allow time instead of reloading.
    await expect(page.getByText('Booking Confirmed & Active')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Confirmed, but the client hasn't paid their deposit yet.")).toBeVisible();
    await expect(page.getByText('Pending Booking Request')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Accept Request' })).toHaveCount(0); // cannot be accepted twice

    // The client now sees "Pay Now" and the pay form is open (before accepting, it showed "Payment Unavailable").
    await switchTo(page, e2e.client, '**/bookings');
    await openClientBooking(page, id);
    await expect(page.getByText('Waiting for Approval')).toHaveCount(0);
    const payNow = page.getByRole('link', { name: 'Pay Now' });
    await expect(payNow).toBeVisible({ timeout: 30_000 });
    await payNow.click();
    await expect(page).toHaveURL(new RegExp(`/booking/${id}/pay$`));
    await expect(page.locator('#payer')).toBeVisible({ timeout: 30_000 });
  });
});
