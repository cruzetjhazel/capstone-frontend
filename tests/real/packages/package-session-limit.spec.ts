import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import {
  E2E_PACKAGE_PREFIX,
  deleteTestPackages,
  listTestPackages,
  readCustomConfig,
  restoreCustomConfig,
  setCustomConfig,
  type CustomConfig,
} from '../../helpers/packages';

const MAX = 15; // PKG-09: 15 is accepted, 16 is rejected
const ABOVE_MAX = '16';

const uniqueName = () => `${E2E_PACKAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const PACKAGES_POST = (url: string, method: string) => url.endsWith('/photographer/packages') && method === 'POST';
const CONFIG_PATCH = (url: string, method: string) => url.endsWith('/photographer/custom-package/config') && method === 'PATCH';

// ---------------------------------------------------------------------------
// Regular (fixed) package form
// ---------------------------------------------------------------------------

test.describe('PKG-09 regular package: maximum sessions (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true in .env.e2e.');
  test.skip(!e2e.photographer.email, 'Set E2E_PHOTOGRAPHER_EMAIL / PASSWORD in .env.e2e.');
  test.describe.configure({ mode: 'serial' }); // the tests share one photographer account
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

  /** The modal has no dialog role, so it is found through its heading. */
  const modalTitled = (page: Page, title: 'Add Fixed Package' | 'Edit Package') =>
    page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: title }) });

  const openCreateModal = async (page: Page) => {
    await page.getByRole('button', { name: 'Add Fixed Package' }).click();
    const modal = modalTitled(page, 'Add Fixed Package');
    await expect(modal).toBeVisible();
    return modal;
  };

  const multiSessionSwitch = (modal: Locator) =>
    modal
      .getByText('Allow multiple photography sessions')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]')
      .getByRole('switch');

  const maxSessionsInput = (modal: Locator) => modal.getByPlaceholder('No limit');

  /** Opens "Add Fixed Package", names it and turns multiple sessions on. */
  const startNewMultiSessionPackage = async (page: Page, name: string) => {
    const modal = await openCreateModal(page);
    await modal.getByPlaceholder('Package name').fill(name);
    await multiSessionSwitch(modal).click();
    await expect(multiSessionSwitch(modal)).toBeChecked();
    return modal;
  };

  const sessionsError = (modal: Locator) => modal.getByText("Maximum sessions can't be more than 15.");

  test('PKG-09a 15 sessions can be entered and saved, and is still 15 when the package is reopened', async ({ page }) => {
    const name = uniqueName();
    const modal = await startNewMultiSessionPackage(page, name);

    await maxSessionsInput(modal).fill(String(MAX));
    await expect(sessionsError(modal)).toHaveCount(0);
    const createButton = modal.getByRole('button', { name: 'Create Package' });
    await expect(createButton).toBeEnabled();

    const saved = page.waitForResponse((r) => PACKAGES_POST(r.url(), r.request().method()));
    await createButton.click();
    const response = await saved;
    expect(response.status(), 'The API should create the package').toBe(201);
    expect(response.request().postDataJSON().max_sessions, 'The form should send 15').toBe(MAX);
    await expect(page.getByText(`"${name}" created as a Draft.`)).toBeVisible();

    // Reopen from a fresh page load so the value comes from the server, not from the in-memory list.
    await page.goto('/studio/packages');
    const card = page
      .getByText(name, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await card.getByRole('button', { name: 'Edit', exact: true }).click();

    const editModal = modalTitled(page, 'Edit Package');
    await expect(editModal).toBeVisible();
    await expect(multiSessionSwitch(editModal)).toBeChecked();
    await expect(maxSessionsInput(editModal)).toHaveValue(String(MAX));
  });

  test('PKG-09b 16 sessions shows an error, cannot be submitted, and nothing is saved', async ({ page, request }) => {
    const name = uniqueName();
    const modal = await startNewMultiSessionPackage(page, name);

    await maxSessionsInput(modal).fill(ABOVE_MAX);

    await expect(maxSessionsInput(modal)).toHaveValue(ABOVE_MAX); // the form does not silently change it
    await expect(sessionsError(modal)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create Package' })).toBeDisabled();

    expect((await listTestPackages(request)).filter((p) => p.name === name)).toHaveLength(0);
  });

  test('PKG-09c other values above the maximum are also blocked', async ({ page }) => {
    const modal = await startNewMultiSessionPackage(page, uniqueName());

    for (const value of ['17', '100', '15.5']) {
      await maxSessionsInput(modal).fill(value);
      await expect(sessionsError(modal), `"${value}" should show the error`).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Create Package' }), `"${value}" should block saving`).toBeDisabled();
    }

    // Going back to a valid value clears the error and re-enables saving.
    await maxSessionsInput(modal).fill(String(MAX));
    await expect(sessionsError(modal)).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Create Package' })).toBeEnabled();
  });

  test('PKG-09d values below 2 are raised to 2 by the form, so a value below the minimum is never sent', async ({ page }) => {
    const modal = await startNewMultiSessionPackage(page, uniqueName());

    for (const value of ['1', '0', '-4']) {
      await maxSessionsInput(modal).fill(value);
      await expect(maxSessionsInput(modal), `"${value}" should become 2`).toHaveValue('2');
    }
  });

  test('PKG-09e a decimal such as 2.5 is rejected by the server and no package is created', async ({ page, request }) => {
    const name = uniqueName();
    const modal = await startNewMultiSessionPackage(page, name);

    await maxSessionsInput(modal).fill('2.5');

    // The form has no whole-number check, so it lets this through; the API must refuse it.
    const attempt = page.waitForResponse((r) => PACKAGES_POST(r.url(), r.request().method()));
    await modal.getByRole('button', { name: 'Create Package' }).click();
    expect((await attempt).status(), 'The API must reject a non-integer max_sessions').toBe(422);

    expect((await listTestPackages(request)).filter((p) => p.name === name)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Custom package form
// ---------------------------------------------------------------------------

test.describe('PKG-09 custom package: maximum sessions (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true in .env.e2e.');
  test.skip(!e2e.photographer.email, 'Set E2E_PHOTOGRAPHER_EMAIL / PASSWORD in .env.e2e.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  let original: CustomConfig;

  test.beforeEach(async ({ page, request }) => {
    // Snapshot first (fails before changing anything if the response shape is unexpected).
    original = await readCustomConfig(request);
    // Known starting point: custom packages on, fixed pricing, multiple sessions off, no limit.
    await setCustomConfig(request, {
      enabled: true, pricing_model: 'fixed', base_fee: 2000, allows_multiple_sessions: false, max_sessions: null,
    });

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto('/studio/packages');
    await openCustomTab(page);
  });

  // The photographer's real custom package settings are always put back.
  test.afterEach(async ({ request }) => {
    if (original) await restoreCustomConfig(request, original);
  });

  const openCustomTab = async (page: Page) => {
    await page.getByRole('button', { name: 'Custom Package', exact: true }).click({ timeout: 30_000 });
    await expect(page.getByText('How do you charge for custom packages?')).toBeVisible();
  };

  const multiSessionSwitch = (page: Page) =>
    page
      .getByText('Allow extra days / sessions')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]')
      .getByRole('switch');

  const maxSessionsInput = (page: Page) =>
    page.getByText('Max sessions (optional)').locator('xpath=following-sibling::input');

  // The pricing Save comes before the buffer Save on the page.
  const pricingSave = (page: Page) => page.getByRole('button', { name: 'Save', exact: true }).first();

  const turnMultiSessionOn = async (page: Page) => {
    await multiSessionSwitch(page).click();
    await expect(multiSessionSwitch(page)).toBeChecked();
  };

  const MIN_ERROR = 'Maximum sessions must be at least 2, or leave it blank for no limit.';

  test('PKG-09f 15 sessions can be entered and saved, and is still 15 when the custom package is reopened', async ({ page }) => {
    await turnMultiSessionOn(page);
    await maxSessionsInput(page).fill(String(MAX));
    await expect(page.getByText(MIN_ERROR)).toHaveCount(0);
    await expect(pricingSave(page)).toBeEnabled();

    const saved = page.waitForResponse((r) => CONFIG_PATCH(r.url(), r.request().method()));
    await pricingSave(page).click();
    const response = await saved;
    expect(response.status(), 'The API should accept 15').toBe(200);
    expect(response.request().postDataJSON().max_sessions, 'The form should send 15').toBe(MAX);
    await expect(page.getByText('Pricing updated.').first()).toBeVisible();

    // Reopen from a fresh page load so the value comes from the server.
    await page.goto('/studio/packages');
    await openCustomTab(page);
    await expect(multiSessionSwitch(page)).toBeChecked();
    await expect(maxSessionsInput(page)).toHaveValue(String(MAX));
  });

  test('PKG-09g typing 16 never reaches the server: the field stops at 15 and 15 is what gets saved', async ({ page }) => {
    await turnMultiSessionOn(page);

    await maxSessionsInput(page).fill(ABOVE_MAX);
    // The custom form does not show an error for this; it silently caps the number.
    await expect(maxSessionsInput(page)).toHaveValue(String(MAX));

    const saved = page.waitForResponse((r) => CONFIG_PATCH(r.url(), r.request().method()));
    await pricingSave(page).click();
    const response = await saved;
    expect(response.request().postDataJSON().max_sessions, '16 must never be sent').toBe(MAX);
    expect(response.status()).toBe(200);
  });

  test('PKG-09h values below 2 show an error and cannot be saved', async ({ page, request }) => {
    await turnMultiSessionOn(page);

    for (const value of ['1', '0', '-3']) {
      await maxSessionsInput(page).fill(value);
      await expect(page.getByText(MIN_ERROR), `"${value}" should show the error`).toBeVisible();
      await expect(pricingSave(page), `"${value}" should block saving`).toBeDisabled();
    }

    // Nothing was written.
    const stored = await readCustomConfig(request);
    expect(stored.max_sessions).toBeNull();
    expect(stored.allows_multiple_sessions).toBe(false);
  });

  test('PKG-09i a decimal such as 2.5 is rejected by the server and nothing is saved', async ({ page, request }) => {
    await turnMultiSessionOn(page);
    await maxSessionsInput(page).fill('2.5');

    // The form has no whole-number check, so it lets this through; the API must refuse it.
    const attempt = page.waitForResponse((r) => CONFIG_PATCH(r.url(), r.request().method()));
    await pricingSave(page).click();
    expect((await attempt).status(), 'The API must reject a non-integer max_sessions').toBe(422);

    const stored = await readCustomConfig(request);
    expect(stored.max_sessions).toBeNull();
  });
});