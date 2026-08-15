import api from "@/lib/api";

export type PhotographerBookingStatus =
  | "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed" | "expired";
export type PhotographerPaymentStatus =
  | "pending" | "pending_verification" | "partially_paid" | "fully_paid" | "failed" | "cancelled";

interface SnapshotComponent {
  type: string;
  label: string;
  price_addition: number | string;
}

type RawStudioBooking = {
  id: number;
  client: { id: number; name: string };
  photographer: { id: number; name: string };
  is_custom_package: boolean;
  package_snapshot: { name?: string; description?: string; price?: number | string } | null;
  custom_package_snapshot: { base_fee?: number | string; components?: SnapshotComponent[] } | null;
  add_ons_snapshot: { name: string; price: number | string }[] | null;
  event_type: string;
  custom_event_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_type: string;
  event_address: string | null;
  guest_count: number | null;
  special_requests: string | null;
  coverage_area_notice: boolean;
  subtotal: string;
  total_price: string;
  status: PhotographerBookingStatus;
  hold_expires_at: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  cancellation_requested_at: string | null;
  cancellation_decision: "approved" | "rejected" | null;
  cancellation_decided_at: string | null;
  payment_plan: "half" | "full" | null;
  payment_status: PhotographerPaymentStatus | null;
  remaining_balance: number;
  // NOTE: exact case values not confirmed against the real ServiceTrackerStatus
  // PHP enum — read as a plain string, not narrowed to a union.
  service_status: string | null;
  service_status_updated_at: string | null;
  created_at: string;
};

export interface StudioBookingRecord {
  id: string;
  clientId: string;
  clientName: string;
  isCustomPackage: boolean;
  packageName: string;
  eventType: string;
  customEventType: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  locationType: string;
  eventAddress: string | null;
  guestCount: number | null;
  specialRequests: string | null;
  coverageAreaNotice: boolean;
  subtotal: number;
  totalPrice: number;
  status: PhotographerBookingStatus;
  rejectionReason: string | null;
  cancellationReason: string | null;
  hasActiveCancellationRequest: boolean;
  paymentPlan: "half" | "full" | null;
  paymentStatus: PhotographerPaymentStatus | null;
  remainingBalance: number;
  amountPaid: number;
  serviceStatus: string | null;
  addOns: { name: string; price: number }[];
  customBuild?: { baseFee: number; components: { type: string; label: string; price: number }[] };
  createdAt: string;
  holdExpiresAt: string | null;
}

function toStudioBooking(raw: RawStudioBooking): StudioBookingRecord {
  const totalPrice = Number(raw.total_price);
  const remainingBalance = raw.remaining_balance;

  return {
    id: String(raw.id),
    clientId: String(raw.client.id),
    clientName: raw.client.name,
    isCustomPackage: raw.is_custom_package,
    packageName: raw.is_custom_package ? "Custom Package" : (raw.package_snapshot?.name ?? "Package"),
    eventType: raw.custom_event_type || raw.event_type,
    customEventType: raw.custom_event_type,
    date: raw.event_date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    locationType: raw.location_type,
    eventAddress: raw.event_address,
    guestCount: raw.guest_count,
    specialRequests: raw.special_requests,
    coverageAreaNotice: raw.coverage_area_notice,
    subtotal: Number(raw.subtotal),
    totalPrice,
    status: raw.status,
    rejectionReason: raw.rejection_reason,
    cancellationReason: raw.cancellation_reason,
    hasActiveCancellationRequest: !!raw.cancellation_requested_at && !raw.cancellation_decision,
    paymentPlan: raw.payment_plan,
    paymentStatus: raw.payment_status,
    remainingBalance,
    amountPaid: Math.max(0, totalPrice - remainingBalance),
    serviceStatus: raw.service_status,
    addOns: (raw.add_ons_snapshot ?? []).map((a) => ({ name: a.name, price: Number(a.price) })),
    customBuild: raw.is_custom_package
      ? {
          baseFee: Number(raw.custom_package_snapshot?.base_fee ?? 0),
          components: (raw.custom_package_snapshot?.components ?? []).map((c) => ({
            type: c.type,
            label: c.label,
            price: Number(c.price_addition),
          })),
        }
      : undefined,
    createdAt: raw.created_at,
    holdExpiresAt: raw.hold_expires_at,
  };
}

export const photographerBookingService = {
  list: async (): Promise<StudioBookingRecord[]> => {
    const res = await api.get("/photographer/bookings");
    return (res.data.data as RawStudioBooking[]).map(toStudioBooking);
  },

  getById: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.get(`/photographer/bookings/${id}`);
    return toStudioBooking(res.data.data);
  },

  accept: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/accept`);
    return toStudioBooking(res.data.data);
  },

  reject: async (id: string, reason: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/reject`, { reason });
    return toStudioBooking(res.data.data);
  },

  approveCancellation: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/cancellation/approve`);
    return toStudioBooking(res.data.data);
  },

  rejectCancellation: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/cancellation/reject`);
    return toStudioBooking(res.data.data);
  },

  // NOTE: `status` must match the real ServiceTrackerStatus enum cases —
  // unconfirmed, currently sourced from the frontend's local trackingStages ids.
  updateServiceTracker: async (id: string, status: string): Promise<StudioBookingRecord> => {
    const res = await api.patch(`/photographer/bookings/${id}/service-tracker`, { service_status: status });
    return toStudioBooking(res.data.data);
  },

  /**
   * Records the onsite remaining balance for a Half-Payment booking (§8.9).
   * Matches RecordOnsitePaymentRequest exactly: amount must equal the
   * booking's current remaining_balance (fetch via getById first), plus a
   * required payment_date (Y-m-d) and optional notes.
   */
  recordOnsitePayment: async (
    id: string,
    payload: { amount: number; payment_date: string; notes?: string }
  ): Promise<void> => {
    await api.post(`/photographer/bookings/${id}/payments/onsite`, payload);
  },
};