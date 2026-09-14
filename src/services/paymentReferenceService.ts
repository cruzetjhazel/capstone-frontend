import api from "@/lib/api";

export interface PaymentReference {
  id: string;
  referenceNumber: string;
  amountReceived: number;
  paymentDate: string; // "YYYY-MM-DD"
  status: "available" | "matched" | "used" | "invalidated";
  createdAt: string;
}

type RawReference = {
  id: number;
  reference_number: string;
  amount_received: number | string;
  payment_date: string;
  status: PaymentReference["status"];
  created_at: string;
};

function toReference(raw: RawReference): PaymentReference {
  return {
    id: String(raw.id),
    referenceNumber: raw.reference_number,
    amountReceived: Number(raw.amount_received),
    paymentDate: raw.payment_date,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

export interface RegisterReferencePayload {
  reference_number: string;
  amount_received: number;
  payment_date: string; // "YYYY-MM-DD"
}

export const paymentReferenceService = {
  list: async (): Promise<PaymentReference[]> => {
    const res = await api.get("/photographer/payment-references");
    return (res.data.data as RawReference[]).map(toReference);
  },

  register: async (payload: RegisterReferencePayload): Promise<PaymentReference> => {
    const res = await api.post("/photographer/payment-references", payload);
    return toReference(res.data.data);
  },

  invalidate: async (id: string): Promise<PaymentReference> => {
    const res = await api.post(`/photographer/payment-references/${id}/invalidate`);
    return toReference(res.data.data);
  },
};