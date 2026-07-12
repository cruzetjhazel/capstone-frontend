import { env } from "@/config/env";
import api from "@/lib/api";
import {
  mockGetFeaturedIds,
  mockListApprovedProfiles,
  mockSetFeaturedIds,
} from "@/data/mockProfiles";

export const featuredService = {
  async listFeaturedIds(): Promise<string[]> {
    if (env.useMockApi) {
      return mockGetFeaturedIds();
    }
    const { data } = await api.get<{ ids: string[] }>("/admin/featured");
    return data.ids;
  },

  async listAvailableStudios() {
    if (env.useMockApi) {
      return mockListApprovedProfiles().filter((p) => p.type === "Studio");
    }
    const { data } = await api.get("/admin/featured/candidates");
    return data;
  },

  async updateFeaturedIds(ids: string[]): Promise<string[]> {
    if (env.useMockApi) {
      mockSetFeaturedIds(ids);
      return ids;
    }
    const { data } = await api.put<{ ids: string[] }>("/admin/featured", { ids });
    return data.ids;
  },
};
