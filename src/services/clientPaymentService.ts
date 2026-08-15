import api from "@/lib/api";

export type PaymentType = "online" | "onsite" | string;

export interface ClientPayment {
  id: string;
  bookingId: string;
  type: PaymentType;
  method: string;
  plan: "half" | "full" | string;
  amount: number;
  referenceNumber: string | null;
  payerName: string | null;
  paymentDate: string; // "YYYY-MM-DD"
  notes: string | null;
  matchingStatus: string;
  verifiedAt: string | null;
  verificationNotes: string | null;
  createdAt: string;
}

type RawPayment = {
  id: number;
  booking_id: number;
  booking: { id: number; status: string; payment_status: string };
  type: string;
  method: string;
  plan: string;
  amount: number | string;
  reference_number: string | null;
  payer_name: string | null;
  payment_date: string;
  notes: string | null;
  matching_status: string;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
};

function toClientPayment(raw: RawPayment): ClientPayment {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id),
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
    createdAt: raw.created_at,
  };
}

export const clientPaymentService = {
  list: async (): Promise<ClientPayment[]> => {
    const res = await api.get("/client/payments");
    return (res.data.data as RawPayment[]).map(toClientPayment);
  },
};