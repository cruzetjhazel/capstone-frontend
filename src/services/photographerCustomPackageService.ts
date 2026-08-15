import api from "@/lib/api";

export type CustomComponentType = "flat_option" | "tier_option";
export type CustomComponentStatus = "active" | "archived";

interface RawConfig {
  enabled: boolean;
  base_fee: number | string | null;
  updated_at: string;
}
export interface CustomPackageConfigRecord {
  enabled: boolean;
  baseFee: number | null;
}
export interface CustomPackageConfigInput {
  enabled: boolean;
  base_fee: number | null;
}

interface RawComponent {
  id: number | string;
  type: CustomComponentType;
  tier_name: string | null;
  label: string;
  price_addition: number | string;
  status: CustomComponentStatus;
}
export interface CustomComponentRecord {
  id: string;
  type: CustomComponentType;
  tierName: string | null;
  label: string;
  priceAddition: number;
  status: CustomComponentStatus;
}
export interface CustomComponentInput {
  type: CustomComponentType;
  tier_name?: string | null;
  label: string;
  price_addition: number;
}

function toConfig(raw: RawConfig): CustomPackageConfigRecord {
  return { enabled: raw.enabled, baseFee: raw.base_fee === null ? null : Number(raw.base_fee) };
}
function toComponent(raw: RawComponent): CustomComponentRecord {
  return {
    id: String(raw.id),
    type: raw.type,
    tierName: raw.tier_name ?? null,
    label: raw.label,
    priceAddition: Number(raw.price_addition),
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