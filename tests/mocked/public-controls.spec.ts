import { test, expect } from '@playwright/test';
import { installApiFixtures } from '../fixtures/api-fixtures';

test.describe('Public search, registration, and navigation controls', () => {
  test.beforeEach(async ({ page }) => installApiFixtures(page));

  test('CTRL-001 empty search opens the service chooser instead of navigating', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('What are you booking?', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('CTRL-002 unknown search service shows a no-match state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'what' }).click();
    await page.getByPlaceholder('Search events, services, or photography types...').fill('not-a-real-service');
    await expect(page.getByText('No matching services found', { exact: true })).toBeVisible();
  });

  test('CTRL-003 location chooser supports free text', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'where' }).click();
    const location = page.getByPlaceholder('e.g. Sorsogon City, Sorsogon');
    await location.fill('Sorsogon City, Sorsogon');
    await expect(location).toHaveValue('Sorsogon City, Sorsogon');
  });

  test('CTRL-004 registration requires an account type before continuing', async ({ page }) => {
    await page.goto('/register');
    const continueButton = page.getByRole('button', { name: /^Continue$/ }).first();
    await expect(continueButton).toBeDisabled();
    await page.getByText('Client', { exact: true }).click();
    await expect(continueButton).toBeEnabled();
  });

  test('CTRL-005 registration client flow advances to account basics', async ({ page }) => {
    await page.goto('/register');
    await page.getByText('Client', { exact: true }).click();
    await page.getByRole('button', { name: /^Continue$/ }).first().click();
    await expect(page.locator('h1').filter({ hasText: 'Account basics' })).toBeVisible();
  });

  test('CTRL-006 back-to-website navigation returns home', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /back to website/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('CTRL-007 terms page can open its agreement query state', async ({ page }) => {
    await page.goto('/terms?from=register');
    await expect(page).toHaveURL(/from=register/);
    await expect(page.getByText('Terms & Conditions', { exact: true })).toBeVisible();
  });

  test('CTRL-008 search reset clears the selected service', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'what' }).click();
    await page.getByPlaceholder('Search events, services, or photography types...').fill('Wedding');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reset search' }).click();
    await expect(page.getByText('select service', { exact: true })).toBeVisible();
  });

  test('CTRL-009 how-it-works control reveals the workflow section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'How It Works', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible();
  });

  test('CTRL-010 email verification route preserves the verification query', async ({ page }) => {
    await page.goto('/email-verified?status=success');
    await expect(page).toHaveURL(/status=success/);
    await expect(page.getByText(/email verified/i).first()).toBeVisible();
  });
});
