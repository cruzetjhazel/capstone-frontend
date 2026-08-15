import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { photographerAddOnService, type AddOnInput } from "@/services/photographerAddOnService";

const ADDONS_KEY = ["photographer", "add-ons"] as const;

export function usePhotographerAddOns() {
  return useQuery({ queryKey: ADDONS_KEY, queryFn: photographerAddOnService.list });
}

function useInvalidatingMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDONS_KEY }),
  });
}

export function useCreateAddOn() {
  return useInvalidatingMutation((input: AddOnInput) => photographerAddOnService.create(input));
}
export function useUpdateAddOn() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: AddOnInput }) =>
    photographerAddOnService.update(id, input));
}
export function useArchiveAddOn() {
  return useInvalidatingMutation((id: string) => photographerAddOnService.archive(id));
}
export function useRestoreAddOn() {
  return useInvalidatingMutation((id: string) => photographerAddOnService.restore(id));
}
export function useDeleteAddOn() {
  return useInvalidatingMutation((id: string) => photographerAddOnService.destroy(id));
}