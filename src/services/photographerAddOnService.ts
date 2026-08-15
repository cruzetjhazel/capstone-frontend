import api from "@/lib/api";

export type AddOnStatus = "active" | "archived";

interface RawAddOn {
  id: number | string;
  name: string;
  description: string | null;
  price: number | string;
  status: AddOnStatus;
  created_at: string;
  updated_at: string;
}

export interface AddOnRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  status: AddOnStatus;
}

export interface AddOnInput {
  name: string;
  description?: string | null;
  price: number;
}

function toAddOn(raw: RawAddOn): AddOnRecord {
  return {
    id: String(raw.id),
    name: raw.name,
    description: raw.description ?? "",
    price: Number(raw.price),
    status: raw.status,
  };
}

export const photographerAddOnService = {
  list: async (): Promise<AddOnRecord[]> => {
    const res = await api.get("/photographer/add-ons");
    return (res.data.data as RawAddOn[]).map(toAddOn);
  },
  create: async (input: AddOnInput): Promise<AddOnRecord> => {
    const res = await api.post("/photographer/add-ons", input);
    return toAddOn(res.data.data);
  },
  update: async (id: string, input: AddOnInput): Promise<AddOnRecord> => {
    const res = await api.patch(`/photographer/add-ons/${id}`, input);
    return toAddOn(res.data.data);
  },
  archive: async (id: string): Promise<AddOnRecord> => {
    const res = await api.post(`/photographer/add-ons/${id}/archive`);
    return toAddOn(res.data.data);
  },
  restore: async (id: string): Promise<AddOnRecord> => {
    const res = await api.post(`/photographer/add-ons/${id}/restore`);
    return toAddOn(res.data.data);
  },
  destroy: async (id: string): Promise<void> => {
    await api.delete(`/photographer/add-ons/${id}`);
  },
};