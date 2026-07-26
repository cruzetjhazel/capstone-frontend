import api from "@/lib/api";

export type NotificationType = "booking" | "payment" | "message" | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  bookingId?: number | string;
  action?: "pay";
}

/**
 * Backend notification "type" values are namespaced strings like
 * "booking.confirmed" or "payment.rejected" (see app/Notifications/**).
 * We derive the UI category from the prefix and build a readable
 * title from the suffix — there is no separate title field server-side,
 * only `type` and a pre-formatted `message`.
 */
function categoryOf(rawType: string): NotificationType {
  const prefix = rawType.split(".")[0];
  return prefix === "booking" || prefix === "payment" ? prefix : "system";
}

function titleOf(rawType: string): string {
  const [prefix, ...rest] = rawType.split(".");
  const label = rest.join(" ").replace(/_/g, " ");
  const category = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  return label ? `${category} ${label.replace(/\b\w/g, (c) => c.toUpperCase())}` : category;
}

function fromApi(raw: any): AppNotification {
  const rawType: string = raw.type ?? raw.data?.type ?? "system";
  const data = raw.data ?? {};
  return {
    id: raw.id,
    type: categoryOf(rawType),
    title: titleOf(rawType),
    description: data.message ?? "",
    time: raw.created_at ? new Date(raw.created_at).toLocaleString() : "",
    read: Boolean(raw.read_at),
    bookingId: data.booking_id,
    // "Payment required" is the one case the UI currently offers a quick action for.
    action: rawType === "booking.accepted" ? "pay" : undefined,
  };
}

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    const { data } = await api.get("/notifications");
    const items = data?.data?.data ?? [];
    return items.map(fromApi);
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/read-all");
  },
};