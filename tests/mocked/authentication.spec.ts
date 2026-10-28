import { test, expect } from '@playwright/test';
import { installApiFixtures } from '../fixtures/api-fixtures';

test.describe('Authentication and account entry points', () => {
  test('AUTH-001 login requires email and password', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('#email')).toBeFocused();
  });

  test('AUTH-002 password visibility toggle changes input type', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/login');
    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('AUTH-003 forgot password validates an empty email', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/login');
    await page.getByText('Forgot password?', { exact: true }).click();
    await expect(page.getByText('Reset Your Password', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByText('Reset Your Password', { exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]').last()).toHaveAttribute('required', '');
  });

  test('AUTH-004 registration exposes account type choices', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/register');
    await expect(page.getByText('Create your account', { exact: true })).toBeVisible();
    await expect(page.getByText('Client', { exact: true })).toBeVisible();
    await expect(page.getByText('Freelance Photographer', { exact: true })).toBeVisible();
    await expect(page.getByText('Studio Owner', { exact: true })).toBeVisible();
  });

  test('AUTH-005 guarded route redirects unauthenticated visitors', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/bookings');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('AUTH-006 login links to registration', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/login');
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL('/register');
  });

  test('AUTH-007 password-reset cancel closes the reset form', async ({ page }) => {
    await installApiFixtures(page);
    await page.goto('/login');
    await page.getByText('Forgot password?', { exact: true }).click();
    await expect(page.getByText('Reset Your Password', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Reset Your Password', { exact: true })).toBeHidden();
  });
});
