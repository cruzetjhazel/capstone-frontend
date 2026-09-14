import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService, type CreateBookingPayload } from "@/services/bookingService";

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getById(id!),
    enabled: !!id,
  });
}

export function useBookings(clientEmail?: string) {
  return useQuery({
    queryKey: ["bookings", clientEmail],
    queryFn: () => bookingService.list(clientEmail),
    staleTime: 30_000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useApproveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingService.approve(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRequestBookingCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingService.requestCancellation(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRequestBookingReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eventDate, startTime, reason }: { id: string; eventDate: string; startTime: string; reason: string }) =>
      bookingService.reschedule(id, eventDate, startTime, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRequestBookingModification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type, reason }: { id: string; type: string; reason: string }) =>
      bookingService.requestModification(id, type, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}