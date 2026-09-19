import api from "@/lib/api";

export type CustomComponentType = "flat_option" | "tier_option";
export type CustomComponentStatus = "active" | "archived";

interface RawConfig {
  enabled: boolean;
  base_fee: number | string | null;
  buffer_minutes: number | string | null;
  hourly_rate?: number | string | null;
  min_hours?: number | null;
  max_hours?: number | null;
  updated_at: string;
}
export interface CustomPackageConfigRecord {
  enabled: boolean;
  baseFee: number | null;
  // Applied to every custom-package booking this photographer receives —
  // mirrors PackageRecord.bufferMinutes, which is per fixed package instead.
  bufferMinutes: number;
  // Optional sliding-hours pricing — see CustomPackageDrawer in
  // StudioPackages.tsx and Booking.tsx's slider UI. null means this
  // photographer only uses the discrete duration-tier picker.
  hourlyRate: number | null;
  minHours: number | null;
  maxHours: number | null;
}
export interface CustomPackageConfigInput {
  enabled: boolean;
  base_fee: number | null;
  buffer_minutes?: number;
  hourly_rate?: number | null;
  min_hours?: number | null;
  max_hours?: number | null;
}

interface RawComponent {
  id: number | string;
  type: CustomComponentType;
  tier_name: string | null;
  label: string;
  price_addition: number | string;
  duration_minutes: number | string | null;
  status: CustomComponentStatus;
}
export interface CustomComponentRecord {
  id: string;
  type: CustomComponentType;
  tierName: string | null;
  label: string;
  priceAddition: number;
  // Set only on the option(s) meant to represent a selectable photography
  // coverage duration (minutes). Null on every other component (photo
  // tiers, delivery tiers, flat add-ons). See CreateBookingAction::
  // resolveCustomPackage() on the backend for how this is used.
  durationMinutes: number | null;
  status: CustomComponentStatus;
}
export interface CustomComponentInput {
  type: CustomComponentType;
  tier_name?: string | null;
  label: string;
  price_addition: number;
  duration_minutes?: number | null;
}

function toConfig(raw: RawConfig): CustomPackageConfigRecord {
  return {
    enabled: raw.enabled,
    baseFee: raw.base_fee === null ? null : Number(raw.base_fee),
    bufferMinutes: raw.buffer_minutes == null ? 0 : Number(raw.buffer_minutes),
    hourlyRate: raw.hourly_rate == null ? null : Number(raw.hourly_rate),
    minHours: raw.min_hours ?? null,
    maxHours: raw.max_hours ?? null,
  };
}
function toComponent(raw: RawComponent): CustomComponentRecord {
  return {
    id: String(raw.id),
    type: raw.type,
    tierName: raw.tier_name ?? null,
    label: raw.label,
    priceAddition: Number(raw.price_addition),
    durationMinutes: raw.duration_minutes == null ? null : Number(raw.duration_minutes),
    status: raw.status,
  };
}

export const photographerCustomPackageService = {
  getConfig: async (): Promise<CustomPackageConfigRecord> => {
    const res = await api.get("/photographer/custom-package/config");
    return toConfig(res.data.data);
  },
  updateConfig: async (input: CustomPackageConfigInput): Promise<CustomPackageConfigRecord> => {
    const res = await api.patch("/photographer/custom-package/config", input);
    return toConfig(res.data.data);
  },
  listComponents: async (): Promise<CustomComponentRecord[]> => {
    const res = await api.get("/photographer/custom-package/components");
    return (res.data.data as RawComponent[]).map(toComponent);
  },
  createComponent: async (input: CustomComponentInput): Promise<CustomComponentRecord> => {
    const res = await api.post("/photographer/custom-package/components", input);
    return toComponent(res.data.data);
  },
  updateComponent: async (id: string, input: CustomComponentInput): Promise<CustomComponentRecord> => {
    const res = await api.patch(`/photographer/custom-package/components/${id}`, input);
    return toComponent(res.data.data);
  },
  archiveComponent: async (id: string): Promise<CustomComponentRecord> => {
    const res = await api.post(`/photographer/custom-package/components/${id}/archive`);
    return toComponent(res.data.data);
  },
  restoreComponent: async (id: string): Promise<CustomComponentRecord> => {
    const res = await api.post(`/photographer/custom-package/components/${id}/restore`);
    return toComponent(res.data.data);
  },
  // NOTE: CustomPackageController has no destroy/permanent-delete for components —
  // archive/restore is the only lifecycle available. Don't offer permanent delete in the UI.
};