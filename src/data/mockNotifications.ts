export type NotificationType = "booking" | "payment" | "message" | "system";
export type NotificationAction = "pay" | "details";

export interface AppNotification {
  id: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
  action?: NotificationAction;
}

let notifications: AppNotification[] = [
  {
    id: "n-seed-1",
    userEmail: "client@example.com",
    type: "booking",
    title: "✅ Booking Approved",
    description: "HH Production approved BK-1042 (Wedding · 2026-04-20). Please settle your balance of ₱4,500 to lock the date.",
    time: "Just now",
    createdAt: new Date().toISOString(),
    read: false,
    bookingId: "BK-1042",
    action: "pay",
  },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function mockListNotifications(userEmail?: string): AppNotification[] {
  const list = userEmail
    ? notifications.filter((n) => n.userEmail === userEmail)
    : [...notifications];
  return list.map((n) => ({ ...n, time: formatRelativeTime(n.createdAt) }));
}

export function mockCreateNotification(
  n: Omit<AppNotification, "id" | "time" | "createdAt" | "read"> & { read?: boolean },
): AppNotification {
  const created: AppNotification = {
    ...n,
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    time: "Just now",
    read: n.read ?? false,
  };
  notifications = [created, ...notifications];
  return created;
}

export function mockMarkNotificationRead(id: string): void {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
}

export function mockMarkAllNotificationsRead(userEmail: string): void {
  notifications = notifications.map((n) =>
    n.userEmail === userEmail ? { ...n, read: true } : n,
  );
}

export function mockDeleteNotification(id: string): void {
  notifications = notifications.filter((n) => n.id !== id);
}

export function mockClearNotifications() {
  notifications = [];
}
