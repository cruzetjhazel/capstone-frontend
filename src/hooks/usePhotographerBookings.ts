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

export function useUpdateServiceTracker() {
  return useBookingMutation(
    ({ id, status }: { id: string; status: string }) => photographerBookingService.updateServiceTracker(id, status),
    ({ id }) => id
  );
}

export function useRecordOnsitePayment() {
  return useBookingMutation(
    ({ id, amount }: { id: string; amount: number }) => photographerBookingService.recordOnsitePayment(id, amount),
    ({ id }) => id
  );
}