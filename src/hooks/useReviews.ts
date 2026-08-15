import { useQuery } from "@tanstack/react-query";
import { reviewService } from "@/services/reviewService";

export function useReviews() {
  return useQuery({
    queryKey: ["photographerReviews"],
    queryFn: () => reviewService.list(),
    staleTime: 60_000,
  });
}