import api from "@/lib/api";

export type ClientType = "registered" | "walk-in";
export type ClientStatus = "active" | "inactive" | "archived";
export type WalkInSource = "facebook" | "messenger" | "phone_call" | "walk_in" | "referral";

interface RawClient {
  id: string; // "R-123" for registered, "W-45" for walk-in
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  bookings: number;
  spent: number | string;
  type: ClientType;
  status: ClientStatus;
  source: string; // "Platform" for registered, a WalkInSource slug for walk-in
  joined_year: number;
  archived_at: string | null; // ISO timestamp; null unless status === "archived"
}

export interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  bookings: number;
  spent: number;
  type: ClientType;
  status: ClientStatus;
  source: string;
  joinedYear: number;
  archivedAt: string | null;
}

// Backend enum (StoreWalkInClientRequest / UpdateWalkInClientRequest): these
// five slugs are the ONLY values the API accepts for a walk-in's `source`.
export const WALK_IN_SOURCES: { value: WalkInSource; label: string }[] = [
  { value: "facebook", label: "Facebook Page" },
  { value: "messenger", label: "Messenger Chat" },
  { value: "phone_call", label: "Direct Phone Call" },
  { value: "walk_in", label: "Physical Studio Walk-in" },
  { value: "referral", label: "Word-of-Mouth / Referral" },
];

export function sourceLabel(source: string): string {
  if (source === "Platform") return "Platform";
  return WALK_IN_SOURCES.find((s) => s.value === source)?.label ?? source;
}

function toClient(raw: RawClient): ClientRecord {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    location: raw.location,
    bookings: raw.bookings,
    spent: Number(raw.spent),
    type: raw.type,
    status: raw.status,
    source: raw.source,
    joinedYear: raw.joined_year,
    archivedAt: raw.archived_at,
  };
}

// WalkInClientResource prefixes ids with "W-" so they can't collide with
// registered-client user ids in the merged list — strip it back off for the
// route param, since {walkInClient} route-model-binds on the real numeric id.
function walkInRouteId(id: string): string {
  return id.startsWith("W-") ? id.slice(2) : id;
}

export interface WalkInClientInput {
  name: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  source: WalkInSource;
}

export const photographerClientService = {
  list: async (): Promise<ClientRecord[]> => {
    const res = await api.get("/photographer/clients");
    return (res.data.data as RawClient[]).map(toClient);
  },

  createWalkIn: async (input: WalkInClientInput): Promise<ClientRecord> => {
    const res = await api.post("/photographer/clients", input);
    return toClient(res.data.data);
  },

  updateWalkIn: async (id: string, input: Partial<WalkInClientInput>): Promise<ClientRecord> => {
    const res = await api.patch(`/photographer/clients/${walkInRouteId(id)}`, input);
    return toClient(res.data.data);
  },

  archiveWalkIn: async (id: string): Promise<ClientRecord> => {
    const res = await api.post(`/photographer/clients/${walkInRouteId(id)}/archive`);
    return toClient(res.data.data);
  },

  restoreWalkIn: async (id: string): Promise<ClientRecord> => {
    const res = await api.post(`/photographer/clients/${walkInRouteId(id)}/restore`);
    return toClient(res.data.data);
  },

  /** Permanently deletes a walk-in client. Only works if it's already archived (backend enforces this). */
  deleteWalkIn: async (id: string): Promise<void> => {
    await api.delete(`/photographer/clients/${walkInRouteId(id)}`);
  },
};