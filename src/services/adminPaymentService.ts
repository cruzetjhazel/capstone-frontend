import api, { getApiErrorMessage } from "@/lib/api";

export type PaymentMatchingStatus =
  | "submitted"
  | "pending_match"
  | "matched"
  | "not_matched"
  | "manually_verified"
  | "rejected";

export type PaymentType = "online" | "onsite";
export type PaymentPlan = "half" | "full";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "expired";

export type BookingPaymentStatus =
  | "pending"
  | "pending_verification"
  | "partially_paid"
  | "fully_paid"
  | "failed"
  | "cancelled";

export type RefundStatus = "none" | "pending" | "partial" | "full" | "denied";

export interface AdminPayment {
  id: number;
  bookingId: number;
  booking: {
    id: number;
    status: BookingStatus;
    paymentStatus: BookingPaymentStatus;
  };
  client: { id: number; name: string };
  eventType: string;
  type: PaymentType;
  method: string | null;
  plan: PaymentPlan;
  amount: number;
  referenceNumber: string;
  payerName: string;
  paymentDate: string; // Y-m-d
  notes: string | null;
  matchingStatus: PaymentMatchingStatus;
  verifiedBy: number | null;
  verifiedAt: string | null;
  verificationAction: string | null;
  verificationNotes: string | null;
  refundStatus: RefundStatus;
  refundAmount: number | null;
  refundNotes: string | null;
  refundedAt: string | null;
  createdAt: string;
}

interface RawPayment {
  id: number;
  booking_id: number;
  booking: { id: number; status: string; payment_status: string };
  client: { id: number; name: string };
  event_type: string;
  type: string;
  method: string | null;
  plan: string;
  amount: string | number;
  reference_number: string;
  payer_name: string;
  payment_date: string;
  notes: string | null;
  matching_status: string;
  verified_by: number | null;
  verified_at: string | null;
  verification_action: string | null;
  verification_notes: string | null;
  refund_status: string;
  refund_amount: string | number | null;
  refund_notes: string | null;
  refunded_at: string | null;
  created_at: string;
}

function mapPayment(raw: RawPayment): AdminPayment {
  return {
    id: raw.id,
    bookingId: raw.booking_id,
    booking: {
      id: raw.booking.id,
      status: raw.booking.status as BookingStatus,
      paymentStatus: raw.booking.payment_status as BookingPaymentStatus,
    },
    client: raw.client,
    eventType: raw.event_type,
    type: raw.type as PaymentType,
    method: raw.method,
    plan: raw.plan as PaymentPlan,
    amount: Number(raw.amount),
    referenceNumber: raw.reference_number,
    payerName: raw.payer_name,
    paymentDate: raw.payment_date,
    notes: raw.notes,
    matchingStatus: raw.matching_status as PaymentMatchingStatus,
    verifiedBy: raw.verified_by,
    verifiedAt: raw.verified_at,
    verificationAction: raw.verification_action,
    verificationNotes: raw.verification_notes,
    refundStatus: (raw.refund_status ?? "none") as RefundStatus,
    refundAmount: raw.refund_amount == null ? null : Number(raw.refund_amount),
    refundNotes: raw.refund_notes,
    refundedAt: raw.refunded_at,
    createdAt: raw.created_at,
  };
}

export const adminPaymentService = {
  async list(): Promise<AdminPayment[]> {
    const { data } = await api.get("/admin/payments");
    const rows: RawPayment[] = data?.data ?? [];
    return rows.map(mapPayment);
  },

  /** Admin override — force-cancels the booking this payment belongs to. */
  async forceCancelBooking(bookingId: number, reason?: string) {
    const { data } = await api.post(`/admin/bookings/${bookingId}/cancel`, {
      reason,
    });
    return data;
  },

  /**
   * Records (does not process) a refund decision for a payment — see
   * RecordPaymentRefundAction.php. amount is required for "partial"/"full".
   */
  async recordRefund(paymentId: number, input: { refund_status: Exclude<RefundStatus, "none">; refund_amount?: number; refund_notes?: string }): Promise<AdminPayment> {
    const { data } = await api.post(`/admin/payments/${paymentId}/refund`, input);
    return mapPayment(data.data);
  },
};

export { getApiErrorMessage };