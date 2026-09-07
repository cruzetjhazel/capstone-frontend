import api, { getApiErrorMessage } from "@/lib/api";

export type DayAvailability = "past" | "available" | "unavailable";

// Matches AvailabilityService::getMonthSummary()'s return shape exactly.
export type MonthAvailability = Record<string, DayAvailability>;

// A caller identifies the session being checked via EITHER a fixed
// package_id OR a custom coverage duration — never both. The backend
// resolves the custom buffer itself from the photographer's own
// CustomPackageConfig; callers never send a buffer value.
function durationSourceParams(packageId?: number, customDurationMinutes?: number) {
  return packageId != null
    ? { package_id: packageId }
    : { custom_duration_minutes: customDurationMinutes };
}

export const publicAvailabilityService = {
  /** One entry per day in `month` ("YYYY-MM"), keyed "YYYY-MM-DD". */
  getMonthSummary: async (
    photographerId: string,
    month: string,
    packageId?: number,
    customDurationMinutes?: number
  ): Promise<MonthAvailability> => {
    const res = await api.get(`/photographers/${photographerId}/availability/calendar`, {
      params: { month, ...durationSourceParams(packageId, customDurationMinutes) },
    });
    return res.data.data;
  },

  /** Valid booking start times ("HH:mm") for one specific date. */
  getAvailableStartTimes: async (
    photographerId: string,
    date: string,
    packageId?: number,
    customDurationMinutes?: number
  ): Promise<string[]> => {
    const res = await api.get(`/photographers/${photographerId}/availability/slots`, {
      params: { date, ...durationSourceParams(packageId, customDurationMinutes) },
    });
    return res.data.data.start_times;
  },
};

export { getApiErrorMessage };