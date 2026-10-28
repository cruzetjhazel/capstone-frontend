import { test, expect } from '@playwright/test';
import { installApiFixtures, loginAs } from '../fixtures/api-fixtures';

test.describe('Remaining implemented route surface', () => {
  const publicRoutes = [
    ['/email-verified', 'email-verified'],
    ['/reset-password', 'reset-password'],
    ['/photographers/fixture-photographer', 'photographer-profile'],
  ] as const;

  for (const [path, id] of publicRoutes) {
    test(`ROUTE-PUBLIC-${id} renders its public route`, async ({ page }) => {
      await installApiFixtures(page);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
    });
  }

  test('ROUTE-PUBLIC-account-status redirects without account state', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/account-status');
    await expect(page).toHaveURL('/login');
  });

  const clientRoutes = [
    ['/booking/fixture-photographer', 'booking-start'],
    ['/booking-sent/fixture-booking', 'booking-sent'],
    ['/booking/fixture-booking/details', 'booking-details'],
    ['/booking/fixture-booking/pay', 'booking-pay'],
    ['/booking/fixture-booking/receipt', 'booking-receipt'],
    ['/booking/fixture-booking/feedback', 'booking-feedback'],
  ] as const;

  for (const [path, id] of clientRoutes) {
    test(`ROUTE-CLIENT-${id} preserves the authorized detail route`, async ({ page }) => {
      await loginAs(page, 'client');
      await page.goto(path);
      await expect(page).toHaveURL(path);
    });
  }

  const studioRoutes = [
    ['/studio/bookings/fixture-booking', 'booking-detail'],
    ['/photographer/status', 'application-status'],
  ] as const;

  for (const [path, id] of studioRoutes) {
    test(`ROUTE-STUDIO-${id} preserves the authorized route`, async ({ page }) => {
      await loginAs(page, id === 'application-status' ? 'pendingStudio' : 'studio');
      await page.goto(path);
      await expect(page).toHaveURL(path);
    });
  }

  const adminRoutes = [
    ['/admin/review/fixture-application', 'review-application'],
  ] as const;

  for (const [path, id] of adminRoutes) {
    test(`ROUTE-ADMIN-${id} preserves the authorized route`, async ({ page }) => {
      await loginAs(page, 'admin');
      await page.goto(path);
      await expect(page).toHaveURL(path);
    });
  }
});
