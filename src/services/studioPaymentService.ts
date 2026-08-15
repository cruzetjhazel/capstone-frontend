// If your shared axios instance isn't a default export at "@/lib/api",
// adjust this one import line to match.
import api from "@/lib/api";

export type PaymentType = "online" | "onsite";
export type PaymentPlan = "half" | "full";
export type PaymentMatchingStatus =
  | "submitted"
  | "pending_match"
  | "matched"
  | "not_matched"
  | "manually_verified"
  | "rejected";
export type BookingStatus = "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed";
export type BookingPaymentStatus =
  | "pending"
  | "pending_verification"
  | "partially_paid"
  | "fully_paid"
  | "failed"
  | "cancelled";

export interface PaymentRecord {
  id: number;
  booking_id: number;
  booking: {
    id: number;
    status: BookingStatus;
    payment_status: BookingPaymentStatus;
  };
  client: { id: number; name: string };
  event_type: string;
  type: PaymentType;
  method: string;
  plan: PaymentPlan;
  amount: string; // decimal cast — comes back as a string, e.g. "1234.00"
  reference_number: string | null;
  payer_name: string | null;
  payment_date: string; // Y-m-d
  notes: string | null;
  matching_status: PaymentMatchingStatus;
  verified_by: number | null;
  verified_at: string | null;
  verification_action: string | null;
  verification_notes: string | null;
  created_at: string;
}

export interface BookingDetail {
  id: number;
  client: { id: number; name: string };
  photographer: { id: number; name: string };
  is_custom_package: boolean;
  package_snapshot: { name?: string; description?: string; included_items?: string[]; price?: number | string } | null;
  custom_package_snapshot: { base_fee?: number | string; components?: Array<Record<string, unknown>> } | null;
  add_ons_snapshot: Array<Record<string, unknown>> | null;
  event_type: string;
  custom_event_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location_type: string;
  event_address: string | null;
  guest_count: number | null;
  special_requests: string | null;
  subtotal: string;
  total_price: string;
  status: BookingStatus;
  payment_plan: PaymentPlan | null;
  payment_status: BookingPaymentStatus | null;
  remaining_balance: number;
  service_status: string | null;
  created_at: string;
}

export const studioPaymentService = {
  async list(): Promise<PaymentRecord[]> {
    const { data } = await api.get("/photographer/payments");
    return data.data;
  },

  /** Full booking context for the Details modal, and the exact remaining balance for onsite recording. */
  async getBooking(bookingId: number): Promise<BookingDetail> {
    const { data } = await api.get(`/photographer/bookings/${bookingId}`);
    return data.data;
  },

  async recordOnsitePayment(
    bookingId: number,
    payload: { amount: number; payment_date: string; notes?: string }
  ): Promise<PaymentRecord> {
    const { data } = await api.post(`/photographer/bookings/${bookingId}/payments/onsite`, payload);
    return data.data;
  },

  async verifyPayment(paymentId: number, notes?: string): Promise<PaymentRecord> {
    const { data } = await api.post(`/photographer/payments/${paymentId}/verify`, { notes });
    return data.data;
  },

  async rejectPayment(paymentId: number, notes: string): Promise<PaymentRecord> {
    const { data } = await api.post(`/photographer/payments/${paymentId}/reject`, { notes });
    return data.data;
  },
};