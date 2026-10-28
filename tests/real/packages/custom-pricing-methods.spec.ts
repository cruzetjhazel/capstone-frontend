import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from '../../helpers/auth';
import { e2e } from '../../helpers/env';
import {
  BASELINE_FIXED_CONFIG,
  readCustomConfig,
  restoreCustomConfig,
  setCustomConfig,
  type CustomConfig,
} from '../../helpers/packages';

const CONFIG_PATCH = (url: string, method: string) =>
  url.endsWith('/photographer/custom-package/config') && method === 'PATCH';

test.describe('CPK-02 to CPK-05 custom package charge methods (real API)', () => {
  test.skip(!e2e.realApi, 'Set E2E_REAL_API=true in .env.e2e.');
  test.skip(!e2e.photographer.email, 'Set E2E_PHOTOGRAPHER_EMAIL / PASSWORD in .env.e2e.');
  test.describe.configure({ mode: 'serial' }); // the tests share one photographer account
  test.setTimeout(90_000);

  let original: CustomConfig;

  test.beforeEach(async ({ page, request }) => {
    original = await readCustomConfig(request); // fails before changing anything if the shape is unexpected
    await setCustomConfig(request, BASELINE_FIXED_CONFIG);

    await loginViaUi(page, e2e.photographer, '**/studio');
    await page.goto('/studio/packages');
    await openCustomTab(page);
  });

  // The photographer's real custom package settings are always put back.
  test.afterEach(async ({ request }) => {
    if (original) await restoreCustomConfig(request, original);
  });

  // ---- helpers ------------------------------------------------------------

  const openCustomTab = async (page: Page) => {
    await page.getByRole('button', { name: 'Custom Package', exact: true }).click({ timeout: 30_000 });
    await expect(page.getByText('How do you charge for custom packages?')).toBeVisible();
  };

  /** The labels are not linked to their inputs, so each input is found through its label text. */
  const field = (page: Page, label: RegExp) => page.getByText(label).locator('xpath=following-sibling::input');

  const chooseMethod = (page: Page, name: RegExp) => page.getByRole('button', { name }).click();

  // The pricing Save comes before the buffer Save on the page (the buffer Save is disabled until it is edited).
  const pricingSave = (page: Page) => page.getByRole('button', { name: 'Save', exact: true }).first();

  /** Clicks Save, checks the API accepted it, and returns the body the form sent. */
  const saveAndCapture = async (page: Page) => {
    const saved = page.waitForResponse((r) => CONFIG_PATCH(r.url(), r.request().method()));
    await pricingSave(page).click();
    const response = await saved;
    expect(response.status(), 'The API should accept this pricing').toBe(200);
    await expect(page.getByText('Pricing updated.').first()).toBeVisible();
    return response.request().postDataJSON() as Record<string, unknown>;
  };

  /** Fresh page load, so what is shown comes from the server and not from the form's own state. */
  const reopen = async (page: Page) => {
    await page.goto('/studio/packages');
    await openCustomTab(page);
  };

  const LABEL = {
    baseFee: /^Base Session Fee/,
    hourlyRate: /^Studio rate \/ hr/,
    minHours: /^Min\. hours\s*\*$/,
    maxHours: /^Max\. hours\s*\*$/,
    outdoorRate: /^On-location rate \/ hr/,
    dayRate: /^Rate per day \(₱\)/,
    personRate: /^Rate per person \(₱\)/,
    hoursPerSession: /^Hours per session/,
    maxPeople: /^Max people/,
  };

  const METHOD = {
    fixed: /^Fixed price/,
    hourly: /^By the hour/,
    perDay: /^By the day/,
    perPerson: /^By the person/,
  };

  /** Asserts that the saved settings were not changed on the server. */
  const expectStillBaseline = async (request: Parameters<typeof readCustomConfig>[0]) => {
    const stored = await readCustomConfig(request);
    expect(stored.pricing_model).toBe('fixed');
    expect(Number(stored.base_fee)).toBe(2000);
    expect(stored.hourly_rate ?? null).toBeNull();
    expect(stored.unit_rate ?? null).toBeNull();
  };

  // ---- CPK-02 fixed price -------------------------------------------------

  test('CPK-02a fixed price: a new base fee saves and is still there after reopening', async ({ page }) => {
    await expect(field(page, LABEL.baseFee)).toHaveValue('2000');
    await field(page, LABEL.baseFee).fill('3500');

    const body = await saveAndCapture(page);
    expect(body.pricing_model).toBe('fixed');
    expect(body.base_fee).toBe(3500);
    expect(body.hourly_rate).toBeNull();
    expect(body.unit_rate).toBeNull();

    await reopen(page);
    await expect(field(page, LABEL.baseFee)).toHaveValue('3500');
    await expect(page.getByText(/Fixed base fee ₱3,500/)).toBeVisible();
  });

  test('CPK-02b fixed price: a blank base fee shows an error and cannot be saved', async ({ page, request }) => {
    await field(page, LABEL.baseFee).fill('');

    await expect(page.getByText('Base session fee is required while fixed pricing is on.')).toBeVisible();
    await expect(pricingSave(page)).toBeDisabled();
    await expectStillBaseline(request);
  });

  // ---- CPK-03 by the hour -------------------------------------------------

  test('CPK-03a by the hour: rate, hour range and on-location rate save and are still there after reopening', async ({ page }) => {
    await chooseMethod(page, METHOD.hourly);
    await field(page, LABEL.hourlyRate).fill('1200');
    await field(page, LABEL.minHours).fill('2');
    await field(page, LABEL.maxHours).fill('6');
    await field(page, LABEL.outdoorRate).fill('1500');

    const body = await saveAndCapture(page);
    expect(body.pricing_model).toBe('hourly');
    expect(body.hourly_rate).toBe(1200);
    expect(body.min_hours).toBe(2);
    expect(body.max_hours).toBe(6);
    expect(body.outdoor_hourly_rate).toBe(1500);
    expect(body.base_fee).toBeNull();

    await reopen(page);
    await expect(field(page, LABEL.hourlyRate)).toHaveValue('1200');
    await expect(field(page, LABEL.minHours)).toHaveValue('2');
    await expect(field(page, LABEL.maxHours)).toHaveValue('6');
    await expect(field(page, LABEL.outdoorRate)).toHaveValue('1500');
    await expect(page.getByText(/₱1,200 per hour \(studio\) · ₱1,500 per hour \(outdoor\)/)).toBeVisible();
  });

  test('CPK-03b by the hour: a missing rate shows an error and cannot be saved', async ({ page, request }) => {
    await chooseMethod(page, METHOD.hourly);
    await expect(field(page, LABEL.hourlyRate)).toHaveValue('');

    await expect(page.getByText('Rate per hour is required and must be greater than 0.')).toBeVisible();
    await expect(pricingSave(page)).toBeDisabled();
    await expectStillBaseline(request);
  });

  test('CPK-03c by the hour: maximum hours below minimum hours shows an error and cannot be saved', async ({ page, request }) => {
    await chooseMethod(page, METHOD.hourly);
    await field(page, LABEL.hourlyRate).fill('1000');
    await field(page, LABEL.minHours).fill('5');
    await field(page, LABEL.maxHours).fill('3');

    await expect(page.getByText("Max. hours can't be less than min. hours.")).toBeVisible();
    await expect(pricingSave(page)).toBeDisabled();
    await expectStillBaseline(request);
  });

  // ---- CPK-04 by the day --------------------------------------------------

  test('CPK-04a by the day: daily rate and hours per session save and are still there after reopening', async ({ page }) => {
    await chooseMethod(page, METHOD.perDay);
    await field(page, LABEL.dayRate).fill('8000');
    await field(page, LABEL.hoursPerSession).fill('4');

    const body = await saveAndCapture(page);
    expect(body.pricing_model).toBe('per_day');
    expect(body.unit_rate).toBe(8000);
    expect(body.coverage_hours).toBe(4);
    expect(body.base_fee).toBeNull();
    expect(body.hourly_rate).toBeNull();

    await reopen(page);
    await expect(field(page, LABEL.dayRate)).toHaveValue('8000');
    await expect(field(page, LABEL.hoursPerSession)).toHaveValue('4');
    await expect(page.getByText(/₱8,000 per day/)).toBeVisible();
  });

  test('CPK-04b by the day: a missing daily rate shows an error and cannot be saved', async ({ page, request }) => {
    await chooseMethod(page, METHOD.perDay);
    await expect(field(page, LABEL.dayRate)).toHaveValue('');

    await expect(page.getByText('Rate per day is required and must be greater than 0.')).toBeVisible();
    await expect(pricingSave(page)).toBeDisabled();
    await expectStillBaseline(request);
  });

  // ---- CPK-05 by the person -----------------------------------------------

  test('CPK-05a by the person: rate, hours per session and people limit save and are still there after reopening', async ({ page }) => {
    await chooseMethod(page, METHOD.perPerson);
    await field(page, LABEL.personRate).fill('500');
    await field(page, LABEL.hoursPerSession).fill('3');
    await field(page, LABEL.maxPeople).fill('10');

    const body = await saveAndCapture(page);
    expect(body.pricing_model).toBe('per_person');
    expect(body.unit_rate).toBe(500);
    expect(body.coverage_hours).toBe(3);
    expect(body.max_people).toBe(10);
    expect(body.base_fee).toBeNull();

    await reopen(page);
    await expect(field(page, LABEL.personRate)).toHaveValue('500');
    await expect(field(page, LABEL.hoursPerSession)).toHaveValue('3');
    await expect(field(page, LABEL.maxPeople)).toHaveValue('10');
    await expect(page.getByText(/₱500 per person/)).toBeVisible();
  });

  test('CPK-05b by the person: a missing rate shows an error and cannot be saved', async ({ page, request }) => {
    await chooseMethod(page, METHOD.perPerson);
    await expect(field(page, LABEL.personRate)).toHaveValue('');

    await expect(page.getByText('Rate per person is required and must be greater than 0.')).toBeVisible();
    await expect(pricingSave(page)).toBeDisabled();
    await expectStillBaseline(request);
  });
});