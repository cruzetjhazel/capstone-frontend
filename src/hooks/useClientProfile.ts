import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clientProfileService,
  type UpdateClientProfilePayload,
  type ChangePasswordPayload,
} from "@/services/clientProfileService";

export function useClientProfile() {
  return useQuery({
    queryKey: ["clientProfile"],
    queryFn: () => clientProfileService.get(),
    staleTime: 60_000,
  });
}

export function useUpdateClientProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateClientProfilePayload) => clientProfileService.update(payload),
    onSuccess: (profile) => {
      qc.setQueryData(["clientProfile"], profile);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => clientProfileService.changePassword(payload),
  });
}

export function useDeactivateAccount() {
  return useMutation({
    mutationFn: (confirmation: string) => clientProfileService.deactivate(confirmation),
  });
}