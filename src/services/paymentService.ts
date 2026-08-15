import api from "@/lib/api";

export type PaymentPlan = "half" | "full";
export type PaymentMatchingStatus =
  | "submitted"
  | "pending_match"
  | "matched"
  | "not_matched"
  | "manually_verified"
  | "rejected";

export interface PhotographerPayment {
  id: string;
  bookingId: string;
  bookingStatus: string;
  bookingPaymentStatus: string;
  clientId: string;
  clientName: string;
  eventType: string;
  type: string; // "online" | "onsite"
  method: string;
  plan: PaymentPlan;
  amount: number;
  referenceNumber: string | null;
  payerName: string | null;
  paymentDate: string; // "YYYY-MM-DD"
  notes: string | null;
  matchingStatus: PaymentMatchingStatus;
  verifiedAt: string | null;
  verificationNotes: string | null;
}

type RawPayment = {
  id: number;
  booking_id: number;
  booking: { id: number; status: string; payment_status: string };
  client: { id: number; name: string };
  event_type: string;
  type: string;
  method: string;
  plan: PaymentPlan;
  amount: number | string;
  reference_number: string | null;
  payer_name: string | null;
  payment_date: string;
  notes: string | null;
  matching_status: PaymentMatchingStatus;
  verified_at: string | null;
  verification_notes: string | null;
};

function toPayment(raw: RawPayment): PhotographerPayment {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id),
    bookingStatus: raw.booking.status,
    bookingPaymentStatus: raw.booking.payment_status,
    clientId: String(raw.client.id),
    clientName: raw.client.name,
    eventType: raw.event_type,
    type: raw.type,
    method: raw.method,
    plan: raw.plan,
    amount: Number(raw.amount),
    referenceNumber: raw.reference_number,
    payerName: raw.payer_name,
    paymentDate: raw.payment_date,
    notes: raw.notes,
    matchingStatus: raw.matching_status,
    verifiedAt: raw.verified_at,
    verificationNotes: raw.verification_notes,
  };
}

export const paymentService = {
  list: async (): Promise<PhotographerPayment[]> => {
    const res = await api.get("/photographer/payments");
    return (res.data.data as RawPayment[]).map(toPayment);
  },

  /**
   * Manually confirms a GCash payment that failed automatic reference
   * matching (matching_status "not_matched"). Confirms the booking too.
   */
  verify: async (paymentId: string, notes?: string): Promise<PhotographerPayment> => {
    const res = await api.post(`/photographer/payments/${paymentId}/verify`, { notes });
    return toPayment(res.data.data);
  },

  /** Rejects an unmatched payment so the client can resubmit. Notes required. */
  reject: async (paymentId: string, notes: string): Promise<PhotographerPayment> => {
    const res = await api.post(`/photographer/payments/${paymentId}/reject`, { notes });
    return toPayment(res.data.data);
  },
};