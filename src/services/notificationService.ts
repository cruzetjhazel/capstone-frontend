import api from "@/lib/api";

export type NotificationType = "booking" | "payment" | "message" | "system";
export type NotificationActionKind = "pay" | null;

interface RawNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  booking_id: string | null;
  action: NotificationActionKind;
  read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  bookingId: string | null;
  action: NotificationActionKind;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function toAppNotification(raw: RawNotification): AppNotification {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description,
    time: formatRelativeTime(raw.created_at),
    read: raw.read,
    bookingId: raw.booking_id,
    action: raw.action,
  };
}

export const notificationService = {
  list: async (): Promise<AppNotification[]> => {
    const res = await api.get("/notifications");
    return (res.data.data as RawNotification[]).map(toAppNotification);
  },

  unreadCount: async (): Promise<number> => {
    const res = await api.get("/notifications/unread-count");
    return res.data.count as number;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post("/notifications/read-all");
  },
};