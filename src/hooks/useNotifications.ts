import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";

export function useNotifications(userEmail?: string) {
  return useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: () => notificationService.list(userEmail),
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
      if (userEmail) await notificationService.markAllRead(userEmail);
      invalidate();
    },
    delete: async (id: string) => {
      await notificationService.delete(id);
      invalidate();
    },
  };
}

export function useMarkAllNotificationsRead(userEmail?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(userEmail!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userEmail] }),
  });
}
