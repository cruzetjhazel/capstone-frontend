import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService, type BookingRecord } from "@/services/bookingService";

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
    mutationFn: (booking: BookingRecord) => bookingService.create(booking),
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
