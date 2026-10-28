import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import { acceptRequest, openClientBooking, openStudioBooking, verifySubmittedPayment } from '../../helpers/bookings';
import { rejectPaymentsWithReference, submitReferenceViaUi, uniqueReference } from '../../helpers/payments';

/**
 * One booking, start to finish, switching between the two accounts:
 * request -> photographer accepts -> client submits a GCash reference -> photographer verifies it.
 * Uses E2E_BOOKING_LIFECYCLE (a seeded Pending request). The booking is used up, so run
 * `php artisan e2e:seed-bookings --env=...` again before re-running.
 * It starts from a seeded request on purpose: creating the request through the form is covered
 * by BKG-11 / BKG-15 and needs an open date on the live calendar.
 */
const REF = uniqueReference();

test.describe('Booking lifecycle: accept, pay, verify (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.skip(!e2e.bookingLifecycle, 'Set E2E_BOOKING_LIFECYCLE.');
  test.setTimeout(240_000);

  // If the test stops half-way, a pending payment would block the next run. A verified payment just answers 422, which is fine.
  test.afterAll(async ({ request }) => {
    await rejectPaymentsWithReference(request, REF);
  });

  test('LIFE-01 a request goes from Pending to a verified payment', async ({ page }) => {
    const id = e2e.bookingLifecycle;

    await test.step('client: the request is waiting for approval', async () => {
      await loginViaUi(page, e2e.client, '**/bookings');
      await openClientBooking(page, id);
      await expect(page.getByText('Waiting for Approval')).toBeVisible();
    });

    await test.step('photographer: accepts the request', async () => {
    await switchTo(page, e2e.photographer, '**/studio');
    await openStudioBooking(page, id);

    // The lifecycle test requires a Pending booking, not a Waitlisted one.
    await expect(
      page.getByText('Waitlisted — another paid booking holds this schedule.')
    ).toHaveCount(0);

    await acceptRequest(page);
    await expect(
      page.getByText("Confirmed, but the client hasn't paid their deposit yet.")
    ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('client: pays by GCash reference and the payment goes under review', async () => {
      await switchTo(page, e2e.client, '**/bookings');
      await openClientBooking(page, id);
      await expect(page.getByRole('link', { name: 'Pay Now' })).toBeVisible({ timeout: 30_000 });

      await submitReferenceViaUi(page, id, REF);
      await expect(page).toHaveURL(new RegExp(`/booking/${id}/details`));
      await expect(page.getByText('Payment Under Review')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('link', { name: 'Pay Now' })).toHaveCount(0);
    });

    await test.step('photographer: reviews and verifies the payment', async () => {
      await switchTo(page, e2e.photographer, '**/studio');
      await openStudioBooking(page, id);
      await expect(page.getByText(/Client submitted a GCash reference/)).toBeVisible({ timeout: 30_000 });
      await verifySubmittedPayment(page, REF);
      // The review banner goes away once the payment is verified.
      await expect(page.getByText(/Client submitted a GCash reference/)).toHaveCount(0, { timeout: 30_000 });
    });

    await test.step('client: sees the payment as verified, with a receipt', async () => {
      await switchTo(page, e2e.client, '**/bookings');
      await openClientBooking(page, id);
      await expect(page.getByText('Payment Verified')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('link', { name: 'View Receipt' })).toBeVisible();
      await expect(page.getByText('Payment Under Review')).toHaveCount(0);
    });
  });
});
