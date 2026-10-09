import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService, type AppNotification } from "@/services/notificationService";

const LIST_KEY = ["notifications"] as const;
const UNREAD_KEY = ["notifications", "unread-count"] as const;

export function useNotifications(email: string | undefined, limit = 50) {
  return useQuery({
    queryKey: [...LIST_KEY, email, limit],
    queryFn: () => notificationService.list(limit),
    enabled: !!email,
    staleTime: 15_000,
    placeholderData: keepPreviousData, // keeps the list on screen while "load older" fetches
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
    // Flip the notification to "read" on screen immediately, then sync with the server.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: [...LIST_KEY, email] });
      const snapshots = qc.getQueriesData<AppNotification[]>({ queryKey: [...LIST_KEY, email] });
      const wasUnread = snapshots.some(([, list]) => list?.some((n) => n.id === id && !n.read));

      qc.setQueriesData<AppNotification[]>({ queryKey: [...LIST_KEY, email] }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      if (wasUnread) {
        qc.setQueryData<number>([...UNREAD_KEY, email], (old) => Math.max(0, (old ?? 1) - 1));
      }
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: invalidate,
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