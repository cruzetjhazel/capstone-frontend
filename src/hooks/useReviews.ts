import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewService, type SubmitReviewPayload } from "@/services/reviewService";

export function useReviews() {
  return useQuery({
    queryKey: ["photographerReviews"],
    queryFn: () => reviewService.list(),
    staleTime: 60_000,
  });
}

// Client-side: the current client's own submitted reviews. Used to derive
// "already reviewed" per booking, since the booking resource carries no
// review flag of its own.
export function useMyReviews() {
  return useQuery({
    queryKey: ["myReviews"],
    queryFn: () => reviewService.listMine(),
    staleTime: 30_000,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) => reviewService.submit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myReviews"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}