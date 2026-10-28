import type { Page, Route } from '@playwright/test';

export type FixtureRole = 'client' | 'studio' | 'pendingStudio' | 'admin';

type FixtureUser = {
  id: string;
  name: string;
  email: string;
  account_type: 'client' | 'photographer' | 'administrator';
  account_status: 'active';
  email_verified_at: string;
  phone_number: string;
};

const users: Record<FixtureRole, FixtureUser> = {
  client: {
    id: 'fixture-client-1', name: 'Fixture Client', email: 'client.fixture@example.test',
    account_type: 'client', account_status: 'active', email_verified_at: '2026-01-01T00:00:00Z', phone_number: '+639171234567',
  },
  studio: {
    id: 'fixture-studio-1', name: 'Approved Fixture Studio', email: 'studio.fixture@example.test',
    account_type: 'photographer', account_status: 'active', email_verified_at: '2026-01-01T00:00:00Z', phone_number: '+639171234568',
  },
  pendingStudio: {
    id: 'fixture-pending-1', name: 'Pending Fixture Photographer', email: 'pending.fixture@example.test',
    account_type: 'photographer', account_status: 'active', email_verified_at: '2026-01-01T00:00:00Z', phone_number: '+639171234569',
  },
  admin: {
    id: 'fixture-admin-1', name: 'Fixture Administrator', email: 'admin.fixture@example.test',
    account_type: 'administrator', account_status: 'active', email_verified_at: '2026-01-01T00:00:00Z', phone_number: '+639171234570',
  },
};

function responseFor(pathname: string, role: FixtureRole) {
  const user = users[role];
  if (pathname.endsWith('/auth/login')) {
    return { status: 200, body: { data: { token: `fixture-token-${role}`, user } } };
  }
  if (pathname.endsWith('/auth/me')) return { status: 200, body: { data: user } };
  if (pathname.endsWith('/photographer/application')) {
    return { status: 200, body: { data: { status: role === 'studio' ? 'approved' : 'pending_review', photographer_type: 'freelancer', business_name: 'Fixture Studio' } } };
  }
  if (pathname.endsWith('/client/profile') || pathname.endsWith('/photographer/profile')) {
    return { status: 200, body: { data: { profile_photo_url: null } } };
  }
  if (pathname.endsWith('/photographers') || pathname.endsWith('/photographers/featured')) return { status: 200, body: { data: [] } };
  if (pathname.includes('/locations/')) return { status: 200, body: { data: [] } };
  if (pathname.endsWith('/notifications/unread-count')) return { status: 200, body: { data: { count: 0 } } };
  if (pathname.endsWith('/notifications')) return { status: 200, body: { data: [] } };
  if (pathname.endsWith('/logout')) return { status: 204, body: undefined };
  return { status: 200, body: { data: [] } };
}

export async function installApiFixtures(page: Page, role: FixtureRole = 'client') {
  await page.route('**://127.0.0.1:8000/api/**', async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const result = responseFor(pathname, role);
    await route.fulfill({
      status: result.status,
      contentType: 'application/json',
      body: result.body === undefined ? '' : JSON.stringify(result.body),
    });
  });
}

export async function loginAs(page: Page, role: FixtureRole) {
  await installApiFixtures(page, role);
  await page.goto('/login');
  await page.locator('#email').fill(users[role].email);
  await page.locator('#password').fill('FixturePassword!123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  if (role === 'client') await page.waitForURL('**/bookings');
  if (role === 'studio') await page.waitForURL('**/studio');
  if (role === 'pendingStudio') await page.waitForURL('**/photographer/status');
  if (role === 'admin') await page.waitForURL('**/admin');
}

export const fixtureEmails = users;
