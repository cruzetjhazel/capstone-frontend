import { useQuery } from "@tanstack/react-query";
import { publicPhotographerService } from "@/services/publicPhotographerService";

export function usePublicPhotographerProfile(photographerId: string | undefined) {
  return useQuery({
    queryKey: ["publicPhotographerProfile", photographerId],
    queryFn: () => publicPhotographerService.getProfile(photographerId!),
    enabled: !!photographerId,
    staleTime: 5 * 60_000,
  });
}

export function useCustomPackage(photographerId: string | undefined) {
  return useQuery({
    queryKey: ["customPackage", photographerId],
    queryFn: () => publicPhotographerService.getCustomPackage(photographerId!),
    enabled: !!photographerId,
    staleTime: 5 * 60_000,
  });
}

export function useAvailableSlots(
  photographerId: string | undefined,
  date: string | undefined,
  packageId: number | undefined
) {
  return useQuery({
    queryKey: ["availableSlots", photographerId, date, packageId],
    queryFn: () => publicPhotographerService.getAvailableSlots(photographerId!, date!, packageId!),
    enabled: !!photographerId && !!date && !!packageId,
    staleTime: 30_000,
  });
}