export type { Photographer, Package, Review, BookedSlot, CustomRates } from "@/data/photographers";

export interface PhotographerListParams {
  service?: string;
  type?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  location?: string;
  date?: string;
  availability?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
