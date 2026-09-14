import api from "@/lib/api";

export interface BookingHourPayload {
  day_of_week: number; // 0=Sun .. 6=Sat
  start_time: string;  // "HH:mm"
  end_time: string;
}

export interface BookingHourRecord extends BookingHourPayload {
  id: string;
}

export const bookingHourService = {
  list: async (): Promise<BookingHourRecord[]> => (await api.get("/photographer/booking-hours")).data.data,
  create: async (payload: BookingHourPayload): Promise<BookingHourRecord> =>
    (await api.post("/photographer/booking-hours", payload)).data.data,
  update: async (id: string, payload: BookingHourPayload): Promise<BookingHourRecord> =>
    (await api.patch(`/photographer/booking-hours/${id}`, payload)).data.data,
  remove: async (id: string): Promise<void> => { await api.delete(`/photographer/booking-hours/${id}`); },
  updateInterval: async (minutes: number): Promise<number> =>
    (await api.patch("/photographer/booking-hours/interval", { slot_interval_minutes: minutes })).data.data.slot_interval_minutes,
};