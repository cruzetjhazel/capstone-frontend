import { useQuery } from "@tanstack/react-query";
import { photographerService } from "@/services/photographerService";
import type { PhotographerListParams } from "@/api/types/photographer";

export function usePhotographers(params?: PhotographerListParams) {
  return useQuery({
    queryKey: ["photographers", params],
    queryFn: () => photographerService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePhotographer(id: string | undefined) {
  return useQuery({
    queryKey: ["photographer", id],
    queryFn: () => photographerService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedPhotographers() {
  return useQuery({
    queryKey: ["photographers", "featured"],
    queryFn: () => photographerService.featured(),
    staleTime: 10 * 60 * 1000,
  });
}
