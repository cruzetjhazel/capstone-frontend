import api from "@/lib/api";

export type PackageStatus = "draft" | "published" | "archived";

interface RawPackage {
  id: number | string;
  name: string;
  description: string | null;
  included_items: string[] | null;
  price: number | string;
  duration_minutes: number;
  buffer_minutes: number | null;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface PackageRecord {
  id: string;
  name: string;
  description: string;
  includedItems: string[];
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  status: PackageStatus;
}

export interface PackageInput {
  name: string;
  description?: string | null;
  included_items?: string[];
  price: number;
  duration_minutes: number;
  buffer_minutes?: number;
}

function toPackage(raw: RawPackage): PackageRecord {
  return {
    id: String(raw.id),
    name: raw.name,
    description: raw.description ?? "",
    includedItems: raw.included_items ?? [],
    price: Number(raw.price),
    durationMinutes: raw.duration_minutes,
    bufferMinutes: raw.buffer_minutes ?? 0,
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