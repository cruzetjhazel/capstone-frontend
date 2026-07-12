/**
 * In-memory store for studio/freelancer applications during frontend development.
 * Replace with Laravel API via applicationService when VITE_USE_MOCK_API=false.
 */
import type { ApplicationRecord, ApplicationStatus } from "@/api/types/application";

let store: ApplicationRecord[] = [];

export function mockListApplications(): ApplicationRecord[] {
  return [...store];
}

export function mockSaveApplication(app: ApplicationRecord) {
  store = [app, ...store];
}

export function mockUpdateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  admin_note?: string,
) {
  store = store.map((a) => (a.id === id ? { ...a, status, admin_note } : a));
}

export function mockGetApplication(id: string): ApplicationRecord | undefined {
  return store.find((a) => a.id === id);
}

/** Reset store — useful in tests. */
export function mockClearApplications() {
  store = [];
}
