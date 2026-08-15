import { AUTH_TOKEN_KEY } from "@/config/env";

const API_BASE = "http://127.0.0.1:8000/api";

export interface FavoritePhotographer {
  id: number;
  photographerId: string;
  businessName: string | null;
  style: string | null;
  profilePhotoUrl: string | null;
  isAvailable: boolean;
  favoritedAt: string;
}

type RawFavorite = {
  id: number;
  photographer_id: number;
  business_name: string | null;
  style: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  is_available: boolean;
  favorited_at: string;
};

function toFavorite(raw: RawFavorite): FavoritePhotographer {
  return {
    id: raw.id,
    photographerId: String(raw.photographer_id),
    businessName: raw.business_name,
    style: raw.style,
    profilePhotoUrl: raw.profile_photo_url,
    coverPhotoUrl: raw.cover_photo_url,
    isAvailable: raw.is_available,
    favoritedAt: raw.favorited_at,
  };
}

async function apiRequest<T>(path: string): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || `Request failed (${response.status}).`);
  return json.data as T;
}

async function apiMutate<T>(path: string, method: "POST" | "DELETE"): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = json.errors
      ? Object.entries(json.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join(" | ")
      : "";
    throw new Error(fieldErrors || json.message || `Request failed (${response.status}).`);
  }
  return json.data as T;
}

export const favoriteService = {
  list: async (): Promise<FavoritePhotographer[]> => {
    const raw = await apiRequest<RawFavorite[]>("/client/favorites");
    return raw.map(toFavorite);
  },

  add: async (photographerId: string): Promise<FavoritePhotographer> => {
    const raw = await apiMutate<RawFavorite>(`/client/favorites/${photographerId}`, "POST");
    return toFavorite(raw);
  },

  remove: async (photographerId: string): Promise<void> => {
    await apiMutate<null>(`/client/favorites/${photographerId}`, "DELETE");
  },
};