import { useQuery } from "@tanstack/react-query";
import { publicAvailabilityService } from "@/services/publicAvailabilityService";

/** month: "YYYY-MM". Disabled automatically until photographerId/packageId are known. */
export function useMonthAvailability(photographerId: string | undefined, month: string, packageId: number | undefined) {
  return useQuery({
    queryKey: ["availability", "calendar", photographerId, month, packageId],
    queryFn: () => publicAvailabilityService.getMonthSummary(photographerId!, month, packageId!),
    enabled: !!photographerId && !!packageId,
    staleTime: 30_000,
  });
}

export function useAvailableStartTimes(photographerId: string | undefined, date: string, packageId: number | undefined) {
  return useQuery({
    queryKey: ["availability", "slots", photographerId, date, packageId],
    queryFn: () => publicAvailabilityService.getAvailableStartTimes(photographerId!, date, packageId!),
    enabled: !!photographerId && !!date && !!packageId,
    staleTime: 30_000,
  });
}