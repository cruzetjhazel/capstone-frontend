import api from "@/lib/api";
import type { BookingPaymentInfo, SubmitPaymentPayload } from "@/api/types/booking";

export const bookingApi = {
  list: (clientEmail?: string) =>
    api.get("/bookings", { params: clientEmail ? { client_email: clientEmail } : undefined }),

  getById: (id: string) =>
    api.get(`/bookings/${id}`),

  create: (payload: Record<string, unknown>) =>
    api.post("/bookings", payload),

  update: (id: string, payload: Record<string, unknown>) =>
    api.patch(`/bookings/${id}`, payload),

  approve: (id: string) =>
    api.post(`/bookings/${id}/approve`),

  getStudioPaymentInfo: (studioId: string) =>
    api.get<BookingPaymentInfo>(`/studios/${studioId}/payment`),

  submitPayment: (bookingId: string, data: FormData) =>
    api.post(`/bookings/${bookingId}/payment`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

/** Helper to build FormData for payment submission. */
export function buildPaymentFormData(payload: SubmitPaymentPayload): FormData {
  const fd = new FormData();
  fd.append("reference_code", payload.reference_code);
  fd.append("amount_paid", String(payload.amount_paid));
  fd.append("sender_name", payload.sender_name);
  fd.append("paid_at", payload.paid_at);
  fd.append("receipt", payload.receipt);
  return fd;
}
