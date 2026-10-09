import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { photographerBookingService } from "@/services/photographerBookingService";

export function usePhotographerBookings() {
  return useQuery({
    queryKey: ["photographerBookings"],
    queryFn: () => photographerBookingService.list(),
    staleTime: 30_000,
  });
}

export function usePhotographerBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["photographerBooking", id],
    queryFn: () => photographerBookingService.getById(id!),
    enabled: !!id,
  });
}

// Only fetched for cancelled bookings — see StudioBookingDetail, which
// gates this on booking.status === "cancelled" so we don't fire it for
// every booking detail view.
export function useAccommodationCandidates(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["accommodationCandidates", id],
    queryFn: () => photographerBookingService.accommodationCandidates(id!),
    enabled: !!id && enabled,
  });
}

function useBookingMutation<TArgs>(mutationFn: (args: TArgs) => Promise<any>, getId: (args: TArgs) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ["photographerBookings"] });
      qc.invalidateQueries({ queryKey: ["photographerBooking", getId(args)] });
    },
  });
}

export function useAcceptBooking() {
  return useBookingMutation((id: string) => photographerBookingService.accept(id), (id) => id);
}

export function useRejectBooking() {
  return useBookingMutation(
    ({ id, reason }: { id: string; reason: string }) => photographerBookingService.reject(id, reason),
    ({ id }) => id
  );
}

export function useApproveCancellation() {
  return useBookingMutation((id: string) => photographerBookingService.approveCancellation(id), (id) => id);
}

export function useRejectCancellation() {
  return useBookingMutation((id: string) => photographerBookingService.rejectCancellation(id), (id) => id);
}

export function useAccommodateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, candidateBookingId }: { id: string; candidateBookingId: string }) =>
      photographerBookingService.accommodate(id, candidateBookingId),
    onSuccess: (_, { id, candidateBookingId }) => {
      qc.invalidateQueries({ queryKey: ["photographerBookings"] });
      qc.invalidateQueries({ queryKey: ["photographerBooking", id] });
      qc.invalidateQueries({ queryKey: ["photographerBooking", candidateBookingId] });
      qc.invalidateQueries({ queryKey: ["accommodationCandidates", id] });
    },
  });
}

export function useApproveReschedule() {
  return useBookingMutation((id: string) => photographerBookingService.approveReschedule(id), (id) => id);
}

export function useRejectReschedule() {
  return useBookingMutation((id: string) => photographerBookingService.rejectReschedule(id), (id) => id);
}

export function useApproveModification() {
  return useBookingMutation((id: string) => photographerBookingService.approveModification(id), (id) => id);
}

export function useRejectModification() {
  return useBookingMutation((id: string) => photographerBookingService.rejectModification(id), (id) => id);
}

export function useCancelBookingAsPhotographer() {
  return useBookingMutation(
    ({ id, reason }: { id: string; reason: string }) => photographerBookingService.cancelBooking(id, reason),
    ({ id }) => id
  );
}

export function useApproveExtension() {
  return useBookingMutation(
    ({ id, extensionId }: { id: string; extensionId: string }) => photographerBookingService.approveExtension(id, extensionId),
    ({ id }) => id
  );
}

export function useDeclineExtension() {
  return useBookingMutation(
    ({ id, extensionId, reason }: { id: string; extensionId: string; reason?: string }) =>
      photographerBookingService.declineExtension(id, extensionId, reason),
    ({ id }) => id
  );
}

export function useUpdateServiceTracker() {
  return useBookingMutation(
    ({ id, status }: { id: string; status: string }) => photographerBookingService.updateServiceTracker(id, status),
    ({ id }) => id
  );
}

export function useConfirmShoot() {
  return useBookingMutation((id: string) => photographerBookingService.confirmShoot(id), (id) => id);
}

export function useMarkServiceCompleted() {
  return useBookingMutation((id: string) => photographerBookingService.markCompleted(id), (id) => id);
}

export function useRecordOnsitePayment() {
  return useBookingMutation(
    ({ id, amount, paymentDate, notes }: { id: string; amount: number; paymentDate: string; notes?: string }) =>
      photographerBookingService.recordOnsitePayment(id, { amount, payment_date: paymentDate, notes }),
    ({ id }) => id
  );
}


export function useReportClientNoShow() {
  return useBookingMutation(
    ({ id, notes }: { id: string; notes?: string }) => photographerBookingService.reportNonCompletion(id, notes),
    ({ id }) => id
  );
}

export function useDisputeStudioNonCompletion() {
  return useBookingMutation(
    ({ id, reason }: { id: string; reason: string }) => photographerBookingService.disputeNonCompletion(id, reason),
    ({ id }) => id
  );
}