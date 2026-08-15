import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";

export function usePayments() {
  return useQuery({
    queryKey: ["photographerPayments"],
    queryFn: () => paymentService.list(),
    staleTime: 60_000,
  });
}