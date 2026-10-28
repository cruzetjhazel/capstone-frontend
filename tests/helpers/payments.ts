import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiToken } from './auth';
import { e2e } from './env';

export const SUBMIT_BUTTON = 'Submit Payment for Verification';

/** 13 digits, unique per run, so old rows never collide. */
export const uniqueReference = () => String(Date.now());

/** Fills the pay page (half plan, amount auto-filled) and confirms the submission. */
export async function submitReferenceViaUi(page: Page, bookingId: string, reference: string) {
  await page.goto(`/booking/${bookingId}/pay`);

  // Fail quickly with useful context if the payment form isn't available.
  await expect(
    page.locator('#payer'),
    `Payment form did not load for booking ${bookingId}. URL: ${page.url()}`
  ).toBeVisible({ timeout: 15_000 });

  await page.locator('#payer').fill('Playwright Tester');
  await page.locator('#ref').fill(reference);
  await expect(page.locator('#amt')).not.toHaveValue('');
  await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
  await page.getByRole('button', { name: /Confirm & Submit/ }).click();
}

/**
 * Rejects every payment that used `reference`, as each photographer involved.
 * This returns the bookings to "pending" so the tests can be re-run.
 */
export async function rejectPaymentsWithReference(request: APIRequestContext, reference: string) {
  const photographers = [e2e.photographer, e2e.photographerB].filter((p) => p.email);

  for (const who of photographers) {
    const token = await apiToken(request, who);
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };

    const list = await request.get(`${e2e.apiUrl}/photographer/payments`, { headers });
    const body = await list.json();
    const payments: any[] = body.data ?? body;

    for (const p of payments.filter((x) => JSON.stringify(x).includes(reference))) {
      // Already-rejected or verified payments just return 422; that's fine.
      await request.post(`${e2e.apiUrl}/photographer/payments/${p.id}/reject`, {
        headers,
        data: { notes: 'Playwright cleanup' },
      });
    }
  }
}