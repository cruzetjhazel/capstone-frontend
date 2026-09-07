import { useQuery } from "@tanstack/react-query";
import { publicAvailabilityService } from "@/services/publicAvailabilityService";

/**
 * month: "YYYY-MM". Pass EITHER packageId (fixed) OR customDurationMinutes
 * (custom) — never both. Disabled automatically until photographerId and
 * one of those two is known.
 */
export function useMonthAvailability(
  photographerId: string | undefined,
  month: string,
  packageId: number | undefined,
  customDurationMinutes?: number
) {
  return useQuery({
    queryKey: ["availability", "calendar", photographerId, month, packageId, customDurationMinutes],
    queryFn: () => publicAvailabilityService.getMonthSummary(photographerId!, month, packageId, customDurationMinutes),
    enabled: !!photographerId && (!!packageId || !!customDurationMinutes),
    staleTime: 30_000,
  });
}

/** Pass EITHER packageId (fixed) OR customDurationMinutes (custom) — never both. */
export function useAvailableStartTimes(
  photographerId: string | undefined,
  date: string,
  packageId: number | undefined,
  customDurationMinutes?: number
) {
  return useQuery({
    queryKey: ["availability", "slots", photographerId, date, packageId, customDurationMinutes],
    queryFn: () => publicAvailabilityService.getAvailableStartTimes(photographerId!, date, packageId, customDurationMinutes),
    enabled: !!photographerId && !!date && (!!packageId || !!customDurationMinutes),
    staleTime: 30_000,
  });
}