import type { BookingRecord, BookingStatus } from "@/data/mockBookings";
import { AUTH_TOKEN_KEY } from "@/config/env";

const API_BASE = "http://127.0.0.1:8000/api";

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
    components?: SnapshotComponent[];
  } | null;
  event_type: string;
  event_date: string;
  start_time: string;
  event_address: string | null;
  guest_count: number | null;
  subtotal: string;
  total_price: string;
  status: "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed" | "expired";
  payment_status: "pending" | "pending_verification" | "partially_paid" | "fully_paid" | "failed" | "cancelled";
  cancellation_requested_at: string | null;
  cancellation_decision: "approved" | "rejected" | null;
  remaining_balance: number;
  created_at: string;
};

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
    serviceStatus: "not_started",
    hasReviewed: false,
    // Extra fields ClientBookingDetails.tsx reads via (booking as any):
    packageType: raw.is_custom_package ? "custom" : "standard",
    customBuild: raw.is_custom_package
      ? {
          baseFee: Number(raw.custom_package_snapshot?.base_fee ?? 0),
          editedPhotos: findComponent(components, ["edited_photos", "editing"]),
          photographers: findComponent(components, ["photographers", "additional_photographer"]),
          delivery: findComponent(components, ["delivery"]),
          rawFiles: findComponent(components, ["raw_files", "rawFiles"]),
          secondLocation: findComponent(components, ["second_location", "secondLocation"]),
        }
      : undefined,
    hasActiveRequest: !!raw.cancellation_requested_at && !raw.cancellation_decision,
  } as BookingRecord;
}

async function apiRequest<T>(path: string): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
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
  if (!response.ok) throw new Error(json.message || `Request failed (${response.status}).`);
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
  location_type: "studio" | "client_location" | "outdoor_location" | "other";
  event_address?: string;     // required unless location_type === "studio"
  guest_count?: number;       // min 1
  special_requests?: string;  // max 2000 chars
  // Fixed package:
  package_id?: number;        // required if is_custom_package is false/omitted
  // OR custom package:
  is_custom_package?: boolean;
  custom_component_ids?: number[];
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
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
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
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
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

  requestCancellation: async (bookingId: string, reason: string): Promise<BookingRecord> => {
    const raw = await apiMutate<RawBooking>(
      `/client/bookings/${bookingId}/request-cancellation`,
      "POST",
      { reason }
    );
    return toBookingRecord(raw);
  },

  // Confirmed against routes/api.php + PaymentController::paymentInfo.
  getStudioPaymentInfo: async (bookingId: string): Promise<BookingPaymentInfo> => {
    return apiRequest<BookingPaymentInfo>(`/client/bookings/${bookingId}/payment-info`);
  },

  submitPayment: async (bookingId: string, payload: SubmitPaymentPayload): Promise<SubmitPaymentResult> => {
    return apiMutateWithMessage<SubmitPaymentResult>(`/client/bookings/${bookingId}/payments`, "POST", payload);
  },
};

export type { BookingRecord, BookingStatus };