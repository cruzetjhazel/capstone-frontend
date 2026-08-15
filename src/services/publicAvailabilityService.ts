import api, { getApiErrorMessage } from "@/lib/api";

export type DayAvailability = "past" | "available" | "unavailable";

// Matches AvailabilityService::getMonthSummary()'s return shape exactly.
export type MonthAvailability = Record<string, DayAvailability>;

export const publicAvailabilityService = {
  /** One entry per day in `month` ("YYYY-MM"), keyed "YYYY-MM-DD". */
  getMonthSummary: async (photographerId: string, month: string, packageId: number): Promise<MonthAvailability> => {
    const res = await api.get(`/photographers/${photographerId}/availability/calendar`, {
      params: { month, package_id: packageId },
    });
    return res.data.data;
  },

  /** Valid booking start times ("HH:mm") for one specific date. */
  getAvailableStartTimes: async (photographerId: string, date: string, packageId: number): Promise<string[]> => {
    const res = await api.get(`/photographers/${photographerId}/availability/slots`, {
      params: { date, package_id: packageId },
    });
    return res.data.data.start_times;
  },
};

export { getApiErrorMessage };