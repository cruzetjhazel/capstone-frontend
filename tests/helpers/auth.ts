import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { e2e, type Account } from './env';

/** Logs in through the real login page and waits for the landing URL (e.g. '**\/bookings'). */
export async function loginViaUi(page: Page, who: Account, landing: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(who.email);
  await page.locator('#password').fill(who.password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  expect(response.ok(), `Login failed for ${who.email} (HTTP ${response.status()})`).toBeTruthy();
  await page.waitForURL(landing);
}

/** Logs in through the API and returns a bearer token (for setup and cleanup calls). */
export async function apiToken(request: APIRequestContext, who: Account): Promise<string> {
  const res = await request.post(`${e2e.apiUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: who.email, password: who.password },
  });
  expect(res.ok(), `API login failed for ${who.email}`).toBeTruthy();
  const body = await res.json();
  return (body.data ?? body).token;
}


/** Signs out whoever is logged in, then signs in as someone else. */
export async function switchTo(page: Page, who: Account, landing: string) {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await loginViaUi(page, who, landing);
}

/** Calls a write endpoint on the real API as the given user (for setup steps and server-side checks). */
export async function apiPost(request: APIRequestContext, who: Account, path: string, data: object) {
  const token = await apiToken(request, who);
  return request.post(`${e2e.apiUrl}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    data,
  });
}