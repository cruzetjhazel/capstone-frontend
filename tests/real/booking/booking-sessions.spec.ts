import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

const TIME_BUTTON = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;
const TAKEN_TITLE = 'Already used by another schedule in this booking';

/** Opens the first date that has start times (moving to later months if needed); returns that day's number. */
async function pickFirstDayWithTimes(page: Page): Promise<string> {
  const grid = page.getByRole('grid').first();
  const openDays = grid.locator('button:not([disabled])');

  for (let month = 0; month < 4; month++) {
    // Dates stay disabled until the availability request answers, so wait for at least one to open.
    const hasOpenDay = await expect
      .poll(() => openDays.count(), { timeout: 20_000 })
      .toBeGreaterThan(0)
      .then(() => true, () => false);

    if (hasOpenDay) {
      const count = await openDays.count();
      for (let i = 0; i < Math.min(count, 15); i++) {
        const day = (await openDays.nth(i).innerText()).trim();
        await openDays.nth(i).click();
        // Wait for the outcome: either real start-time buttons or the "no times" message.
        const firstTime = page.locator('button:not([disabled])').filter({ hasText: TIME_BUTTON }).first();
        const noTimes = page.getByText(/No start times are open on this date/);
        await expect(firstTime.or(noTimes)).toBeVisible({ timeout: 15_000 });
        if (await firstTime.isVisible()) return day;
      }
    }
    await page.getByRole('button', { name: 'Go to the Next Month' }).click();
  }
  throw new Error('No open date with start times was found in the next 4 months for this photographer.');
}

async function pickFirstTime(page: Page) {
  const time = page.locator('button:not([disabled])').filter({ hasText: TIME_BUTTON }).first();
  await expect(time).toBeVisible();
  await time.click();
}

test.describe('Booking form: extra sessions (real API, nothing is saved)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.skip(!e2e.photographerId, 'Set E2E_PHOTOGRAPHER_ID in .env.e2e.');
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2e.client, '**/bookings');
    await page.goto(`/booking/${e2e.photographerId}`);
    await expect(page.getByRole('heading', { name: 'Choose Your Start Time' })).toBeVisible({ timeout: 30_000 });
  });

  test('BKG-11 the same day and time cannot be picked twice in one booking', async ({ page }) => {
    const day = await pickFirstDayWithTimes(page);
    await pickFirstTime(page);

    // Same-day sessions are only possible with "Add a different session" (a same-event extra day needs another date).
    const addSession = page.getByRole('button', { name: 'Add a different session' }).first();
    test.skip((await addSession.count()) === 0, 'This photographer has no package that allows multiple sessions.');
    await addSession.click();

    // Session 2: open its date picker and choose the SAME day as session 1.
    await page.getByRole('button', { name: 'Select date' }).click();
    await page
      .locator('[data-radix-popper-content-wrapper] button:not([disabled])')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first()
      .click();

    // The start time already used by session 1 is greyed out and cannot be chosen.
    const taken = page.locator(`button[title="${TAKEN_TITLE}"]`).first();
    await expect(taken).toBeVisible({ timeout: 15_000 });
    await expect(taken).toBeDisabled();
  });

  test('BKG-15 a same-event extra day needs only a date and a start time', async ({ page }) => {
    const day = await pickFirstDayWithTimes(page);
    await pickFirstTime(page);

    const addDay = page.getByRole('button', { name: 'Add another day (same event)' }).first();
    test.skip((await addDay.count()) === 0, 'This photographer has no package that allows multiple sessions.');
    await addDay.click();

    // Day 2 gets an automatic label and the main booking's venue, with no description or location fields.
    await expect(page.getByText('Session 2')).toBeVisible();
    await expect(page.getByText(/same event as Session 1/)).toBeVisible();
    await expect(page.getByText(/Same event and same venue as your main booking/)).toBeVisible();

    // Pick a DIFFERENT day for session 2, then its first free start time.
    await page.getByRole('button', { name: 'Select date' }).click();
    const other = page
      .locator('[data-radix-popper-content-wrapper] button:not([disabled])')
      .filter({ hasText: /^\d{1,2}$/ }) // day numbers only, so the Previous/Next Month arrows are never clicked
      .filter({ hasNotText: new RegExp(`^${day}$`) })
      .first();
    await other.click();
    // Look only inside the Session 2 card, so a Session 1 start time is never clicked by mistake.
    const card = page.locator('div.rounded-xl').filter({ has: page.getByText(/same event as Session 1/) }).last();
    const time = card.locator('button:not([disabled])').filter({ hasText: TIME_BUTTON }).first();
    await expect(time).toBeVisible({ timeout: 15_000 });
    await time.click();

    await expect(page.getByRole('button', { name: /Continue/ })).toBeEnabled({ timeout: 15_000 });
  });
});