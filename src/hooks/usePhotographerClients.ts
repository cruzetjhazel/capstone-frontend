import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  photographerClientService,
  type WalkInClientInput,
} from "@/services/photographerClientService";

const CLIENTS_KEY = ["photographer", "clients"] as const;

export function usePhotographerClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: photographerClientService.list,
  });
}

export function useCreateWalkInClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WalkInClientInput) => photographerClientService.createWalkIn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useUpdateWalkInClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WalkInClientInput> }) =>
      photographerClientService.updateWalkIn(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useArchiveWalkInClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => photographerClientService.archiveWalkIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useRestoreWalkInClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => photographerClientService.restoreWalkIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useDeleteWalkInClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => photographerClientService.deleteWalkIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}