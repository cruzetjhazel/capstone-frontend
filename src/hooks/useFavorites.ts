import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export interface FavoritePhotographer {
  id: number;
  photographerId: string;
  businessName: string | null;
  style: string | null;
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
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
  const token = getAuthToken();
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
  const token = getAuthToken();
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

const FAVORITES_QUERY_KEY = ["favorites"];

export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => favoriteService.list(),
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photographerId: string) => favoriteService.add(photographerId),
    onMutate: async (photographerId: string) => {
      await qc.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = qc.getQueryData<FavoritePhotographer[]>(FAVORITES_QUERY_KEY);
      qc.setQueryData<FavoritePhotographer[]>(FAVORITES_QUERY_KEY, (old = []) => [
        ...old,
        {
          id: -1,
          photographerId,
          businessName: null,
          style: null,
          profilePhotoUrl: null,
          coverPhotoUrl: null,
          isAvailable: true,
          favoritedAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (_err, _photographerId, context) => {
      if (context?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photographerId: string) => favoriteService.remove(photographerId),
    onMutate: async (photographerId: string) => {
      await qc.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = qc.getQueryData<FavoritePhotographer[]>(FAVORITES_QUERY_KEY);
      qc.setQueryData<FavoritePhotographer[]>(FAVORITES_QUERY_KEY, (old = []) =>
        old.filter((f) => f.photographerId !== photographerId)
      );
      return { previous };
    },
    onError: (_err, _photographerId, context) => {
      if (context?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });
}

// ---------- Package favorites ----------

export interface FavoritePackage {
  id: number;
  packageId: string;
  photographerId: string;
  photographerName: string | null;
  profilePhotoUrl: string | null;
  name: string;
  description: string | null;
  includedItems: string[];
  price: number;
  outdoorPrice: number | null;
  durationMinutes: number | null;
  isAvailable: boolean;
  favoritedAt: string;
}

type RawFavoritePackage = {
  id: number;
  package_id: number;
  photographer_id: number;
  photographer_name: string | null;
  profile_photo_url: string | null;
  name: string;
  description: string | null;
  included_items: Array<string | { name: string; detail?: string }> | null;
  price: string | number;
  outdoor_price: string | number | null;
  duration_minutes: number | null;
  is_available: boolean;
  favorited_at: string;
};

function toFavoritePackage(raw: RawFavoritePackage): FavoritePackage {
  return {
    id: raw.id,
    packageId: String(raw.package_id),
    photographerId: String(raw.photographer_id),
    photographerName: raw.photographer_name,
    profilePhotoUrl: raw.profile_photo_url,
    name: raw.name,
    description: raw.description,
    includedItems: (raw.included_items ?? []).map((i) => (typeof i === "string" ? i : i.name)),
    price: Number(raw.price),
    outdoorPrice: raw.outdoor_price != null ? Number(raw.outdoor_price) : null,
    durationMinutes: raw.duration_minutes,
    isAvailable: raw.is_available,
    favoritedAt: raw.favorited_at,
  };
}

export const favoritePackageService = {
  list: async (): Promise<FavoritePackage[]> => {
    const raw = await apiRequest<RawFavoritePackage[]>("/client/favorites/packages");
    return raw.map(toFavoritePackage);
  },
  add: async (packageId: string): Promise<FavoritePackage> => {
    const raw = await apiMutate<RawFavoritePackage>(`/client/favorites/packages/${packageId}`, "POST");
    return toFavoritePackage(raw);
  },
  remove: async (packageId: string): Promise<void> => {
    await apiMutate<null>(`/client/favorites/packages/${packageId}`, "DELETE");
  },
};

const FAVORITE_PACKAGES_QUERY_KEY = ["favorite-packages"];

export function useFavoritePackages(enabled = true) {
  return useQuery({
    queryKey: FAVORITE_PACKAGES_QUERY_KEY,
    queryFn: () => favoritePackageService.list(),
    enabled,
  });
}

export function useAddFavoritePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) => favoritePackageService.add(packageId),
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITE_PACKAGES_QUERY_KEY }),
  });
}

export function useRemoveFavoritePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) => favoritePackageService.remove(packageId),
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITE_PACKAGES_QUERY_KEY }),
  });
}