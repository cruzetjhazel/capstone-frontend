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

export function useAdminRecordRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, input }: {
      paymentId: number;
      input: { refund_status: "pending" | "partial" | "full" | "denied"; refund_amount?: number; refund_notes?: string };
    }) => adminPaymentService.recordRefund(paymentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });
}