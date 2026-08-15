import api from "@/lib/api";

export const searchLogApi = {
  log: (term: string) => api.post("/search-logs", { term }),
  popular: (limit = 4) => api.get("/search-logs/popular", { params: { limit } }),
};