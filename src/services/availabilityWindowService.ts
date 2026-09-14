import api from "@/lib/api";

// Matches AvailabilityWindowResource.php's output exactly (no case
// conversion needed — date/start_time/end_time are used as-is).
export interface AvailabilityWindowRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:mm"
  end_time: string;
}

// Matches AvailabilityWindowRequest.php's validation rules.
export interface AvailabilityWindowPayload {
  date: string; // "YYYY-MM-DD", must be today or later
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm", must be after start_time
}

export const availabilityWindowService = {
  list: async (): Promise<AvailabilityWindowRecord[]> =>
    (await api.get("/photographer/availability-windows")).data.data,
  create: async (payload: AvailabilityWindowPayload): Promise<AvailabilityWindowRecord> =>
    (await api.post("/photographer/availability-windows", payload)).data.data,
  update: async (id: string, payload: AvailabilityWindowPayload): Promise<AvailabilityWindowRecord> =>
    (await api.patch(`/photographer/availability-windows/${id}`, payload)).data.data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/photographer/availability-windows/${id}`);
  },
};