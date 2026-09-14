import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingHourService, type BookingHourPayload } from "@/services/bookingHourService";

export function useBookingHours() {
  return useQuery({
    queryKey: ["bookingHours"],
    queryFn: () => bookingHourService.list(),
    staleTime: 60_000,
  });
}

export function useCreateBookingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BookingHourPayload) => bookingHourService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookingHours"] }),
  });
}

export function useUpdateBookingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BookingHourPayload }) =>
      bookingHourService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookingHours"] }),
  });
}

export function useDeleteBookingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingHourService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookingHours"] }),
  });
}

export function useUpdateSlotInterval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutes: number) => bookingHourService.updateInterval(minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookingHours"] }),
  });
}