import { photographerApi } from "@/api/photographers";
import type { PhotographerListParams } from "@/api/types/photographer";
import { defaultCustomRates } from "@/data/photographers";
import type { PublicProfile } from "@/data/mockProfiles";

/**
 * Raw shape returned by Laravel's PhotographerPublicProfileResource.
 * Keep in sync with app/Http/Resources/PhotographerPublicProfileResource.php.
 */
interface RawPhotographerProfile {
  id: number | string;
  is_bookable: boolean;
  photographer_type: string | null; // e.g. "studio" | "freelancer"
  business_name: string | null;
  location: string | null;
  coverage_area: string | null;
  services: string[] | null;
  starting_price: number | string | null;
  max_price: number | string | null;
  style: string[] | null;
  bio: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  social_links: {
    facebook: string | null;
    instagram: string | null;
    website: string | null;
  };
  phone: string | null;
  email: string | null;
  portfolio: Array<{ url?: string; image_url?: string; path?: string } | string>;
  packages: Array<Record<string, unknown>>;
  add_ons: Array<Record<string, unknown>>;

  // Not currently returned by the backend resource — see chat notes.
  // Included here (optional) so normalizeProfile picks them up automatically
  // the moment the backend starts sending them, with no frontend change needed.
  rating?: number;
  reviews_count?: number;
  favorites_count?: number;
}

interface RawCustomPackage {
  config: {
    enabled: boolean;
    base_fee: number | string | null;
  };
  // Confirmed against PublicCustomPackageComponentResource.php — it actually sends
  // type + tier_name too, previously dropped when flattened into `extras` below.
  components: Array<{
    id: number | string;
    type: "flat_option" | "tier_option";
    tier_name: string | null;
    label: string;
    price_addition: number | string;
  }>;
}

function unwrapList<T>(data: T[] | { data: T[] }): T[] {
  return Array.isArray(data) ? data : data.data;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

// NOTE: `id`, `duration_minutes`, and `buffer_minutes` aren't declared on
// PublicProfile's package type (see mockProfiles.ts) so callers that need
// them read via `(pkg as any)` — same pattern already used elsewhere in
// this codebase (e.g. BookingReceipt.tsx's `(booking as any).totalPrice`).
// Both are required to call the availability endpoints and to submit a
// real booking's package_id.
function normalizePackage(raw: Record<string, unknown>) {
  const durationMinutes = raw.duration_minutes != null ? toNumber(raw.duration_minutes) : undefined;
  return {
    id: toNumber(raw.id),
    name: String(raw.name ?? raw.title ?? "Package"),
    price: toNumber(raw.price ?? raw.base_price),
    hours: durationMinutes != null ? durationMinutes / 60 : toNumber(raw.hours ?? raw.duration_hours, 1),
    photos: toNumber(raw.photos ?? raw.photo_count),
    description: String(raw.description ?? raw.desc ?? ""),
    // `included_items` is the real field name from PackageResource; the others are kept as
    // fallbacks in case this is ever fed a differently-shaped source.
    inclusions: Array.isArray(raw.included_items)
      ? (raw.included_items as string[])
      : Array.isArray(raw.inclusions)
        ? (raw.inclusions as string[])
        : Array.isArray(raw.features)
          ? (raw.features as string[])
          : [],
    duration_minutes: durationMinutes ?? toNumber(raw.hours ?? raw.duration_hours, 1) * 60,
    buffer_minutes: toNumber(raw.buffer_minutes, 0),
  };
}

interface RawAddOn {
  id?: number | string;
  name?: string;
  label?: string;
  description?: string | null;
  price?: number | string;
}
function normalizeAddOn(raw: RawAddOn) {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.label ?? "Add-on"),
    description: String(raw.description ?? ""),
    price: toNumber(raw.price),
  };
}

function normalizePortfolioItem(item: RawPhotographerProfile["portfolio"][number]): string {
  if (typeof item === "string") return item;
  return item.url ?? item.image_url ?? item.path ?? "";
}

/**
 * Maps the Laravel PhotographerPublicProfileResource shape into the
 * PublicProfile shape every page/component already renders
 * (Explore, Photographers, FeaturedStudiosSection, PhotographerProfile).
 */
function normalizeProfile(raw: RawPhotographerProfile): PublicProfile {
  const name = raw.business_name ?? "Unnamed Studio";
  const type: "Studio" | "Freelancer" =
    raw.photographer_type?.toLowerCase() === "freelancer" ? "Freelancer" : "Studio";

  return {
    id: String(raw.id),
    name,
    type,
    specialty: raw.services?.[0] ?? raw.style?.[0] ?? "Photography",
    rating: toNumber(raw.rating),
    reviews: toNumber(raw.reviews_count),
    priceMin: toNumber(raw.starting_price),
    priceMax: toNumber(raw.max_price),
    location: raw.location ?? raw.coverage_area ?? "Bulan, Sorsogon",
    avatar: initialsFrom(name),
    avatarUrl: raw.profile_photo_url ?? undefined,
    coverUrl: raw.cover_photo_url ?? undefined,
    styles: raw.style ?? [],
    services: raw.services ?? [],
    about: raw.bio ?? "",
    // Defensive filter: only surface published packages publicly, in case the backend
    // resource itself doesn't already scope this (worth confirming server-side too).
    packages: (raw.packages ?? [])
      .filter((pkg) => {
        const status = (pkg as Record<string, unknown>).status;
        return status ? status === "published" : true;
      })
      .map(normalizePackage),
    bookedSlots: [], // fetched separately via /photographers/{id}/availability/*
    reviewList: [],  // not returned by this resource
    portfolio: (raw.portfolio ?? []).map(normalizePortfolioItem).filter(Boolean),
    customRates: { ...defaultCustomRates, extras: [] }, // real extras merged in getById(); list() stays lightweight
    socials: {
      facebook: raw.social_links?.facebook ?? undefined,
      instagram: raw.social_links?.instagram ?? undefined,
      website: raw.social_links?.website ?? undefined,
    },
    phone: raw.phone ?? undefined,
    email: raw.email ?? undefined,

    // PublicProfile extras
    status: "approved",
    featured: false,
    favoriteCount: raw.favorites_count,

    addOns: (raw.add_ons ?? []).map(normalizeAddOn),
  };
}

function isApprovedProfile(profile: PublicProfile): boolean {
  return profile.status ? profile.status === "approved" : true;
}

export const photographerService = {
  /** Public explore listing — approved profiles only. */
  async list(params?: PhotographerListParams): Promise<PublicProfile[]> {
    const { data } = await photographerApi.list({ ...params, status: "approved" });
    return unwrapList<RawPhotographerProfile>(data as RawPhotographerProfile[]).map(normalizeProfile);
  },

  /** Public profile detail — approved only. */
  async getById(id: string): Promise<PublicProfile | undefined> {
    try {
      const { data } = await photographerApi.getById(id);
      // Backend wraps every response as { data: ..., message: ... } — list()/featured()
      // already unwrap this via unwrapList(), getById() just never did.
      const rawProfile = ((data as any)?.data ?? data) as RawPhotographerProfile;
      const profile = normalizeProfile(rawProfile);

      try {
        const { data: cp } = await photographerApi.getCustomPackage(id);
        const raw = ((cp as any)?.data ?? cp) as RawCustomPackage;
        profile.customRates = {
          ...profile.customRates,
          baseFee: raw.config.enabled ? toNumber(raw.config.base_fee, defaultCustomRates.baseFee) : defaultCustomRates.baseFee,
          extras: raw.config.enabled
            ? raw.components.map((c) => ({
                id: String(c.id),
                label: c.label,
                price: toNumber(c.price_addition),
                // Additive — not used by the current flat CustomRates.extras renderer yet,
                // but preserved so a future tier-grouped calculator UI doesn't need another
                // backend round trip to get this. Safe: existing consumers only read id/label/price.
                type: c.type,
                tierName: c.tier_name,
              }))
            : [],
        };
      } catch {
        // custom-package fetch failing shouldn't break the whole profile load
      }

      return profile;
    } catch {
      return undefined;
    }
  },

  /** Homepage featured studios ranked by popularity/favorites (backend already sorts + limits to 5). */
  async featured(): Promise<PublicProfile[]> {
    const { data } = await photographerApi.featured();
    return unwrapList<RawPhotographerProfile>(data as RawPhotographerProfile[])
      .map(normalizeProfile)
      .filter(isApprovedProfile);
  },
};

export async function fetchPhotographer(id: string) {
  return photographerService.getById(id);
}

export type { PublicProfile };