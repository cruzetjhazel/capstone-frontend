import api from "@/lib/api";

export type PackageStatus = "draft" | "published" | "archived";

export interface PackageInclusion {
  name: string;
  detail: string;
}

interface RawPackage {
  id: number | string;
  name: string;
  description: string | null;
  included_items: PackageInclusion[] | null;
  price: number | string;
  outdoor_price?: number | string | null;
  duration_minutes: number | null;
  buffer_minutes: number | null;
  schedule_mode?: "timed" | "open";
  allows_multiple_sessions: boolean;
  max_sessions: number | null;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface PackageRecord {
  id: string;
  name: string;
  description: string;
  includedItems: PackageInclusion[];
  price: number;
  // null = no fixed duration ("to be confirmed with the client").
  // Charged instead of `price` when the booking is not at the studio. null = same price.
  outdoorPrice: number | null;
  durationMinutes: number | null;
  bufferMinutes: number;
  scheduleMode: "timed" | "open";
  allowsMultipleSessions: boolean;
  maxSessions: number | null;
  status: PackageStatus;
}

export interface PackageInput {
  name: string;
  description?: string | null;
  included_items?: PackageInclusion[];
  price: number;
  duration_minutes: number | null;
  outdoor_price?: number | null;
  buffer_minutes?: number;
  schedule_mode?: "timed" | "open";
  allows_multiple_sessions?: boolean;
  max_sessions?: number | null;
}

function toPackage(raw: RawPackage): PackageRecord {
  return {
    id: String(raw.id),
    name: raw.name,
    description: raw.description ?? "",
    includedItems: raw.included_items ?? [],
    price: Number(raw.price),
    outdoorPrice: raw.outdoor_price == null ? null : Number(raw.outdoor_price),
    durationMinutes: raw.duration_minutes ?? null,
    bufferMinutes: raw.buffer_minutes ?? 0,
    scheduleMode: raw.schedule_mode === "open" ? "open" : "timed",
    allowsMultipleSessions: Boolean(raw.allows_multiple_sessions),
    maxSessions: raw.max_sessions ?? null,
    status: raw.status,
  };
}

export const photographerPackageService = {
  list: async (): Promise<PackageRecord[]> => {
    const res = await api.get("/photographer/packages");
    return (res.data.data as RawPackage[]).map(toPackage);
  },
  create: async (input: PackageInput): Promise<PackageRecord> => {
    const res = await api.post("/photographer/packages", input);
    return toPackage(res.data.data);
  },
  update: async (id: string, input: PackageInput): Promise<PackageRecord> => {
    const res = await api.patch(`/photographer/packages/${id}`, input);
    return toPackage(res.data.data);
  },
  publish: async (id: string): Promise<PackageRecord> => {
    const res = await api.post(`/photographer/packages/${id}/publish`);
    return toPackage(res.data.data);
  },
  revertToDraft: async (id: string): Promise<PackageRecord> => {
    const res = await api.post(`/photographer/packages/${id}/revert-to-draft`);
    return toPackage(res.data.data);
  },
  archive: async (id: string): Promise<PackageRecord> => {
    const res = await api.post(`/photographer/packages/${id}/archive`);
    return toPackage(res.data.data);
  },
  restore: async (id: string): Promise<PackageRecord> => {
    const res = await api.post(`/photographer/packages/${id}/restore`);
    return toPackage(res.data.data);
  },
  destroy: async (id: string): Promise<void> => {
    await api.delete(`/photographer/packages/${id}`);
  },
};