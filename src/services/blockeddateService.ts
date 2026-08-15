import api, { getApiErrorMessage } from "@/lib/api";

export interface BlockedDate {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string | null;
  endTime: string | null;
  reason: string;
  fullDay: boolean;
}

type RawBlockedDate = {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  full_day: boolean;
};

function toBlockedDate(raw: RawBlockedDate): BlockedDate {
  return {
    id: String(raw.id),
    date: raw.date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    reason: raw.reason,
    fullDay: raw.full_day,
  };
}

// NOTE: BlockedDateRequest.php (store/update validation) wasn't available —
// these field names are inferred from BlockedDateResource.php's output. If
// the backend 422s, check the real field name in the error and adjust here.
export interface BlockedDatePayload {
  date: string; // "YYYY-MM-DD"
  start_time?: string | null; // "HH:mm", omit/null for a full-day block
  end_time?: string | null;
  reason?: string | null;
}

export const blockedDateService = {
  list: async (): Promise<BlockedDate[]> => {
    const res = await api.get("/photographer/blocked-dates");
    return (res.data.data as RawBlockedDate[]).map(toBlockedDate);
  },

  create: async (payload: BlockedDatePayload): Promise<BlockedDate> => {
    const res = await api.post("/photographer/blocked-dates", payload);
    return toBlockedDate(res.data.data);
  },

  update: async (id: string, payload: BlockedDatePayload): Promise<BlockedDate> => {
    const res = await api.patch(`/photographer/blocked-dates/${id}`, payload);
    return toBlockedDate(res.data.data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/photographer/blocked-dates/${id}`);
  },
};

export { getApiErrorMessage };