import { expect, type APIRequestContext } from '@playwright/test';
import { apiToken } from './auth';
import { e2e } from './env';

/** Every package created by the session-limit tests starts with this, so cleanup can find them. */
export const E2E_PACKAGE_PREFIX = 'E2E-SES-';

export type CustomConfig = Record<string, unknown>;

/** Only these keys are accepted by PATCH /photographer/custom-package/config (CustomPackageConfigRequest). */
const CONFIG_KEYS = [
  'enabled', 'pricing_model', 'base_fee', 'buffer_minutes', 'hourly_rate', 'outdoor_hourly_rate',
  'base_hours', 'min_hours', 'max_hours', 'unit_rate', 'coverage_hours', 'max_people',
  'allows_multiple_sessions', 'max_sessions', 'base_fee_mode',
] as const;

const CONFIG_URL = () => `${e2e.apiUrl}/photographer/custom-package/config`;

async function headers(request: APIRequestContext) {
  const token = await apiToken(request, e2e.photographer);
  return { Accept: 'application/json', Authorization: `Bearer ${token}` };
}

type PackageRow = { id: number | string; name: string; status?: string };

/** All packages of the E2E photographer whose name was created by these tests. */
export async function listTestPackages(request: APIRequestContext): Promise<PackageRow[]> {
  const res = await request.get(`${e2e.apiUrl}/photographer/packages`, { headers: await headers(request) });
  expect(res.ok(), 'Could not list the photographer packages').toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.data), 'Unexpected package list response shape (expected body.data to be an array)').toBeTruthy();
  return (body.data as PackageRow[]).filter((p) => typeof p.name === 'string' && p.name.startsWith(E2E_PACKAGE_PREFIX));
}

/** Archives then permanently deletes every package created by these tests (a draft must be archived before it can be deleted). */
export async function deleteTestPackages(request: APIRequestContext) {
  const h = await headers(request);
  for (const p of await listTestPackages(request)) {
    if (p.status !== 'archived') {
      const archived = await request.post(`${e2e.apiUrl}/photographer/packages/${p.id}/archive`, { headers: h });
      expect(archived.ok(), `Could not archive test package ${p.name}`).toBeTruthy();
    }
    const deleted = await request.delete(`${e2e.apiUrl}/photographer/packages/${p.id}`, { headers: h });
    expect(deleted.ok(), `Could not delete test package ${p.name}`).toBeTruthy();
  }
}

/**
 * Reads the photographer's current custom package config so it can be put back after the test.
 * Fails BEFORE anything is changed if the response is not shaped the way the restore code expects.
 */
export async function readCustomConfig(request: APIRequestContext): Promise<CustomConfig> {
  const res = await request.get(CONFIG_URL(), { headers: await headers(request) });
  expect(res.ok(), 'Could not read the custom package config').toBeTruthy();
  const data = (await res.json()).data as CustomConfig | null;
  expect(data, 'The photographer has no custom package config row to snapshot').toBeTruthy();
  expect(typeof data!.enabled, 'Unexpected config shape: "enabled" is not a boolean').toBe('boolean');
  expect('max_sessions' in data!, 'Unexpected config shape: "max_sessions" key is missing').toBeTruthy();
  return data!;
}

export async function setCustomConfig(request: APIRequestContext, data: CustomConfig) {
  const res = await request.patch(CONFIG_URL(), { headers: await headers(request), data });
  expect(res.ok(), `Could not set up the custom package config (status ${res.status()})`).toBeTruthy();
}

/** Puts the config back to what it was and checks the session fields really match again. */
export async function restoreCustomConfig(request: APIRequestContext, original: CustomConfig) {
  const payload: CustomConfig = {};
  for (const key of CONFIG_KEYS) {
    if (key in original) payload[key] = original[key];
  }
  await setCustomConfig(request, payload);

  const after = await readCustomConfig(request);
  for (const key of CONFIG_KEYS) {
    if (!(key in original)) continue;
    // An older config may have no pricing_model; the server is allowed to fill in a default for it.
    if (key === 'pricing_model' && original.pricing_model == null) continue;
    expect(after[key], `Custom config "${key}" was not restored`).toEqual(original[key]);
  }
}

/** Known starting point for the pricing-method tests: custom packages on, fixed ₱2,000, everything else blank. */
export const BASELINE_FIXED_CONFIG: CustomConfig = {
  enabled: true,
  pricing_model: 'fixed',
  base_fee: 2000,
  base_hours: null,
  hourly_rate: null,
  outdoor_hourly_rate: null,
  unit_rate: null,
  coverage_hours: null,
  max_people: null,
  allows_multiple_sessions: false,
  max_sessions: null,
};