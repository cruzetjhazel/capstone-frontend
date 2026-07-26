import type { BookingRecord, BookingStatus } from "@/data/mockBookings";

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
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  cancellation_requested_at: string | null;
  cancellation_decision: "approved" | "rejected" | null;
  remaining_balance: number;
  created_at: string;
};

function mapStatus(status: RawBooking["status"]): BookingStatus {
  switch (status) {
    case "confirmed":
      return "approved";
    case "rejected":
      return "cancelled";
    default:
      return status as BookingStatus;
  }
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
    dueNow: raw.remaining_balance,
    balance: raw.remaining_balance,
    paymentOption: "",
    status: mapStatus(raw.status),
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
  const token = localStorage.getItem("app_token");
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

  create: async (_booking: BookingRecord): Promise<BookingRecord> => {
    // Genuinely not possible with this input type: BookingRecord carries
    // display fields (packageName, addOns as {name, price, description}),
    // not the backend IDs (photographer_id, package_id, add_on_ids)
    // CreateBookingRequest actually requires. Whatever calls this needs
    // to pass those raw IDs directly, not a BookingRecord.
    throw new Error("create() needs real backend IDs (photographer_id, package_id, add_on_ids) — BookingRecord doesn't carry them.");
  },

  approve: async (_id: string): Promise<void> => {
    // Not a client-side action — only photographers accept bookings,
    // via POST /api/photographer/bookings/{id}/accept.
    throw new Error("approve() is a photographer action, not available to clients.");
  },
};

export type { BookingRecord };