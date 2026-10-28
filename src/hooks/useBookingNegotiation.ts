import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/services/bookingService";
import { negotiationService, type BudgetRespondPayload } from "@/services/negotiationService";

// Refresh every cached booking / payment list or detail, whatever its exact query key is.
function useRefreshBookings() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey.some((part) => typeof part === "string" && /booking|payment/i.test(part)),
    });
}

// ---- Waitlist offers (client) ----

export function useAcceptSlotOffer() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (bookingId: string) => bookingService.acceptOffer(bookingId),
    onSuccess: refresh,
  });
}

/** bookingService.declineOffer already existed; this is the hook it was missing. */
export function useDeclineSlotOffer() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (bookingId: string) => bookingService.declineOffer(bookingId),
    onSuccess: refresh,
  });
}

// ---- Budget negotiation (client) ----

export function useSendBudgetRequest() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (v: { bookingId: string | number; amount: number; note?: string }) =>
      negotiationService.sendBudget(v.bookingId, v.amount, v.note),
    onSuccess: refresh,
  });
}

export function useAcceptBudgetTerms() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (bookingId: string | number) => negotiationService.acceptTerms(bookingId),
    onSuccess: refresh,
  });
}

export function useRejectBudgetTerms() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (bookingId: string | number) => negotiationService.rejectTerms(bookingId),
    onSuccess: refresh,
  });
}

// ---- Budget negotiation (photographer) ----

export function usePhotographerBudgetView(bookingId: string | number | undefined) {
  return useQuery({
    queryKey: ["photographer-booking-budget", String(bookingId)],
    queryFn: () => negotiationService.getPhotographerBooking(bookingId as string | number),
    enabled: bookingId != null,
    staleTime: 5_000,
    // While a request is open, keep checking so the page reacts when the client answers
    // (accepts or rejects the terms) without the photographer having to reload.
    refetchInterval: (query) => (query.state.data?.budget_request?.is_open ? 10_000 : false),
  });
}

export function useRespondToBudgetRequest() {
  const queryClient = useQueryClient();
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: (v: { bookingId: string | number; payload: BudgetRespondPayload }) =>
      negotiationService.respond(v.bookingId, v.payload),
    onSuccess: (_data, v) => {
      queryClient.invalidateQueries({ queryKey: ["photographer-booking-budget", String(v.bookingId)] });
      return refresh();
    },
  });
}