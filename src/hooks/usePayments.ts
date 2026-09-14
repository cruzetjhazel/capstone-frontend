import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";

export function usePayments() {
  return useQuery({
    queryKey: ["photographerPayments"],
    queryFn: () => paymentService.list(),
    staleTime: 60_000,
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, notes }: { paymentId: string; notes?: string }) =>
      paymentService.verify(paymentId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photographerPayments"] });
      // usePhotographerBookings.ts wasn't included in the upload, so its
      // exact query key is unknown — invalidating everything guarantees the
      // booking card refreshes too. Swap this for the real key if you'd
      // rather keep it targeted.
      qc.invalidateQueries();
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, notes }: { paymentId: string; notes: string }) =>
      paymentService.reject(paymentId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photographerPayments"] });
      qc.invalidateQueries();
    },
  });
}