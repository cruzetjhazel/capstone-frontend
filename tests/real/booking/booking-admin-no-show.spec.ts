import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo, apiPost } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

const DECISION_NOTE = 'Confirmed after reviewing both sides.';

/**
 * Admin no-show review (real API). Each booking is used up by its test,
 * so run `php artisan e2e:seed-bookings --env=...` right before running this file.
 */
test.describe('Admin no-show review (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true.');
  test.skip(!e2e.admin.email, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.e2e.');
  test.setTimeout(180_000);

  test('BST-12 admin confirms a no-show; the booking becomes Not Completed and the client sees the decision', async ({ page }) => {
    test.skip(!e2e.bookingAdminUphold, 'Set E2E_BOOKING_ADMIN_UPHOLD.');
    const id = e2e.bookingAdminUphold;

    await loginViaUi(page, e2e.admin, '**/admin');
    await page.goto('/admin/bookings');
    // The admin page shows "BK-0191", not "191".
    const displayId = `BK-${id.padStart(4, '0')}`;

    await page.getByPlaceholder(/Search booking ID/).fill(id);

    // Target the row for THIS booking. Playwright waits until that row exists,
    // so we no longer depend on the 400 ms search debounce.
    const bookingRow = page.getByRole('row').filter({ hasText: displayId });
    await bookingRow.getByTitle('View Details').click();

    // Prove the modal belongs to the intended booking before checking anything else.
    await expect(page.getByRole('heading', { name: `Booking ${displayId}` })).toBeVisible();
    await expect(page.getByText('The client reports the photographer did not show up.')).toBeVisible();

    await page.getByPlaceholder('Admin notes (optional)').fill(DECISION_NOTE);
    await page.getByRole('button', { name: 'Confirm no-show' }).click();
    await expect(page.getByText('No-show confirmed. The booking is now marked as Not Completed.')).toBeVisible({ timeout: 20_000 });

    // The list reloads: THIS booking's row now reads "Not Completed" with the reason stated.
    await expect(bookingRow).toContainText('Not Completed', { timeout: 20_000 });
    await expect(bookingRow).toContainText('Photographer No Show');

    // The client sees the confirmed no-show and the admin's note.
    await switchTo(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${id}/details`);
    await expect(page.getByText('Not Completed — No Photographer Show (confirmed by admin)')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/upheld the report\. Note: Confirmed after reviewing both sides\./)).toBeVisible();
  });

  test('BST-10 admin changes the status of a disputed no-show report and adds a note', async ({ page, request }) => {
    test.skip(!e2e.bookingAdminDispute, 'Set E2E_BOOKING_ADMIN_DISPUTE.');
    const id = e2e.bookingAdminDispute;

    // Setup: the photographer disputes the client's report, which creates the "No-show dispute" report for the admin.
    const dispute = await apiPost(request, e2e.photographer, `/photographer/bookings/${id}/dispute-non-completion`, {
      reason: 'I was at the venue on time and waited for the client.',
    });
    expect(dispute.ok(), 'Dispute setup failed. Run e2e:seed-bookings again.').toBeTruthy();

    await loginViaUi(page, e2e.admin, '**/admin');
    await page.goto('/admin/reports');
    await page.getByPlaceholder(/Search by Report ID/).fill(id);

    // Target the dispute report for THIS booking: its reference column shows exactly the booking id.
    // (The search also matches report ids and partial references, so ".first()" could pick another report.)
    const disputeRow = page
      .getByRole('row')
      .filter({ has: page.getByText(id, { exact: true }) })
      .filter({ hasText: 'No-show dispute' });
    await disputeRow.getByRole('button', { name: 'Review' }).click({ timeout: 30_000 });

    const modal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /^Report / }) }).last();
    await expect(modal.getByText(`Disputed no-show — booking #${id}`)).toBeVisible();

    // Change the status.
    await modal.locator('select').selectOption('under_review');
    await modal.getByRole('button', { name: 'Update Status' }).click();
    await modal.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText(/status updated to Under Review/)).toBeVisible({ timeout: 20_000 });

    // Add an internal note.
    const note = `Checked both sides for booking ${id}.`;
    await modal.getByPlaceholder('Type a secure internal note...').fill(note);
    await modal.getByRole('button', { name: 'Add Note' }).click();
    await expect(page.getByText('Internal note added securely.')).toBeVisible({ timeout: 20_000 });
    await expect(modal.getByText(note)).toBeVisible();
  });
});