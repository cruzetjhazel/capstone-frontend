import type { Locator, Page } from '@playwright/test';

/**
 * The open modal that contains a heading with this title.
 * The app's modals are plain `div.fixed` overlays (no role="dialog"), so this keeps that
 * selector in one place. If you add role="dialog" to the modals later, change it here only.
 */
export const modalWithHeading = (page: Page, title: string | RegExp): Locator =>
  page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: title }) }).last();
