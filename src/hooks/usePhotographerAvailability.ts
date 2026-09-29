import { useQuery } from "@tanstack/react-query";
import { publicAvailabilityService } from "@/services/publicAvailabilityService";

export function useMonthAvailability(
  photographerId: string | undefined,
  month: string,
  packageId: number | undefined,
  customDurationMinutes?: number,
  sessionDurationMinutes?: number
) {
  return useQuery({
    queryKey: ["availability", "calendar", photographerId, month, packageId, customDurationMinutes, sessionDurationMinutes],
    queryFn: () => publicAvailabilityService.getMonthSummary(photographerId!, month, packageId, customDurationMinutes, sessionDurationMinutes),
    enabled: !!photographerId,
    staleTime: 30_000,
  });
}

// Shared by the hook below and by useQueries() (one lookup per extra session).
export function availableStartTimesQuery(
  photographerId: string | undefined,
  date: string,
  packageId: number | undefined,
  customDurationMinutes?: number,
  sessionDurationMinutes?: number
) {
  return {
    queryKey: ["availability", "slots", photographerId, date, packageId, customDurationMinutes, sessionDurationMinutes],
    queryFn: () => publicAvailabilityService.getAvailableStartTimes(photographerId!, date, packageId, customDurationMinutes, sessionDurationMinutes),
    enabled: !!photographerId && !!date,
    staleTime: 30_000,
    placeholderData: (prev: string[] | undefined) => prev, // v5
    // keepPreviousData: true,                              // v4: use this instead
  };
}

export function useAvailableStartTimes(
  photographerId: string | undefined,
  date: string,
  packageId: number | undefined,
  customDurationMinutes?: number,
  sessionDurationMinutes?: number
) {
  return useQuery(availableStartTimesQuery(photographerId, date, packageId, customDurationMinutes, sessionDurationMinutes));
}