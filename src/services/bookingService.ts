import { env } from "@/config/env";
import { bookingApi, buildPaymentFormData } from "@/api/bookings";
import type { BookingPaymentInfo, SubmitPaymentPayload } from "@/api/types/booking";
import type { BookingRecord, BookingStatus } from "@/data/mockBookings";
import {
  mockGetBooking,
  mockListBookings,
  mockSaveBooking,
  mockUpdateBooking,
} from "@/data/mockBookings";
import { mockGetApprovedProfile } from "@/data/mockProfiles";
import { notificationService } from "@/services/notificationService";
import { formatPrice } from "@/data/photographers";

export type { BookingRecord, BookingStatus };

export const bookingService = {
  async list(clientEmail?: string): Promise<BookingRecord[]> {
    if (env.useMockApi) {
      return mockListBookings(clientEmail);
    }
    const { data } = await bookingApi.list(clientEmail);
    return data as BookingRecord[];
  },

  async getById(id: string): Promise<BookingRecord | undefined> {
    if (env.useMockApi) {
      return mockGetBooking(id);
    }
    try {
      const { data } = await bookingApi.getById(id);
      return data as BookingRecord;
    } catch {
      return undefined;
    }
  },

  async create(booking: BookingRecord): Promise<BookingRecord> {
    if (env.useMockApi) {
      return mockSaveBooking(booking);
    }
    const { data } = await bookingApi.create(booking as unknown as Record<string, unknown>);
    return data as BookingRecord;
  },

  async update(id: string, patch: Partial<BookingRecord>): Promise<BookingRecord | undefined> {
    if (env.useMockApi) {
      return mockUpdateBooking(id, patch);
    }
    const { data } = await bookingApi.update(id, patch);
    return data as BookingRecord;
  },

  /** Studio approves booking — triggers balance-due notification. */
  async approve(id: string): Promise<BookingRecord | undefined> {
    const booking = env.useMockApi
      ? mockUpdateBooking(id, { status: "approved" })
      : (await bookingApi.approve(id)).data as BookingRecord;

    if (booking) {
      await notificationService.notifyBookingApproved(booking);
    }
    return booking;
  },

  async getStudioPaymentInfo(studioId: string, amountDue?: number): Promise<BookingPaymentInfo | null> {
    if (env.useMockApi) {
      const studio = mockGetApprovedProfile(studioId);
      if (!studio) return null;
      return {
        merchant_name: studio.name,
        merchant_qr: studio.gcashQR ?? `GCASH-${studioId}`,
        gcash_name: studio.gcashName,
        gcash_number: studio.gcashNumber,
        amount_due: amountDue ?? 0,
      };
    }
    try {
      const { data } = await bookingApi.getStudioPaymentInfo(studioId);
      return { ...data, amount_due: amountDue ?? data.amount_due };
    } catch {
      return null;
    }
  },

  async submitPayment(bookingId: string, payload: SubmitPaymentPayload) {
    if (env.useMockApi) {
      const receipt = {
        receipt_no: `RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
        ref_code: payload.reference_code,
        amount_paid: payload.amount_paid,
        sender_name: payload.sender_name,
        paid_at: payload.paid_at,
        merchant_name: "",
        merchant_qr: "",
        verified_at: new Date().toISOString(),
        receiptNo: `RCPT-${Math.floor(100000 + Math.random() * 900000)}`,
        refCode: payload.reference_code,
        amountPaid: payload.amount_paid,
        senderName: payload.sender_name,
        paidAt: payload.paid_at,
        verifiedAt: new Date().toISOString(),
      };
      mockUpdateBooking(bookingId, { status: "paid", receipt });
      return { verified: true, booking_id: bookingId };
    }
    const formData = buildPaymentFormData(payload);
    const { data } = await bookingApi.submitPayment(bookingId, formData);
    return data;
  },

  formatBalanceMessage(booking: BookingRecord): string {
    return `${booking.photographerName} approved ${booking.id} (${booking.eventType} · ${booking.date}). Please settle your balance of ${formatPrice(booking.dueNow)} to lock the date.`;
  },
};
