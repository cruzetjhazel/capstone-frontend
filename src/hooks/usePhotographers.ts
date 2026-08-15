import { useQuery } from "@tanstack/react-query";
import { photographerService } from "@/services/photographerService";
import type { PhotographerListParams } from "@/api/types/photographer";

const LIST_KEY = ["photographers", "list"] as const;
const FEATURED_KEY = ["photographers", "featured"] as const;
const DETAIL_KEY = ["photographers", "detail"] as const;

/** Public explore/browse listing — real, normalized data via photographerService.list(). */
export function usePhotographers(params?: PhotographerListParams) {
  return useQuery({
    queryKey: params ? [...LIST_KEY, params] : LIST_KEY,
    queryFn: () => photographerService.list(params),
  });
}

/** Homepage "featured studios" — real data via photographerService.featured(). */
export function useFeaturedPhotographers() {
  return useQuery({
    queryKey: FEATURED_KEY,
    queryFn: photographerService.featured,
  });
}

/** Single public profile — real data via photographerService.getById(), used by PhotographerProfile.tsx. */
export function usePhotographerProfile(id: string | undefined) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => photographerService.getById(id as string),
    enabled: !!id,
  });
}

/** Alias for usePhotographerProfile — Booking.tsx imports this exact name. Fixes the white-screen
 * SyntaxError caused by the previous version of this file not exporting it. */
export const usePhotographer = usePhotographerProfile;