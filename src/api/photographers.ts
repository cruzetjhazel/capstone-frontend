import api from "@/lib/api";
import type { Photographer, PhotographerListParams, PaginatedResponse } from "@/api/types/photographer";

export const photographerApi = {
  list: (params?: PhotographerListParams) =>
    api.get<PaginatedResponse<Photographer> | Photographer[]>("/photographers", { params }),

  getById: (id: string) =>
    api.get<Photographer>(`/photographers/${id}`, { params: { include: "reviews" } }),

  getReviews: (id: string) =>
    api.get(`/photographers/${id}/reviews`),

  featured: () =>
    api.get<Photographer[]>("/photographers/featured"),

  // Was missing entirely — photographerService.ts's getById() already called this,
  // but the error was silently swallowed by its try/catch, so the "Build Your Own"
  // calculator section on the public profile never received real base fee / tier data.
  getCustomPackage: (id: string) =>
    api.get(`/photographers/${id}/custom-package`),
};