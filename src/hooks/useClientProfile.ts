import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blockedDateService, type BlockedDatePayload } from "@/services/blockedDateService";

export function useBlockedDates() {
  return useQuery({
    queryKey: ["blockedDates"],
    queryFn: () => blockedDateService.list(),
    staleTime: 60_000,
  });
}

export function useCreateBlockedDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BlockedDatePayload) => blockedDateService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blockedDates"] }),
  });
}

export function useDeleteBlockedDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blockedDateService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blockedDates"] }),
  });
}