import api from "@/lib/api";

export type CustomComponentType = "flat_option" | "tier_option";
export type CustomComponentStatus = "active" | "archived";
export type CustomPricingModel = "fixed" | "hourly" | "per_day" | "per_person";

interface RawConfig {
  enabled: boolean;
  base_fee: number | string | null;
  base_hours?: number | null;
  buffer_minutes: number | string | null;
  hourly_rate?: number | string | null;
  min_hours?: number | null;
  max_hours?: number | null;
  allows_multiple_sessions?: boolean;
  max_sessions?: number | null;
  base_fee_mode?: "once" | "per_schedule" | null;
  pricing_model?: CustomPricingModel;
  unit_rate?: number | string | null;
  coverage_hours?: number | null;
  max_people?: number | null;
  updated_at: string;
}
export interface CustomPackageConfigRecord {
  enabled: boolean;
  baseFee: number | null;
  // Applied to every custom-package booking this photographer receives —
  // mirrors PackageRecord.bufferMinutes, which is per fixed package instead.
  bufferMinutes: number;
  // Hourly rate (only used when pricingModel === "hourly").
  hourlyRate: number | null;
  baseHours: number | null;
  allowsMultipleSessions: boolean;
  maxSessions: number | null;
  baseFeeMode: "once" | "per_schedule" | null;
  minHours: number | null;
  maxHours: number | null;
  // One pricing method per photographer.
  pricingModel: CustomPricingModel;
  // Rate per day or per person (per_day / per_person).
  unitRate: number | null;
  // Agreed coverage hours per session for per_day / per_person. Scheduling
  // only — never derived from price. null = duration confirmed per booking.
  coverageHours: number | null;
  maxPeople: number | null;
}
export interface CustomPackageConfigInput {
  enabled: boolean;
  base_fee?: number | null;
  base_hours?: number | null;
  buffer_minutes?: number;
  hourly_rate?: number | null;
  allows_multiple_sessions?: boolean;
  max_sessions?: number | null;
  base_fee_mode?: "once" | "per_schedule" | null;
  min_hours?: number | null;
  max_hours?: number | null;
  pricing_model?: CustomPricingModel;
  unit_rate?: number | null;
  coverage_hours?: number | null;
  max_people?: number | null;
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
    baseHours: raw.base_hours ?? null,
    minHours: raw.min_hours ?? null,
    maxHours: raw.max_hours ?? null,
    allowsMultipleSessions: !!raw.allows_multiple_sessions,
    maxSessions: raw.max_sessions ?? null,
    baseFeeMode: raw.base_fee_mode ?? null,
    pricingModel: raw.pricing_model ?? (raw.hourly_rate != null ? "hourly" : "fixed"),
    unitRate: raw.unit_rate == null ? null : Number(raw.unit_rate),
    coverageHours: raw.coverage_hours ?? null,
    maxPeople: raw.max_people ?? null,
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