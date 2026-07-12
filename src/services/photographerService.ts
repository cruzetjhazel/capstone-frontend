import { env } from "@/config/env";
import { photographerApi } from "@/api/photographers";
import type { PhotographerListParams } from "@/api/types/photographer";
import type { PublicProfile } from "@/data/mockProfiles";
import {
  mockListApprovedProfiles,
  mockGetApprovedProfile,
  mockListFeaturedProfiles,
} from "@/data/mockProfiles";

function unwrapList(data: PublicProfile[] | { data: PublicProfile[] }): PublicProfile[] {
  return Array.isArray(data) ? data : data.data;
}

export const photographerService = {
  /** Public explore listing — approved profiles only. */
  async list(params?: PhotographerListParams): Promise<PublicProfile[]> {
    if (env.useMockApi) {
      return mockListApprovedProfiles();
    }
    const { data } = await photographerApi.list({ ...params, status: "approved" } as PhotographerListParams);
    return unwrapList(data as PublicProfile[]);
  },

  /** Public profile detail — approved only. */
  async getById(id: string): Promise<PublicProfile | undefined> {
    if (env.useMockApi) {
      return mockGetApprovedProfile(id);
    }
    try {
      const { data } = await photographerApi.getById(id);
      return data as PublicProfile;
    } catch {
      return undefined;
    }
  },

  /** Admin-curated featured studios for homepage. */
  async featured(): Promise<PublicProfile[]> {
    if (env.useMockApi) {
      return mockListFeaturedProfiles();
    }
    const { data } = await photographerApi.featured();
    return data as PublicProfile[];
  },
};

export async function fetchPhotographer(id: string) {
  return photographerService.getById(id);
}

export type { PublicProfile };
