import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';

/**
 * Authentication cases that run against the real Laravel API.
 * Needs E2E_REAL_API=true and E2E_CLIENT_* / E2E_PHOTOGRAPHER_* in .env.e2e.
 */
const INVALID_LINK = /reset link is invalid or has expired/i;
async function submitLogin(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  return response;
}

test.describe('Authentication (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true (and VITE_USE_MOCK_API=false in the frontend .env).');
  test.setTimeout(60_000);

  // ---------- LOGIN ----------

  test('LOG-02 wrong password shows the credentials error', async ({ page }) => {
    const response = await submitLogin(page, e2e.client.email, 'definitely-not-the-password');
    expect([401, 422], 'wrong password must be rejected (429 means login is throttled)').toContain(response.status());

    const message = (await response.json()).message as string;
    await expect(page.getByText(message).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('LOG-03 unregistered email shows the same error (no account hint)', async ({ page }) => {
    const response = await submitLogin(page, `nobody-${Date.now()}@example.test`, 'SomePassword1');
    expect([401, 422], 'unknown email must be rejected (429 means login is throttled)').toContain(response.status());

    const message = (await response.json()).message as string;
    await expect(page.getByText(message).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/not registered|no account|does not exist/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('LOG-08 logged-in client opening /login is sent to My Bookings', async ({ page }) => {
    await loginViaUi(page, e2e.client, '**/bookings');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/bookings$/, { timeout: 15_000 });
    await expect(page.locator('#email')).toHaveCount(0); // the login form is never shown
  });

  test('LOG-08 logged-in photographer opening /login is sent to the studio dashboard', async ({ page }) => {
    test.skip(!e2e.photographer.email, 'Set E2E_PHOTOGRAPHER_EMAIL / E2E_PHOTOGRAPHER_PASSWORD.');
    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/studio/, { timeout: 15_000 });
    await expect(page.locator('#email')).toHaveCount(0);
  });

  // ---------- SESSION ----------

  test('SES-01 user stays logged in after a refresh', async ({ page }) => {
    await loginViaUi(page, e2e.client, '**/bookings');
    await page.reload();
    await expect(page).toHaveURL(/\/bookings$/);
    await expect(page.locator('#email')).toHaveCount(0);
  });

  test('SES-02/03 logout returns to login and the old session cannot be reused', async ({ page }) => {
    await loginViaUi(page, e2e.client, '**/bookings');

    // Profile button (last button in the header) -> "Log out" menu item -> confirm dialog.
    await page.getByRole('banner').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    const logoutCall = page.waitForResponse((r) => r.url().includes('/auth/logout'), { timeout: 30_000 });
    await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
    await logoutCall;
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

    await page.goBack();
    await page.goto('/bookings');
    await expect(page).toHaveURL(/\/login$/);
  });

  // ---------- REGISTRATION (read-only: stops at step 2, creates nothing) ----------

  async function openAccountBasics(page: Page, accountLabel: string) {
    await page.goto('/register');
    await page.getByText(accountLabel, { exact: true }).click();
    await page.getByRole('button', { name: /^Continue/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Account basics' })).toBeVisible();
  }

  test('REG-04 client cannot register with an email that is already registered', async ({ page }) => {
    await openAccountBasics(page, 'Client');
    await page.getByPlaceholder('you@example.com').fill(e2e.duplicateClientEmail);
    await expect(page.getByText(/email is already registered/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^Continue/ })).toBeDisabled();
  });

  test('REG-04 photographer cannot register with an email that is already registered', async ({ page }) => {
    test.skip(!e2e.duplicatePhotographerEmail, 'Set E2E_DUPLICATE_PHOTOGRAPHER_EMAIL.');
    await openAccountBasics(page, 'Freelance Photographer');
    await page.getByPlaceholder('you@example.com').fill(e2e.duplicatePhotographerEmail);
    await expect(page.getByText(/email is already registered/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^Continue/ })).toBeDisabled();
  });

  test('REG-06 client cannot use the email of an existing photographer account', async ({ page }) => {
    test.skip(!e2e.duplicatePhotographerEmail, 'Set E2E_DUPLICATE_PHOTOGRAPHER_EMAIL.');
    await openAccountBasics(page, 'Client');
    await page.getByPlaceholder('you@example.com').fill(e2e.duplicatePhotographerEmail);
    await expect(page.getByText(/email is already registered/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^Continue/ })).toBeDisabled();
  });

  test('REG-05 invalid email and mismatched passwords block the next step', async ({ page }) => {
    await openAccountBasics(page, 'Client');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await page.getByPlaceholder('Min. 8 characters').fill('Password1');
    await page.getByPlaceholder('Re-enter password').fill('Password2');
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    await expect(page.getByRole('button', { name: /^Continue/ })).toBeDisabled();
  });

  test('REG-05 terms link opens the Terms page and registration needs the checkbox', async ({ page }) => {
    await openAccountBasics(page, 'Client');
    const terms = page.getByRole('link', { name: /Terms & Conditions/ });
    await expect(terms).toHaveAttribute('href', '/terms');
    await expect(terms).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('button', { name: /^Continue/ })).toBeDisabled();
  });

  // ---------- REGISTRATION API (creates a real user row each run) ----------

  test('REG-07 registration API ignores an administrator account type', async ({ request }) => {
    const email = `qa.admin.check+${Date.now()}@gmail.com`;
    const response = await request.post(`${e2e.apiUrl}/auth/register-client`, {
      headers: { Accept: 'application/json' },
      data: {
        name: 'QA Admin Check',
        email,
        phone_number: '09171234567',
        password: 'Str0ngPass!23',
        password_confirmation: 'Str0ngPass!23',
        terms_accepted: true,
        account_type: 'admin',
        role: 'admin',
        is_admin: true,
      },
    });

    if (response.status() === 201) {
      const body = await response.json();
      expect(body.data.user.account_type).toBe('client');
    } else {
      expect(response.status()).toBe(422);
    }
  });

  // ---------- PASSWORD RESET LINKS (no email needed) ----------

  test('PW-04 a reset link with a wrong token shows the invalid-link message', async ({ page }) => {
    await page.goto(`/reset-password?token=not-a-real-token&email=${encodeURIComponent(e2e.client.email)}`);
    await expect(page.getByText(INVALID_LINK).first()).toBeVisible({ timeout: 15_000 });
  });

  test('PW-07 a reset link with no token or email shows the invalid-link message', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(INVALID_LINK).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: /request a new one/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});