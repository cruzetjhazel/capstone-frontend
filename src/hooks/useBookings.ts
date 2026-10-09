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

export function useReportBookingNonCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: "photographer_no_show" | "client_no_show"; notes?: string }) =>
      bookingService.reportNonCompletion(id, reason, notes),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDisputeBookingNonCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingService.disputeNonCompletion(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRequestBookingReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eventDate, startTime, reason, type }: { id: string; eventDate: string; startTime: string; reason: string; type?: "standard" | "weather" | "venue" | "agreed" }) =>
      bookingService.reschedule(id, eventDate, startTime, reason, type ?? "standard"),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRequestBookingModification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes, reason }: { id: string; changes: { guest_count?: number; event_address?: string; special_requests?: string }; reason: string }) =>
      bookingService.requestModification(id, changes, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// Start times a booking could be rescheduled to on a given date.
export function useRescheduleSlots(bookingId: string | undefined, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ["rescheduleSlots", bookingId, date],
    queryFn: () => bookingService.getRescheduleSlots(bookingId!, date),
    enabled: enabled && !!bookingId && !!date,
    staleTime: 0,
  });
}

export function useRequestBookingExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, additionalHours, scheduleId }: { id: string; additionalHours: number; scheduleId?: string | null }) =>
      bookingService.requestExtension(id, additionalHours, scheduleId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}