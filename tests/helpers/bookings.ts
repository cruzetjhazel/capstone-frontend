import { expect, type Page } from '@playwright/test';
import { modalWithHeading } from './ui';

export const clientBookingUrl = (id: string) => `/booking/${id}/details`;
export const studioBookingUrl = (id: string) => `/studio/bookings/${id}`;

/** Opens the client's booking page and waits until the booking has loaded. */
export async function openClientBooking(page: Page, id: string) {
  await page.goto(clientBookingUrl(id));
  await expect(page.getByRole('heading', { name: `Booking #${id}` })).toBeVisible({ timeout: 30_000 });
}

/** Opens the photographer's booking page. */
export async function openStudioBooking(page: Page, id: string) {
  await page.goto(studioBookingUrl(id));
}

/** Photographer: Accept Request -> confirm in the modal -> wait for the success message. */
export async function acceptRequest(page: Page) {
  await page.getByRole('button', { name: 'Accept Request' }).click({ timeout: 30_000 });
  const modal = modalWithHeading(page, 'Accept Booking Request?');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Yes, Accept Request' }).click();
  await expect(page.getByText('Booking accepted').first()).toBeVisible({ timeout: 20_000 });
}

/** Photographer: open the payment review for the submitted GCash reference and verify it. */
export async function verifySubmittedPayment(page: Page, reference: string) {
  await page.getByRole('button', { name: 'Review Payment' }).click({ timeout: 30_000 });
  const modal = modalWithHeading(page, 'Review Payment');
  await expect(modal).toBeVisible();
  await expect(modal.getByText(reference)).toBeVisible({ timeout: 20_000 }); // the right payment is on screen
  await modal.getByRole('button', { name: 'Verify Payment' }).click();
  await expect(page.getByText('Payment verified').first()).toBeVisible({ timeout: 20_000 });
}
