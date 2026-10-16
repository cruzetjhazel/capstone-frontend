import type { BookingRecord, BookingStatus } from "@/data/mockBookings";
   import { getAuthToken } from "@/lib/tokenStorage";
   import type { BudgetRequestInfo, BudgetActions } from "@/services/negotiationService";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

type SnapshotComponent = {
  type: string;
  label: string;
  price_addition: number | string;
};

type RawBooking = {
  id: number;
  client: { id: number; name: string };
  photographer: { id: number; name: string };
  is_custom_package: boolean;
  package_snapshot: {
    name?: string;
    description?: string;
    included_items?: string[];
    price?: number | string;
  } | null;
  custom_package_snapshot: {
    base_fee?: number | string;
    hourly_rate?: number | string;
    hours?: number;
    components?: SnapshotComponent[];
  } | null;
  custom_hours: number | null;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  event_address: string | null;
  province: { id: number; name: string } | null;
  city_municipality: { id: number; name: string } | null;
  barangay: { id: number; name: string } | null;
  guest_count: number | null;
  subtotal: string;
  total_price: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "expired" | "no_show" | "waitlisted";
  payment_status: "pending" | "pending_verification" | "partially_paid" | "fully_paid" | "failed" | "cancelled";
  cancellation_requested_at: string | null;
  cancellation_decision: "approved" | "rejected" | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  cancelled_by: "client" | "photographer" | "admin" | null;
  is_declined: boolean;
  status_notice?: string | null;
     slot_offered_at?: string | null;
   slot_offer_accepted_at?: string | null;
   awaiting_offer_acceptance?: boolean;
   slot_offer_deadline?: string | null;
   payment_actions?: { can_accept_slot_offer?: boolean; can_decline_slot_offer?: boolean } & Record<string, unknown>;
   budget_request?: BudgetRequestInfo | null;
   budget_actions?: BudgetActions | null;
  buffer_minutes: number;
  reschedule_request: {
    requested_event_date: string | null;
    requested_start_time: string | null;
    type?: "standard" | "weather" | "venue" | "agreed";
    reason: string | null;
    requested_at: string;
    decision: "approved" | "rejected" | null;
    decided_at: string | null;
  } | null;
  modification_request: {
    type: string;
    reason: string;
    changes: { guest_count?: number | null; event_address?: string | null; special_requests?: string | null } | null;
    requested_at: string;
    decision: "approved" | "rejected" | null;
    decided_at: string | null;
  } | null;
  non_completion_reason: string | null;
  non_completion_reported_by: number | null;
  non_completion_state: "open" | "awaiting_admin" | "disputed" | "upheld" | "overturned" | "final" | null;
  non_completion_dispute_deadline_at: string | null;
  non_completion_dispute_reason: string | null;
  non_completion_admin_notes: string | null;
  is_reviewable: boolean;
  allowed_actions?: {
    can_modify: boolean;
    can_reschedule: boolean;
    can_postpone: boolean;
    can_cancel: boolean;
    can_report_photographer_no_show: boolean;
    no_show_report_deadline: string | null;
    no_show_report_expired: boolean;
  };
  reschedule_history?: {
    type: "standard" | "weather" | "venue" | "agreed";
    original_event_date: string | null;
    original_start_time: string | null;
    new_event_date: string | null;
    new_start_time: string | null;
    reason: string | null;
    decided_at: string | null;
  }[];
  remaining_balance: number;
  created_at: string;
  service_status: "upcoming" | "event_day" | "editing" | "delivered" | "completed" | null;
  has_reviewed: boolean;
  extension_eligible: boolean;
  completion_blocked_until?: string | null;
  has_pending_extension: boolean;
  approved_extension_charge: number;
  extensions: RawBookingExtension[];
  // Schedule 1 (this booking's own date/time) + every additional
  // BookingSchedule row, in one ordered list — see BookingResource.php /
  // Booking::allSchedules(). Confirmed against BookingScheduleResource.php.
  schedules: RawBookingSchedule[];
};

export type RawBookingSchedule = {
  id: number | null; // null = the primary schedule, not a booking_schedules row
  label: string;
  event_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:mm" or "HH:mm:ss"
  end_time: string;
  is_primary: boolean;
  duration_minutes?: number | null;
  duration_confirmed?: boolean;
  location_type?: string | null;
  location_label?: string | null; // null = same location as the booking
  event_address?: string | null;
};

export interface BookingScheduleRecord {
  id: string | null;
  label: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  isPrimary: boolean;
  durationMinutes: number | null;
  durationConfirmed: boolean;
  locationType: string | null;
  locationLabel: string | null; // null = same location as the booking
  eventAddress: string | null;
}

function toSchedule(raw: RawBookingSchedule): BookingScheduleRecord {
  return {
    id: raw.id === null ? null : String(raw.id),
    label: raw.label,
    eventDate: raw.event_date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    isPrimary: raw.is_primary,
    durationMinutes: raw.duration_minutes ?? null,
    durationConfirmed: raw.duration_confirmed ?? Boolean(raw.end_time),
    locationType: raw.location_type ?? null,
    locationLabel: raw.location_label ?? null,
    eventAddress: raw.event_address ?? null,
  };
}

// Confirmed against BookingExtensionResource.php.
export type RawBookingExtension = {
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
};

export interface BookingExtensionRecord {
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

function toExtension(raw: RawBookingExtension): BookingExtensionRecord {
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

// Pass through unchanged — confirmed against BookingResource.php / BookingStatus enum
// (AcceptBookingAction, RejectBookingAction, Booking.php): pending, accepted,
// confirmed, rejected, cancelled, completed, expired are all real, distinct states.
// "expired" means the photographer accepted but the client didn't pay within
// the payment hold window (see ExpireStaleBookingHoldsAction) — distinct from
// "cancelled", which covers withdrawn/declined requests.
function mapStatus(status: RawBooking["status"]): BookingStatus {
  return status as BookingStatus;
}

// Best-effort mapping from custom_package_snapshot.components (type/label/price_addition)
// into the keyed shape ClientBookingDetails.tsx reads (customBuild.editedPhotos, etc).
// The backend's exact `type` string values weren't confirmed against
// CustomPackageComponentType's enum cases — if a key below doesn't match a
// real value, that line just falls back to the UI's own existing defaults
// ("Standard", "1", etc.) rather than breaking anything.
function findComponent(components: SnapshotComponent[] | undefined, typeCandidates: string[]) {
  if (!components) return undefined;
  const match = components.find((c) => typeCandidates.includes(c.type));
  if (!match) return undefined;
  return { label: match.label, price: Number(match.price_addition) };
}

function toBookingRecord(raw: RawBooking): BookingRecord {
  const components = raw.custom_package_snapshot?.components;

  return {
    id: String(raw.id),
    photographerId: String(raw.photographer.id),
    photographerName: raw.photographer.name,
    photographerAvatar: raw.photographer.name.slice(0, 2).toUpperCase(),
    eventType: raw.event_type,
    date: raw.event_date,
    startTime: raw.start_time,
    endTime: raw.end_time,
    eventLocation: raw.event_address ?? "",
    guestCount: raw.guest_count != null ? String(raw.guest_count) : "",
    notes: "",
    contactName: raw.client.name,
    contactPhone: "",
    contactEmail: "",
    packageName: raw.package_snapshot?.name ?? "Custom Package",
    packagePrice: Number(raw.subtotal),
    packagePhotos: 0, // no dedicated backend field — Package model has no photo-count column
    addOns: [],
    subtotal: Number(raw.subtotal),
    totalPrice: Number(raw.total_price),
    dueNow: raw.remaining_balance,
    balance: raw.remaining_balance,
    paymentOption: "",
    status: mapStatus(raw.status),
    paymentStatus: raw.payment_status,
    createdAt: raw.created_at,
    serviceStatus: raw.service_status,
    hasReviewed: raw.has_reviewed,
    // Extra fields ClientBookingDetails.tsx reads via (booking as any):
    packageType: raw.is_custom_package ? "custom" : "standard",
    customBuild: raw.is_custom_package
      ? {
          baseFee: Number(raw.custom_package_snapshot?.base_fee ?? 0),
          hourlyRate: raw.custom_package_snapshot?.hourly_rate != null
            ? Number(raw.custom_package_snapshot.hourly_rate)
            : null,
          hours: raw.custom_hours ?? raw.custom_package_snapshot?.hours ?? null,
          editedPhotos: findComponent(components, ["edited_photos", "editing"]),
          photographers: findComponent(components, ["photographers", "additional_photographer"]),
          delivery: findComponent(components, ["delivery"]),
          rawFiles: findComponent(components, ["raw_files", "rawFiles"]),
          secondLocation: findComponent(components, ["second_location", "secondLocation"]),
        }
      : undefined,
    hasActiveRequest: !!raw.cancellation_requested_at && !raw.cancellation_decision,
    cancellationDecision: raw.cancellation_decision,
    cancellationReason: raw.cancellation_reason,
    rejectionReason: raw.rejection_reason,
    cancelledBy: raw.cancelled_by,
    isDeclined: raw.is_declined,
    statusNotice: raw.status_notice ?? null,
       slotOfferedAt: raw.slot_offered_at ?? null,
   slotOfferAcceptedAt: raw.slot_offer_accepted_at ?? null,
   awaitingOfferAcceptance: raw.awaiting_offer_acceptance ?? false,
   slotOfferDeadline: raw.slot_offer_deadline ?? null,
   canAcceptSlotOffer: raw.payment_actions?.can_accept_slot_offer ?? false,
   canDeclineSlotOffer: raw.payment_actions?.can_decline_slot_offer ?? false,
   budgetRequest: raw.budget_request ?? null,
   budgetActions: raw.budget_actions ?? null,
    bufferMinutes: raw.buffer_minutes,
    rescheduleInfo: raw.reschedule_request
      ? {
          date: raw.reschedule_request.requested_event_date,
          time: raw.reschedule_request.requested_start_time,
          reason: raw.reschedule_request.reason,
          type: raw.reschedule_request.type ?? "standard",
          decision: raw.reschedule_request.decision,
        }
      : null,
    modificationInfo: raw.modification_request
      ? {
          reason: raw.modification_request.reason,
          changes: raw.modification_request.changes ?? {},
          decision: raw.modification_request.decision,
        }
      : null,
    nonCompletionReason: raw.non_completion_reason,
    nonCompletionReportedBy: raw.non_completion_reported_by,
    nonCompletionState: raw.non_completion_state,
    nonCompletionDeadline: raw.non_completion_dispute_deadline_at,
    nonCompletionDisputeReason: raw.non_completion_dispute_reason,
    nonCompletionAdminNotes: raw.non_completion_admin_notes,
    isReviewable: raw.is_reviewable,
    allowedActions: raw.allowed_actions ?? null,
    rescheduleHistory: raw.reschedule_history ?? [],
    extensionEligible: raw.extension_eligible,
    hasPendingExtension: raw.has_pending_extension,
    approvedExtensionCharge: raw.approved_extension_charge,
    extensions: raw.extensions.map(toExtension),
    schedules: raw.schedules.map(toSchedule),
  } as BookingRecord;
}

async function apiRequest<T>(path: string): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Mirrors apiMutate's error handling: prefer the specific field message
    // (e.g. "This photographer has not set up their GCash payment details
    // yet.") over Laravel's generic top-level "The given data was invalid."
    // — apiRequest was missing this, apiMutate already had it.
    const fieldErrors = json.errors
      ? Object.entries(json.errors)
          .map(([, msgs]) => (msgs as string[]).join(", "))
          .join(" | ")
      : "";
    throw new Error(fieldErrors || json.message || `Request failed (${response.status}).`);
  }
  return json.data as T;
}

// Confirmed against CreateBookingRequest.php — exact field names/rules.
export interface CreateBookingPayload {
  photographer_id: number;
  event_type: "wedding" | "birthday" | "prenup" | "graduation" | "portrait" |
    "corporate_event" | "product_photography" | "family_event" | "other";
  custom_event_type?: string; // required if event_type === "other"
  event_date: string;         // "YYYY-MM-DD", today or later
  start_time: string;         // "HH:mm"
  location_type: "studio" | "client_location" | "outdoor_location" | "outside_bicol" | "other";
  province_id?: number;       // required unless location_type === "studio"
  city_municipality_id?: number; // required unless location_type === "studio"
  barangay_id?: number;       // required unless location_type === "studio"
  event_address?: string;     // "Specific Address / Venue" — required unless location_type === "studio"
  guest_count?: number;       // min 1
  special_requests?: string;  // max 2000 chars
  // Schedule 2+ — see CreateBookingRequest.php's additional_schedules
  // field. Schedule 1 stays the event_date/start_time above. These, if
  // present, are separate non-contiguous dates (e.g. Prenup on Oct 5 vs
  // Wedding on Oct 20) — NOT a continuous range. No end_time here either:
  // every schedule in a booking shares the same package/custom-package
  // coverage length (there's one package per booking, not one per date),
  // so the backend derives each one's end_time from its start_time the
  // same way it derives Schedule 1's — see CreateBookingAction.
    additional_schedules?: {
      label: string;
      event_date: string;
      start_time: string;
      duration_minutes?: number;
      location_type?: string;
      province_id?: number;
      city_municipality_id?: number;
      barangay_id?: number;
      event_address?: string;
    }[];
  // Fixed package:
  package_id?: number;        // required if is_custom_package is false/omitted
  // OR custom package:
  is_custom_package?: boolean;
  custom_component_ids?: number[];
  // Present when the client used the sliding-hours picker instead of a
  // discrete duration option — see CreateBookingAction::resolveCustomPackage.
  custom_hours?: number;
  // Head-count for per-person custom pricing.
  custom_people?: number;
  add_on_ids?: number[];      // fixed-package bookings only
}

// Confirmed against SubmitPaymentRequest.php + Client\PaymentController::store.
export interface SubmitPaymentPayload {
  plan: "half" | "full";
  amount: number;
  reference_number: string;
  payer_name: string;
  payment_date: string; // "YYYY-MM-DD"
}

// Confirmed against SubmitPaymentRequest.php + PaymentController::store +
// PaymentResource.php — same shape as the resource used on the photographer
// side (see paymentService.ts / clientPaymentService.ts).
// Confirmed against PaymentResource.php.
export interface SubmitPaymentResult {
  data: {
    id: number;
    booking_id: number;
    type: string;
    method: string;
    plan: string;
    amount: number | string;
    reference_number: string | null;
    payer_name: string | null;
    payment_date: string;
    notes: string | null;
    matching_status: "matched" | "unmatched" | string;
    verified_by: number | null;
    verified_at: string | null;
    created_at: string;
  };
  message: string;
}

export interface BookingPaymentInfo {
  gcash: {
    account_name: string;
    account_number: string;
    qr_url: string;
  };
  amounts: {
    total_price: number;
    full_payment_amount: number;
    half_payment_amount: number;
  };
  booking_status: string;
  payment_status: string;
}

async function apiMutate<T>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = json.errors
      ? Object.entries(json.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join(" | ")
      : "";
    throw new Error(fieldErrors || json.message || `Request failed (${response.status}).`);
  }
  return json.data as T;
}

// Same as apiMutate, but preserves the top-level `message` alongside `data`
// instead of unwrapping — needed where the UI shows the backend's message
// (e.g. "Payment submitted and verified automatically").
async function apiMutateWithMessage<T extends { data: unknown; message: string }>(
  path: string,
  method: "POST" | "PATCH",
  body?: unknown
): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = json.errors
      ? Object.entries(json.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join(" | ")
      : "";
    throw new Error(fieldErrors || json.message || `Request failed (${response.status}).`);
  }
  return json as T;
}

export const bookingService = {
  list: async (_clientEmail?: string): Promise<BookingRecord[]> => {
    // clientEmail is unused now — the backend scopes bookings to the
    // authenticated user via the Bearer token, not an email filter.
    const raw = await apiRequest<RawBooking[]>("/client/bookings");
    return raw.map(toBookingRecord);
  },

  getById: async (id: string): Promise<BookingRecord | undefined> => {
    const raw = await apiRequest<RawBooking>(`/client/bookings/${id}`);
    return toBookingRecord(raw);
  },

  create: async (payload: CreateBookingPayload): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>("/client/bookings", "POST", payload);
    return toBookingRecord(raw);
  },

  approve: async (_id: string): Promise<void> => {
    // Not a client-side action — only photographers accept bookings,
    // via POST /api/photographer/bookings/{id}/accept. Nothing should
    // call this from client-facing code (see BookingSent.tsx fix).
    throw new Error("approve() is a photographer action, not available to clients.");
  },

     acceptOffer: async (bookingId: string): Promise<BookingRecord> => {
     const raw = await apiMutate<RawBooking>(`/client/bookings/${bookingId}/accept-offer`, "POST");
     return toBookingRecord(raw);
   },

   declineOffer: async (bookingId: string): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(`/client/bookings/${bookingId}/decline-offer`, "POST");
    return toBookingRecord(raw);
  },

  requestCancellation: async (bookingId: string, reason: string): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(
      `/client/bookings/${bookingId}/request-cancellation`,
      "POST",
      { reason }
    );
    return toBookingRecord(raw);
  },

  reportNonCompletion: async (bookingId: string, reason: "photographer_no_show" | "client_no_show", notes?: string): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(`/client/bookings/${bookingId}/report-non-completion`, "POST", { reason, notes });
    return toBookingRecord(raw);
  },

  disputeNonCompletion: async (bookingId: string, reason: string): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(`/client/bookings/${bookingId}/dispute-non-completion`, "POST", { reason });
    return toBookingRecord(raw);
  },

  reschedule: async (bookingId: string, eventDate: string, startTime: string, reason: string, type: "standard" | "weather" | "venue" | "agreed" = "standard"): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(
      `/client/bookings/${bookingId}/reschedule`,
      "POST",
      { event_date: eventDate, start_time: startTime, reason, type }
    );
    return toBookingRecord(raw);
  },

  // Start times the booking could move to on `date` (server checks the photographer's real schedule).
  getRescheduleSlots: async (bookingId: string, date: string): Promise<string[]> => {
    const data = await apiRequest<{ date: string; start_times: string[] }>(
      `/client/bookings/${bookingId}/reschedule-slots?date=${encodeURIComponent(date)}`
    );
    return data.start_times;
  },

  requestModification: async (
    bookingId: string,
    changes: { guest_count?: number; event_address?: string; special_requests?: string },
    reason: string
  ): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(
      `/client/bookings/${bookingId}/request-modification`,
      "POST",
      { changes, reason }
    );
    return toBookingRecord(raw);
  },

  modify: async (
    bookingId: string,
    payload: Partial<{ location_type: string; event_address: string; guest_count: number; special_requests: string }>
  ): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(`/client/bookings/${bookingId}`, "PATCH", payload);
    return toBookingRecord(raw);
  },

  // Confirmed against routes/api.php + PaymentController::paymentInfo.
  getStudioPaymentInfo: async (bookingId: string): Promise<BookingPaymentInfo> => {
    return apiRequest<BookingPaymentInfo>(`/client/bookings/${bookingId}/payment-info`);
  },

  submitPayment: async (bookingId: string, payload: SubmitPaymentPayload): Promise<SubmitPaymentResult> => {
    return apiMutateWithMessage<SubmitPaymentResult>(`/client/bookings/${bookingId}/payments`, "POST", payload);
  },

  requestExtension: async (bookingId: string, additionalHours: number, scheduleId?: string | null): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(
      `/client/bookings/${bookingId}/extensions`,
      "POST",
      { additional_hours: additionalHours, ...(scheduleId ? { schedule_id: Number(scheduleId) } : {}) }
    );
    return toBookingRecord(raw);
  },
};

export type { BookingRecord, BookingStatus };