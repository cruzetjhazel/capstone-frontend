// If your shared axios instance isn't a default export at "@/lib/api",
// adjust this one import line to match (e.g. `import { api } from "@/lib/api"`).
import api from "@/lib/api";

export interface PortfolioImage {
  id: number;
  url: string;
  status: "active" | "archived";
  sort_order: number;
  created_at: string;
}

export const photographerPortfolioService = {
  /** All of the photographer's portfolio images (active + archived), ordered. */
  async list(): Promise<PortfolioImage[]> {
    const { data } = await api.get("/photographer/portfolio");
    return data.data;
  },

  /** Upload one new image. Backend appends it to the end of the current order. */
  async upload(file: File): Promise<PortfolioImage> {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await api.post("/photographer/portfolio", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  /**
   * Move an image out of the active showcase into the Safe Archive.
   * Images can only be permanently deleted from there (backend enforces this).
   */
  async archive(id: number): Promise<PortfolioImage> {
    const { data } = await api.post(`/photographer/portfolio/${id}/archive`);
    return data.data;
  },

  async restore(id: number): Promise<PortfolioImage> {
    const { data } = await api.post(`/photographer/portfolio/${id}/restore`);
    return data.data;
  },

  /** Permanently deletes an image. Only works if it's already archived. */
  async destroy(id: number): Promise<void> {
    await api.delete(`/photographer/portfolio/${id}`);
  },

  /** Persists a new display order for the active images. */
  async reorder(orderedIds: number[]): Promise<PortfolioImage[]> {
    const { data } = await api.patch("/photographer/portfolio/reorder", {
      order: orderedIds,
    });
    return data.data;
  },
};