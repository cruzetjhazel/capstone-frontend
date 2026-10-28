import { useQuery } from "@tanstack/react-query";
import { activityLogService } from "@/services/activityLogService";

export function useActivityLogs(scope: "photographer" | "client" = "photographer") {
  return useQuery({
    queryKey: ["activityLogs", scope],
    queryFn: () => activityLogService.list(scope),
    staleTime: 30_000,
  });
}