export type Account = { email: string; password: string };

const account = (prefix: string): Account => ({
  email: process.env[`${prefix}_EMAIL`] ?? '',
  password: process.env[`${prefix}_PASSWORD`] ?? '',
});

/** Every E2E setting lives here, read from .env.e2e (see playwright.config.ts). */
export const e2e = {
  realApi: process.env.E2E_REAL_API === 'true',
  apiUrl: process.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',

  client: account('E2E_CLIENT'),
  otherClient: account('E2E_OTHER_CLIENT'),
  photographer: account('E2E_PHOTOGRAPHER'),
  photographerB: account('E2E_PHOTOGRAPHER_B'), // only when booking B has a different photographer
  admin: account('E2E_ADMIN'),

  // Existing accounts whose emails pass the register form's email rule (e.g. @gmail.com). Only the email is used.
  duplicateClientEmail: process.env.E2E_DUPLICATE_CLIENT_EMAIL ?? '',
  duplicatePhotographerEmail: process.env.E2E_DUPLICATE_PHOTOGRAPHER_EMAIL ?? '',

  photographerId: process.env.E2E_PHOTOGRAPHER_ID ?? '',
  bookingPending: process.env.E2E_BOOKING_PENDING ?? '',
  bookingA: process.env.E2E_BOOKING_A ?? '',
  bookingB: process.env.E2E_BOOKING_B ?? '',
  bookingNoShowByClient: process.env.E2E_BOOKING_NOSHOW_BY_CLIENT ?? '',
  bookingNoShowByPhotographer: process.env.E2E_BOOKING_NOSHOW_BY_PHOTOGRAPHER ?? '',
  bookingNotStarted: process.env.E2E_BOOKING_NOT_STARTED ?? '',
    bookingTooSoon: process.env.E2E_BOOKING_TOO_SOON ?? '',
  bookingAccept: process.env.E2E_BOOKING_ACCEPT ?? '',
  bookingLifecycle: process.env.E2E_BOOKING_LIFECYCLE ?? '',
  bookingComplete: process.env.E2E_BOOKING_COMPLETE ?? '',
  bookingAdminUphold: process.env.E2E_BOOKING_ADMIN_UPHOLD ?? '',
  bookingAdminDispute: process.env.E2E_BOOKING_ADMIN_DISPUTE ?? '',
};