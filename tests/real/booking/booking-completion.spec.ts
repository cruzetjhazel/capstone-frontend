import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import { openClientBooking, openStudioBooking } from '../../helpers/bookings';
import { modalWithHeading } from '../../helpers/ui';

/**
 * Normal completion after the session happened (real API).
 * Uses E2E_BOOKING_COMPLETE: a paid, Confirmed booking whose shoot ended 4 days ago and is still at the
 * "Event Day" stage. The test walks it forward the way the photographer would:
 *   Confirm Shoot Completed (Editing) -> move the tracker to Delivered -> Mark Service as Completed.
 * The booking is used up, so run `php artisan e2e:seed-bookings --env=...` again before re-running.
 * (BST-15 is a placeholder: rename it to match your test-case table.)
 */
test.describe('Booking completion after the session (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.skip(!e2e.bookingComplete, 'Set E2E_BOOKING_COMPLETE.');
  test.setTimeout(240_000);

  test('BST-15 photographer completes a finished session and the client can review it', async ({ page }) => {
    const id = e2e.bookingComplete;

    await test.step('photographer: the booking is active and not yet completable', async () => {
      await loginViaUi(page, e2e.photographer, '**/studio');
      await openStudioBooking(page, id);
      await expect(page.getByText('Booking Confirmed & Active')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Mark Service as Completed' })).toHaveCount(0); // not delivered yet
    });

    await test.step('photographer: confirms the shoot is done (moves to Editing)', async () => {
      const confirmShoot = page.getByRole('button', { name: 'Confirm Shoot Completed' });
      await expect(confirmShoot).toBeEnabled({ timeout: 30_000 }); // enabled because the whole session has ended
      await confirmShoot.click();
      await expect(page.getByText('Shoot confirmed').first()).toBeVisible({ timeout: 20_000 });
      await expect(confirmShoot).toHaveCount(0, { timeout: 30_000 });
    });

    await test.step('photographer: moves the tracker to Delivered', async () => {
      // The tracker dropdown offers the current stage and the next one (value "delivered").
      const tracker = page.locator('select').filter({ has: page.locator('option[value="delivered"]') });
      await expect(tracker).toBeVisible({ timeout: 30_000 });
      await tracker.selectOption('delivered');

      const modal = modalWithHeading(page, 'Update Service Stage?');
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Confirm Update' }).click();
      await expect(page.getByText('Service tracker updated').first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step('photographer: marks the service as completed', async () => {
      const complete = page.getByRole('button', { name: 'Mark Service as Completed' });
      await expect(complete).toBeEnabled({ timeout: 30_000 }); // the 48-hour window after the shoot has passed
      await complete.click();
      await expect(page.getByText('Booking completed').first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Booking Completed', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(complete).toHaveCount(0); // cannot be completed twice
    });

    await test.step('client: sees it as completed and can leave a review', async () => {
      await switchTo(page, e2e.client, '**/bookings');
      await openClientBooking(page, id);
      await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Review & Rate' })).toBeVisible();
    });
  });
});
