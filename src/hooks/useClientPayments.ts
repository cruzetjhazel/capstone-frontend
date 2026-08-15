import { useQuery } from "@tanstack/react-query";
import { clientPaymentService } from "@/services/clientPaymentService";

export function useClientPayments() {
  return useQuery({
    queryKey: ["clientPayments"],
    queryFn: () => clientPaymentService.list(),
    staleTime: 30_000,
  });
}

export function usePaymentsForBooking(bookingId: string | undefined) {
  const query = useClientPayments();
  return {
    ...query,
    data: bookingId ? (query.data ?? []).filter((p) => p.bookingId === bookingId) : [],
  };
}