import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPaymentService } from "@/services/adminPaymentService";

export function useAdminPayments() {
  return useQuery({
    queryKey: ["admin", "payments"],
    queryFn: adminPaymentService.list,
  });
}

export function useAdminForceCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: number; reason?: string }) =>
      adminPaymentService.forceCancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });
}