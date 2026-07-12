import api from "@/lib/api";
import type { Photographer, PhotographerListParams, PaginatedResponse } from "@/api/types/photographer";

export const photographerApi = {
  list: (params?: PhotographerListParams) =>
    api.get<PaginatedResponse<Photographer> | Photographer[]>("/photographers", { params }),

  getById: (id: string) =>
    api.get<Photographer>(`/photographers/${id}`),

  featured: () =>
    api.get<Photographer[]>("/photographers/featured"),
};
