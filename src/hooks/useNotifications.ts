import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";

const LIST_KEY = ["notifications"] as const;
const UNREAD_KEY = ["notifications", "unread-count"] as const;

export function useNotifications(email: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, email],
    queryFn: () => notificationService.list(),
    enabled: !!email,
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount(email: string | undefined) {
  return useQuery({
    queryKey: [...UNREAD_KEY, email],
    queryFn: () => notificationService.unreadCount(),
    enabled: !!email,
    staleTime: 15_000,
  });
}

export function useNotificationActions(email: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [...LIST_KEY, email] });
    qc.invalidateQueries({ queryKey: [...UNREAD_KEY, email] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: invalidate,
  });

  return {
    markRead: (id: string) => markReadMutation.mutateAsync(id),
    markAllRead: () => markAllReadMutation.mutateAsync(),
  };
}