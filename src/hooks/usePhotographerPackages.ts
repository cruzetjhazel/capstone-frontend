import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { photographerPackageService, type PackageInput } from "@/services/photographerPackageService";

const PACKAGES_KEY = ["photographer", "packages"] as const;

export function usePhotographerPackages() {
  return useQuery({ queryKey: PACKAGES_KEY, queryFn: photographerPackageService.list });
}

function useInvalidatingMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PACKAGES_KEY }),
  });
}

export function useCreatePackage() {
  return useInvalidatingMutation((input: PackageInput) => photographerPackageService.create(input));
}
export function useUpdatePackage() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: PackageInput }) =>
    photographerPackageService.update(id, input));
}
export function usePublishPackage() {
  return useInvalidatingMutation((id: string) => photographerPackageService.publish(id));
}
export function useRevertPackageToDraft() {
  return useInvalidatingMutation((id: string) => photographerPackageService.revertToDraft(id));
}
export function useArchivePackage() {
  return useInvalidatingMutation((id: string) => photographerPackageService.archive(id));
}
export function useRestorePackage() {
  return useInvalidatingMutation((id: string) => photographerPackageService.restore(id));
}
export function useDeletePackage() {
  return useInvalidatingMutation((id: string) => photographerPackageService.destroy(id));
}