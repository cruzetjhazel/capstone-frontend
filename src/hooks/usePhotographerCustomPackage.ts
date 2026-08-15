import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  photographerCustomPackageService,
  type CustomPackageConfigInput,
  type CustomComponentInput,
} from "@/services/photographerCustomPackageService";

const CONFIG_KEY = ["photographer", "custom-package", "config"] as const;
const COMPONENTS_KEY = ["photographer", "custom-package", "components"] as const;

export function useCustomPackageConfig() {
  return useQuery({ queryKey: CONFIG_KEY, queryFn: photographerCustomPackageService.getConfig });
}
export function useCustomPackageComponents() {
  return useQuery({ queryKey: COMPONENTS_KEY, queryFn: photographerCustomPackageService.listComponents });
}

export function useUpdateCustomPackageConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomPackageConfigInput) => photographerCustomPackageService.updateConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

function useInvalidatingComponentMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMPONENTS_KEY }),
  });
}

export function useCreateCustomComponent() {
  return useInvalidatingComponentMutation((input: CustomComponentInput) =>
    photographerCustomPackageService.createComponent(input));
}
export function useUpdateCustomComponent() {
  return useInvalidatingComponentMutation(({ id, input }: { id: string; input: CustomComponentInput }) =>
    photographerCustomPackageService.updateComponent(id, input));
}
export function useArchiveCustomComponent() {
  return useInvalidatingComponentMutation((id: string) =>
    photographerCustomPackageService.archiveComponent(id));
}
export function useRestoreCustomComponent() {
  return useInvalidatingComponentMutation((id: string) =>
    photographerCustomPackageService.restoreComponent(id));
}