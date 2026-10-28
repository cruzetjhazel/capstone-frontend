import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import { E2E_PACKAGE_PREFIX, deleteTestPackages, listTestPackages } from '../../helpers/packages';

const PACKAGES_POST = (url: string, method: string) => url.endsWith('/photographer/packages') && method === 'POST';
const uniqueName = () => `${E2E_PACKAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test.describe('PKG-10 regular package: outdoor / on-location price (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true in .env.e2e.');
  test.skip(!e2e.photographer.email, 'Set E2E_PHOTOGRAPHER_EMAIL / PASSWORD in .env.e2e.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto('/studio/packages');
    await expect(page.getByRole('button', { name: 'Add Fixed Package' })).toBeVisible({ timeout: 30_000 });
  });

  // Every package these tests create is archived and deleted again, even when a test fails.
  test.afterEach(async ({ request }) => {
    await deleteTestPackages(request);
  });

  const modalTitled = (page: Page, title: 'Add Fixed Package' | 'Edit Package') =>
    page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: title }) });

  const outdoorInput = (modal: Locator) => modal.getByPlaceholder('Same as the price above');

  const OUTDOOR_ERROR = 'Outdoor price must be greater than ₱0, or leave it blank.';

  const startNewPackage = async (page: Page, name: string) => {
    await page.getByRole('button', { name: 'Add Fixed Package' }).click();
    const modal = modalTitled(page, 'Add Fixed Package');
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder('Package name').fill(name);
    return modal;
  };

  const reopenForEdit = async (page: Page, name: string) => {
    await page.goto('/studio/packages');
    const card = page.getByText(name, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const modal = modalTitled(page, 'Edit Package');
    await expect(modal).toBeVisible();
    return modal;
  };

  test('PKG-10a an outdoor price of 0 shows an error, cannot be submitted, and nothing is saved', async ({ page, request }) => {
    const name = uniqueName();
    const modal = await startNewPackage(page, name);

    await outdoorInput(modal).fill('0');

    await expect(modal.getByText(OUTDOOR_ERROR)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create Package' })).toBeDisabled();
    expect((await listTestPackages(request)).filter((p) => p.name === name)).toHaveLength(0);
  });

  test('PKG-10b a positive outdoor price saves and is still there when the package is reopened', async ({ page }) => {
    const name = uniqueName();
    const modal = await startNewPackage(page, name);

    await outdoorInput(modal).fill('12000');
    await expect(modal.getByText(OUTDOOR_ERROR)).toHaveCount(0);

    const saved = page.waitForResponse((r) => PACKAGES_POST(r.url(), r.request().method()));
    await modal.getByRole('button', { name: 'Create Package' }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON().outdoor_price).toBe(12000);

    const editModal = await reopenForEdit(page, name);
    await expect(outdoorInput(editModal)).toHaveValue('12000');
  });

  test('PKG-10c a blank outdoor price is allowed and stays blank (same price everywhere)', async ({ page }) => {
    const name = uniqueName();
    const modal = await startNewPackage(page, name);

    await expect(outdoorInput(modal)).toHaveValue('');
    await expect(modal.getByText(OUTDOOR_ERROR)).toHaveCount(0);

    const saved = page.waitForResponse((r) => PACKAGES_POST(r.url(), r.request().method()));
    await modal.getByRole('button', { name: 'Create Package' }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON().outdoor_price).toBeNull();

    const editModal = await reopenForEdit(page, name);
    await expect(outdoorInput(editModal)).toHaveValue('');
  });
});