import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  availabilityWindowService,
  type AvailabilityWindowPayload,
} from "@/services/availabilityWindowService";

export function useAvailabilityWindows() {
  return useQuery({
    queryKey: ["availabilityWindows"],
    queryFn: () => availabilityWindowService.list(),
    staleTime: 60_000,
  });
}

export function useCreateAvailabilityWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvailabilityWindowPayload) => availabilityWindowService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availabilityWindows"] }),
  });
}

export function useUpdateAvailabilityWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AvailabilityWindowPayload }) =>
      availabilityWindowService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availabilityWindows"] }),
  });
}

export function useDeleteAvailabilityWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => availabilityWindowService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availabilityWindows"] }),
  });
}