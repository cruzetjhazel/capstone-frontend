import api from "@/lib/api";
import type { WalkInSource } from "@/services/photographerClientService";

/** A booking the photographer took outside the platform, for one of their walk-in clients. */
export interface ManualBookingInput {
  /** An existing walk-in client ("W-12" or "12"). Send this OR newClient, never both. */
  walkInClientId?: string;
  newClient?: { name: string; phone: string; email?: string | null; location?: string | null; source: WalkInSource };
  eventType: string;
  customEventType?: string | null;
  packageName?: string | null;
  eventDate: string; // YYYY-MM-DD (past dates allowed)
  startTime: string; // HH:mm
  endTime?: string | null; // HH:mm, empty = open-ended
  locationType: string;
  eventAddress?: string | null;
  guestCount?: number | null;
  notes?: string | null;
  totalPrice: number;
  amountPaid?: number;
  markCompleted?: boolean;
}

export type PhotographerBookingStatus =
  | "pending" | "confirmed" | "completed" | "cancelled" | "expired" | "no_show" | "waitlisted";
export type PhotographerPaymentStatus =
  | "pending" | "pending_verification" | "partially_paid" | "fully_paid" | "failed" | "cancelled";

interface SnapshotComponent {
  type: string;
  label: string;
  price_addition: number | string;
}

type RawStudioBooking = {
  id: number;
  client: { id: number | null; name: string; email?: string | null; email_verified?: boolean; is_walk_in?: boolean; phone?: string | null };
  photographer: { id: number; name: string };
  is_custom_package: boolean;
  package_snapshot: { name?: string; description?: string; price?: number | string } | null;
  is_manual?: boolean;
  custom_package_snapshot: {
    base_fee?: number | string;
    hourly_rate?: number | string;
    hours?: number;
    components?: SnapshotComponent[];
  } | null;
  custom_hours: number | null;
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
  non_completion_reason: string | null;
  non_completion_reported_by: number | null;
  non_completion_state: "open" | "awaiting_admin" | "disputed" | "upheld" | "overturned" | "final" | null;
  non_completion_dispute_deadline_at: string | null;
  non_completion_dispute_reason: string | null;
  non_completion_admin_notes: string | null;
  reschedule_request: {
    requested_event_date: string | null;
    requested_start_time: string | null;
    reason: string | null;
    requested_at: string;
    decision: "approved" | "rejected" | null;
    decided_at: string | null;
  } | null;
  cancelled_by: "client" | "photographer" | "admin" | null;
  is_declined: boolean;
  modification_request: {
    changes: { guest_count?: number | null; event_address?: string | null; special_requests?: string | null } | null;
    decision: "approved" | "rejected" | null;
    decided_at: string | null;
    type: string;
    reason:string;
    requested_at: string;
  } | null;
  payment_plan: "half" | "full" | null;
  payment_status: PhotographerPaymentStatus | null;
  remaining_balance: number;
  // NOTE: exact case values not confirmed against the real ServiceTrackerStatus
  // PHP enum — read as a plain string, not narrowed to a union.
  service_status: string | null;
  service_status_updated_at: string | null;
  created_at: string;
  extension_eligible: boolean;
  completion_blocked_until?: string | null;
  has_pending_extension: boolean;
  approved_extension_charge: number;
  extensions: RawExtension[];
  schedules: RawSchedule[];
};

interface RawSchedule {
  id: number | null; // null = primary schedule, not a booking_schedules row
  label: string;
  event_date: string;
  start_time: string;
  end_time: string;
  is_primary: boolean;
  location_type?: string | null;
  location_label?: string | null; // null = same location as the booking
}

export interface StudioBookingSchedule {
  id: string | null;
  label: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  isPrimary: boolean;
  locationType: string | null;
  locationLabel: string | null;
}

function toSchedule(raw: RawSchedule): StudioBookingSchedule {
  return {
    id: raw.id === null ? null : String(raw.id),
    label: raw.label,
    eventDate: raw.event_date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    isPrimary: raw.is_primary,
    locationType: raw.location_type ?? null,
    locationLabel: raw.location_label ?? null,
  };
}

interface RawExtension {
  id: number;
  requested_hours: number;
  hourly_rate: number | string;
  additional_charge: number | string;
  status: "pending" | "approved" | "declined";
  requested_at: string;
  decided_at: string | null;
  decline_reason: string | null;
  new_end_time: string | null;
  schedule_id: number | null;
  schedule_label: string | null;
}

export interface StudioBookingExtension {
  id: string;
  requestedHours: number;
  hourlyRate: number;
  additionalCharge: number;
  status: "pending" | "approved" | "declined";
  requestedAt: string;
  decidedAt: string | null;
  declineReason: string | null;
  newEndTime: string | null;
  scheduleId: string | null;
  scheduleLabel: string | null;
}

function toExtension(raw: RawExtension): StudioBookingExtension {
  return {
    id: String(raw.id),
    requestedHours: raw.requested_hours,
    hourlyRate: Number(raw.hourly_rate),
    additionalCharge: Number(raw.additional_charge),
    status: raw.status,
    requestedAt: raw.requested_at,
    decidedAt: raw.decided_at,
    declineReason: raw.decline_reason,
    newEndTime: raw.new_end_time,
    scheduleId: raw.schedule_id === null ? null : String(raw.schedule_id),
    scheduleLabel: raw.schedule_label,
  };
}

export interface StudioBookingRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmailVerified?: boolean;
  /** Recorded by the photographer for a walk-in client (no platform account). */
  isManual: boolean;
  isWalkInClient: boolean;
  clientPhone: string | null;
  clientEmail?: string | null;
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
  cancelledBy: "client" | "photographer" | "admin" | null;
  // true = a booking request the photographer declined (shown as "Declined", not "Cancelled").
  isDeclined: boolean;
  nonCompletionReason: string | null;
  nonCompletionReportedBy: number | null;
  nonCompletionState: "open" | "awaiting_admin" | "disputed" | "upheld" | "overturned" | "final" | null;
  nonCompletionDeadline: string | null;
  nonCompletionDisputeReason: string | null;
  nonCompletionAdminNotes: string | null;
  hasActiveCancellationRequest: boolean;
  hasPendingRescheduleRequest: boolean;
  pendingReschedule: { eventDate: string; startTime: string; reason: string | null } | null;
  pendingModification: {
    type: string;
    reason: string;
    changes: { guest_count?: number | null; event_address?: string | null; special_requests?: string | null };
  } | null;
  paymentPlan: "half" | "full" | null;
  paymentStatus: PhotographerPaymentStatus | null;
  remainingBalance: number;
  amountPaid: number;
  serviceStatus: string | null;
  addOns: { name: string; price: number }[];
  customBuild?: {
    baseFee: number;
    hourlyRate: number | null;
    hours: number | null;
    components: { type: string; label: string; price: number }[];
  };
  createdAt: string;
  holdExpiresAt: string | null;
  extensionEligible: boolean;
  completionBlockedUntil: string | null;
  hasPendingExtension: boolean;
  approvedExtensionCharge: number;
  extensions: StudioBookingExtension[];
  schedules: StudioBookingSchedule[];
}

function toStudioBooking(raw: RawStudioBooking): StudioBookingRecord {
  const totalPrice = Number(raw.total_price);
  const remainingBalance = raw.remaining_balance;

  return {
    id: String(raw.id),
    clientId: raw.client.id === null ? "" : String(raw.client.id),
    clientName: raw.client.name,
    clientEmailVerified: raw.client.email_verified,
    isManual: raw.is_manual ?? false,
    isWalkInClient: raw.client.is_walk_in ?? false,
    clientPhone: raw.client.phone ?? null,
    clientEmail: raw.client.email ?? null,
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
    cancelledBy: raw.cancelled_by,
    isDeclined: raw.is_declined,
    nonCompletionReason: raw.non_completion_reason,
    nonCompletionReportedBy: raw.non_completion_reported_by,
    nonCompletionState: raw.non_completion_state,
    nonCompletionDeadline: raw.non_completion_dispute_deadline_at,
    nonCompletionDisputeReason: raw.non_completion_dispute_reason,
    nonCompletionAdminNotes: raw.non_completion_admin_notes,
    hasActiveCancellationRequest: !!raw.cancellation_requested_at && !raw.cancellation_decision,
    hasPendingRescheduleRequest: !!raw.reschedule_request && !raw.reschedule_request.decision,
    pendingReschedule: raw.reschedule_request && !raw.reschedule_request.decision
      ? {
          eventDate: raw.reschedule_request.requested_event_date ?? "",
          startTime: raw.reschedule_request.requested_start_time ?? "",
          reason: raw.reschedule_request.reason ?? null,
        }
      : null,
    pendingModification: raw.modification_request && !raw.modification_request.decision
      ? { type: raw.modification_request.type, reason: raw.modification_request.reason, changes: raw.modification_request.changes ?? {} }
      : null,
    paymentPlan: raw.payment_plan,
    paymentStatus: raw.payment_status,
    remainingBalance,
    amountPaid: Math.max(0, totalPrice - remainingBalance),
    serviceStatus: raw.service_status,
    addOns: (raw.add_ons_snapshot ?? []).map((a) => ({ name: a.name, price: Number(a.price) })),
    customBuild: raw.is_custom_package
      ? {
          baseFee: Number(raw.custom_package_snapshot?.base_fee ?? 0),
          hourlyRate: raw.custom_package_snapshot?.hourly_rate != null
            ? Number(raw.custom_package_snapshot.hourly_rate)
            : null,
          hours: raw.custom_hours ?? raw.custom_package_snapshot?.hours ?? null,
          components: (raw.custom_package_snapshot?.components ?? []).map((c) => ({
            type: c.type,
            label: c.label,
            price: Number(c.price_addition),
          })),
        }
      : undefined,
    createdAt: raw.created_at,
    holdExpiresAt: raw.hold_expires_at,
    extensionEligible: raw.extension_eligible,
    completionBlockedUntil: raw.completion_blocked_until ?? null,
    hasPendingExtension: raw.has_pending_extension,
    approvedExtensionCharge: raw.approved_extension_charge,
    extensions: raw.extensions.map(toExtension),
    schedules: raw.schedules.map(toSchedule),
  };
}

export const photographerBookingService = {
  list: async (): Promise<StudioBookingRecord[]> => {
    const res = await api.get("/photographer/bookings");
    return (res.data.data as RawStudioBooking[]).map(toStudioBooking);
  },

  createManual: async (input: ManualBookingInput): Promise<StudioBookingRecord> => {
    const res = await api.post("/photographer/bookings/manual", {
      walk_in_client_id: input.walkInClientId ? Number(input.walkInClientId.replace(/^W-/, "")) : undefined,
      new_client: input.newClient,
      event_type: input.eventType,
      custom_event_type: input.customEventType ?? null,
      package_name: input.packageName ?? null,
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime || null,
      location_type: input.locationType,
      event_address: input.eventAddress ?? null,
      guest_count: input.guestCount ?? null,
      notes: input.notes ?? null,
      total_price: input.totalPrice,
      amount_paid: input.amountPaid ?? 0,
      mark_completed: input.markCompleted ?? false,
    });
    return toStudioBooking(res.data.data);
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

  // "Accommodate Other Reservation": {id} is a cancelled booking that was
  // previously paid/confirmed for this slot. Lists the other clients who
  // requested the same date/time and were auto-declined when {id}'s
  // payment was confirmed first, and are still available for review now
  // that {id} has been cancelled.
  accommodationCandidates: async (id: string): Promise<StudioBookingRecord[]> => {
    const res = await api.get(`/photographer/bookings/${id}/accommodation-candidates`);
    return (res.data.data as RawStudioBooking[]).map(toStudioBooking);
  },

  // Photographer picks one candidate to offer the freed-up slot to. That
  // candidate moves to Confirmed/payment pending — the normal
  // accepted-awaiting-payment state — and the slot only blocks again once
  // they actually pay.
  accommodate: async (id: string, candidateBookingId: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/accommodate`, {
      candidate_booking_id: Number(candidateBookingId),
    });
    return toStudioBooking(res.data.data);
  },

  approveReschedule: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/reschedule/approve`);
    return toStudioBooking(res.data.data);
  },

  rejectReschedule: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/reschedule/reject`);
    return toStudioBooking(res.data.data);
  },

  approveModification: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/modification/approve`);
    return toStudioBooking(res.data.data);
  },

  rejectModification: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/modification/reject`);
    return toStudioBooking(res.data.data);
  },

  // The photographer cancels a CONFIRMED booking (turning down a new request is "reject"/decline above).
  cancelBooking: async (id: string, reason: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/cancel`, { reason });
    return toStudioBooking(res.data.data);
  },

  approveExtension: async (id: string, extensionId: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/extensions/${extensionId}/approve`);
    return toStudioBooking(res.data.data);
  },

  declineExtension: async (id: string, extensionId: string, reason?: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/extensions/${extensionId}/decline`, { reason });
    return toStudioBooking(res.data.data);
  },

  // NOTE: `status` must match the real ServiceTrackerStatus enum cases —
  // // unconfirmed, currently sourced from the frontend's local trackingStages ids.
  updateServiceTracker: async (id: string, status: string): Promise<StudioBookingRecord> => {
    const res = await api.patch(`/photographer/bookings/${id}/service-tracker`, { service_status: status });
    return toStudioBooking(res.data.data);
  },

  // "Confirm Shoot Completed": the only way to move Event Day -> Editing
  // (POST /photographer/bookings/{id}/confirm-shoot). The generic tracker
  // endpoint above no longer accepts that transition.
  confirmShoot: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/confirm-shoot`);
    return toStudioBooking(res.data.data);
  },

  // Explicit completion step: Confirmed -> Completed, only valid once
  // serviceStatus === "delivered". Backed by MarkServiceCompletedAction /
  // POST /photographer/bookings/{id}/complete — separate from the service
  // tracker on purpose (BookingStatus and ServiceTrackerStatus stay distinct).
  markCompleted: async (id: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/complete`);
    return toStudioBooking(res.data.data);
  },

  reportNonCompletion: async (id: string, notes?: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/report-non-completion`, { reason: "client_no_show", notes });
    return toStudioBooking(res.data.data);
  },

  disputeNonCompletion: async (id: string, reason: string): Promise<StudioBookingRecord> => {
    const res = await api.post(`/photographer/bookings/${id}/dispute-non-completion`, { reason });
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