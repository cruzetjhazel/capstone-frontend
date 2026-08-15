import api from "@/lib/api";

export type StudioClientType = "registered" | "walk_in";
export type StudioClientStatus = "active" | "inactive" | "archived";

export interface StudioClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  bookingsCount: number;
  totalSpent: number;
  type: StudioClientType;
  status: StudioClientStatus;
  source: string;
  joinedYear: number | null;
}

type RawRegisteredClient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  bookings: number;
  spent: number;
  type: "registered";
  status: "active" | "inactive";
  source: "Platform";
  joined_year: number;
};

type RawWalkInClient = {
  id: string | number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  bookings_count?: number;
  total_spent?: number;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
};

type RawStudioClient = RawRegisteredClient | RawWalkInClient;

function isRegistered(raw: RawStudioClient): raw is RawRegisteredClient {
  return (raw as RawRegisteredClient).type === "registered";
}

function toStudioClient(raw: RawStudioClient): StudioClient {
  if (isRegistered(raw)) {
    return {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      location: raw.location,
      bookingsCount: raw.bookings,
      totalSpent: raw.spent,
      type: "registered",
      status: raw.status,
      source: raw.source,
      joinedYear: raw.joined_year,
    };
  }

  return {
    id: String(raw.id),
    name: raw.name ?? "Walk-in Client",
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    location: raw.location ?? null,
    bookingsCount: Number(raw.bookings_count ?? 0),
    totalSpent: Number(raw.total_spent ?? 0),
    type: "walk_in",
    status: (raw.status as StudioClientStatus) ?? "inactive",
    source: "Walk-in",
    joinedYear: raw.created_at ? new Date(raw.created_at).getFullYear() : null,
  };
}

export const clientService = {
  list: async (): Promise<StudioClient[]> => {
    const res = await api.get("/photographer/clients");
    return (res.data.data as RawStudioClient[]).map(toStudioClient);
  },
};