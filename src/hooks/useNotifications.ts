import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";

export function useNotifications(userEmail?: string) {
  return useQuery({
    // userEmail only scopes the cache key per signed-in user; the backend
    // itself scopes the list to the authenticated user via Sanctum.
    queryKey: ["notifications", userEmail],
    queryFn: () => notificationService.list(),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}

export function useNotificationActions(userEmail?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", userEmail] });

  return {
    markRead: async (id: string) => {
      await notificationService.markRead(id);
      invalidate();
    },
    markAllRead: async () => {
      await notificationService.markAllRead();
      invalidate();
    },
  };
}

export function useMarkAllNotificationsRead(userEmail?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userEmail] }),
  });
}