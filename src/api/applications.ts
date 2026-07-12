import api from "@/lib/api";
import type { ApplicationRecord, ApplicationStatus, StudioApplicationPayload } from "@/api/types/application";

export const applicationApi = {
  submit: (payload: StudioApplicationPayload | FormData) =>
    api.post<{ id: string; status: ApplicationStatus }>("/applications", payload),

  list: (params?: { status?: ApplicationStatus | "all"; search?: string }) =>
    api.get<ApplicationRecord[]>("/applications", { params }),

  updateStatus: (id: string, status: ApplicationStatus, admin_note?: string) =>
    api.patch<ApplicationRecord>(`/applications/${id}`, { status, admin_note }),
};
