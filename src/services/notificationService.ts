import { env } from "@/config/env";
import api from "@/lib/api";
import type { AppNotification } from "@/data/mockNotifications";
import { mockListNotifications, mockCreateNotification, mockMarkNotificationRead, mockMarkAllNotificationsRead, mockDeleteNotification } from "@/data/mockNotifications"
import type { BookingRecord } from "@/data/mockBookings";
import { bookingService } from "@/services/bookingService";

export type { AppNotification };

export const notificationService = {
  async list(userEmail?: string): Promise<AppNotification[]> {
    if (env.useMockApi) {
      return mockListNotifications(userEmail);
    }
    const { data } = await api.get<AppNotification[]>("/notifications", {
      params: userEmail ? { email: userEmail } : undefined,
    });
    return data;
  },

  async markRead(id: string): Promise<void> {
    if (env.useMockApi) {
      mockMarkNotificationRead(id);
      return;
    }
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(userEmail: string): Promise<void> {
    if (env.useMockApi) {
      mockMarkAllNotificationsRead(userEmail);
      return;
    }
    await api.post("/notifications/read-all", { email: userEmail });
  },

  async delete(id: string): Promise<void> {
    if (env.useMockApi) {
      mockDeleteNotification(id);
      return;
    }
    await api.delete(`/notifications/${id}`);
  },

  async notifyBookingApproved(booking: BookingRecord): Promise<AppNotification> {
    const payload = {
      userEmail: booking.clientEmail ?? booking.contactEmail,
      type: "booking" as const,
      title: "✅ Booking Approved",
      description: bookingService.formatBalanceMessage(booking),
      bookingId: booking.id,
      action: "pay" as const,
    };

    if (env.useMockApi) {
      return mockCreateNotification(payload);
    }
    const { data } = await api.post<AppNotification>("/notifications", payload);
    return data;
  },
};
