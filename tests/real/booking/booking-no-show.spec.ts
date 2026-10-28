import { test, expect } from '@playwright/test';
import { loginViaUi, switchTo, apiPost } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

const STATEMENT = 'The photographer never arrived and did not answer calls.';
const NOT_STARTED = "This booking's scheduled time has not started yet.";
const TOO_SOON =
  'This event starts too soon to collect a reservation payment, so it cannot be accepted. Please decline the request.';



/**
 * No-show and too-soon checks (real API).
 * The two NOSHOW bookings are used up by their tests, and the TOO_SOON request starts 2 hours after seeding,
 * so run `php artisan e2e:seed-bookings --env=...` right before running this file.
 */
test.describe('No-show reports and too-soon accept (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.setTimeout(120_000);

  test('BST-09 client reports a photographer no-show; the booking stays Confirmed and the photographer can dispute', async ({ page }) => {
    test.skip(!e2e.bookingNoShowByClient, 'Set E2E_BOOKING_NOSHOW_BY_CLIENT.');
    test.setTimeout(180_000);
    const id = e2e.bookingNoShowByClient;

    await loginViaUi(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${id}/details`);
    await expect(page.getByRole('heading', { name: `Booking #${id}` })).toBeVisible({ timeout: 30_000 });

    const reportButton = page.getByRole('button', { name: 'Report photographer no-show' });
    await expect(reportButton, 'Booking already reported. Run e2e:seed-bookings again.').toBeVisible({ timeout: 10_000 });
    await reportButton.click();
    const modal = page
      .locator('div.fixed')
      .filter({ has: page.getByRole('heading', { name: 'Report photographer no-show' }) })
      .last();
    await expect(modal.getByText(/has 16 hours to dispute the report/)).toBeVisible();

    // A statement under 20 characters is refused.
    const statement = modal.getByPlaceholder(/What happened\?/);
    await statement.fill('too short');
    await modal.getByRole('checkbox').check();
    await expect(modal.getByText('At least 20 characters required.')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Submit report' })).toBeDisabled();

    await statement.fill(STATEMENT);
    await modal.getByRole('button', { name: 'Submit report' }).click();

    await expect(page.getByText('Report submitted').first()).toBeVisible({ timeout: 20_000 });
    // Reload once, then give the slow local API time to answer.
    await page.reload();
    await expect(page.getByText('Photographer No-Show Reported — Under Admin Review').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Booking Cancelled')).toHaveCount(0); // the booking is not cancelled

    // The photographer sees the report and can dispute it.
    await switchTo(page, e2e.photographer, '**/studio');
    await page.goto(`/studio/bookings/${id}`);
    await expect(page.getByText('The client reported that you did not attend — under admin review')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/You can dispute this until/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dispute this report' })).toBeVisible();
  });

  test('BST-09 a photographer no-show cannot be reported before the start time', async ({ page, request }) => {
    test.skip(!e2e.bookingNotStarted, 'Set E2E_BOOKING_NOT_STARTED.');
    const id = e2e.bookingNotStarted;

    await loginViaUi(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${id}/details`);
    await expect(page.getByRole('heading', { name: `Booking #${id}` })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Report photographer no-show' })).toBeDisabled();
    await expect(page.getByText(/Available after the scheduled start time/)).toBeVisible();

    // The server refuses it too, even if the screen is bypassed.
    const res = await apiPost(request, e2e.client, `/client/bookings/${id}/report-non-completion`, {
      reason: 'photographer_no_show', notes: STATEMENT,
    });
    expect(res.status()).toBe(422);
    expect(JSON.stringify(await res.json())).toContain(NOT_STARTED);
  });

  test('BST-11 photographer reports a client no-show; the client can dispute it', async ({ page }) => {
    test.skip(!e2e.bookingNoShowByPhotographer, 'Set E2E_BOOKING_NOSHOW_BY_PHOTOGRAPHER.');
    const id = e2e.bookingNoShowByPhotographer;

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto(`/studio/bookings/${id}`);
    const reportButton = page.getByRole('button', { name: 'Report client no-show' });
    await expect(reportButton, 'Booking already reported. Run e2e:seed-bookings again.').toBeVisible({ timeout: 30_000 });
    await reportButton.click();

    await expect(page.getByText('No-show reported').first()).toBeVisible({ timeout: 20_000 });
    // No reload: the page refetches the booking by itself after the report succeeds.
    // The toast shows when the API answers; the banner shows when the refetch finishes (slow on local XAMPP).
    await expect(page.getByText('You reported a client no-show — under admin review')).toBeVisible({ timeout: 30_000 });
    // The report button disappears once the report exists, so it cannot be submitted twice.
    await expect(page.getByRole('button', { name: 'Report client no-show' })).toHaveCount(0);

    await switchTo(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${id}/details`);
    await expect(page.getByText('Client No-Show Reported — Under Admin Review').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/You can dispute this until/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dispute this report' })).toBeVisible();
  });

  test('BST-11 a client no-show cannot be reported before the start time', async ({ page, request }) => {
    test.skip(!e2e.bookingNotStarted, 'Set E2E_BOOKING_NOT_STARTED.');
    const id = e2e.bookingNotStarted;

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto(`/studio/bookings/${id}`);
    await expect(page.getByText(/confirmed/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Report client no-show' })).toHaveCount(0);

    const res = await apiPost(request, e2e.photographer, `/photographer/bookings/${id}/report-non-completion`, {
      reason: 'client_no_show',
    });
    expect(res.status()).toBe(422);
    expect(JSON.stringify(await res.json())).toContain(NOT_STARTED);
  });

  test('BST-14 a request that starts too soon cannot be accepted', async ({ page }) => {
    test.skip(!e2e.bookingTooSoon, 'Set E2E_BOOKING_TOO_SOON.');
    const id = e2e.bookingTooSoon;

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto(`/studio/bookings/${id}`);
    await page.getByRole('button', { name: 'Accept Request' }).click({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Yes, Accept Request' }).click();

    await expect(page.getByText(TOO_SOON).first()).toBeVisible({ timeout: 20_000 });

    // Nothing changed: it is still a pending request.
    await page.reload();
    await expect(page.getByText('Pending Booking Request')).toBeVisible({ timeout: 30_000 });
  });
});