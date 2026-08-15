import { useQuery } from "@tanstack/react-query";
import { activityLogService } from "@/services/activityLogService";

export function useActivityLogs() {
  return useQuery({
    queryKey: ["activityLogs"],
    queryFn: () => activityLogService.list(),
    staleTime: 30_000,
  });
}