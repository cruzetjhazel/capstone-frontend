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
  average_rating?: number | string | null;
  reviews_count?: number;
  total_reviews?: number;
  reviews?: RawReview[] | { data?: RawReview[] } | null;
  favorites_count?: number;
}

interface RawReview {
  id?: number | string;
  rating?: number | string | null;
  comment?: string | null;
  text?: string | null;
  reply?: string | null;
  photographer_reply?: string | null;
  created_at?: string | null;
  date?: string | null;
  client?: { name?: string | null } | null;
  user?: { name?: string | null } | null;
  client_name?: string | null;
  name?: string | null;
}

interface RawCustomPackage {
  config: {
    enabled: boolean;
    base_fee: number | string | null;
    // Optional sliding-hours pricing — see PublicCustomPackageConfigResource.php.
    // Null/absent means this photographer only offers the discrete duration-
    // component picker (unchanged existing behavior).
    hourly_rate?: number | string | null;
    min_hours?: number | null;
    max_hours?: number | null;
  };
  // Confirmed against PublicCustomPackageComponentResource.php — it actually sends
  // type + tier_name too, previously dropped when flattened into `extras` below.
  // duration_minutes is null on every component except the one(s) a photographer
  // set up to represent a selectable photography coverage duration.
  components: Array<{
    id: number | string;
    type: "flat_option" | "tier_option";
    tier_name: string | null;
    label: string;
    price_addition: number | string;
    duration_minutes: number | string | null;
  }>;
}

function unwrapList<T>(data: T[] | { data: T[] }): T[] {
  return Array.isArray(data) ? data : data.data;
}

function unwrapApiData<T>(value: T | { data?: T }): T {
  if (typeof value === "object" && value !== null && "data" in value && value.data !== undefined) {
    return value.data as T;
  }
  return value as T;
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

function unwrapReviews(value: RawPhotographerProfile["reviews"]): RawReview[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.data) ? value.data : [];
}

function normalizeReview(raw: RawReview, index: number) {
  const name = raw.client?.name ?? raw.user?.name ?? raw.client_name ?? raw.name ?? "Client";
  const rating = Math.max(0, Math.min(5, toNumber(raw.rating)));
  const date = raw.created_at ?? raw.date ?? "";
  return {
    id: String(raw.id ?? `review-${index}`),
    name,
    avatar: initialsFrom(name),
    rating,
    date,
    text: raw.comment ?? raw.text ?? "",
    reply: raw.reply ?? raw.photographer_reply ?? undefined,
  };
}

/**
 * Maps the Laravel PhotographerPublicProfileResource shape into the
 * PublicProfile shape every page/component already renders
 * (Explore, Photographers, FeaturedStudiosSection, PhotographerProfile).
 */
function normalizeProfile(raw: RawPhotographerProfile): PublicProfile {
  const rawReviews = unwrapReviews(raw.reviews);
  const reviewList = rawReviews.map(normalizeReview);
  const calculatedRating = reviewList.length > 0
    ? reviewList.reduce((sum, review) => sum + review.rating, 0) / reviewList.length
    : 0;
  const averageRating = raw.average_rating ?? raw.rating ?? calculatedRating;
  const reviewCount = rawReviews.length > 0
    ? rawReviews.length
    : raw.reviews_count ?? raw.total_reviews ?? 0;
  const name = raw.business_name ?? "Unnamed Studio";
  const type: "Studio" | "Freelancer" =
    raw.photographer_type?.toLowerCase() === "freelancer" ? "Freelancer" : "Studio";

  return {
    id: String(raw.id),
    name,
    type,
    specialty: raw.services?.[0] ?? raw.style?.[0] ?? "Photography",
    rating: toNumber(averageRating),
    reviews: toNumber(reviewCount),
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
    reviewList,
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
      const rawProfile = unwrapApiData<RawPhotographerProfile>(data);
      const profile = normalizeProfile(rawProfile);

      if (profile.reviewList.length === 0) {
        try {
          const { data: reviewsResponse } = await photographerApi.getReviews(id);
          const reviewsPayload = unwrapApiData<RawReview[] | { data?: RawReview[] }>(reviewsResponse);
          const reviewList = unwrapReviews(reviewsPayload as RawPhotographerProfile["reviews"]).map(normalizeReview);
          profile.reviewList = reviewList;
          if (profile.reviews === 0) profile.reviews = reviewList.length;
          if (profile.rating === 0 && reviewList.length > 0) {
            profile.rating = Number((reviewList.reduce((sum, review) => sum + review.rating, 0) / reviewList.length).toFixed(1));
          }
        } catch {
          // Public review endpoint is optional; retain the profile's empty state when unavailable.
        }
      }

      try {
        const { data: cp } = await photographerApi.getCustomPackage(id);
        const raw = unwrapApiData<RawCustomPackage>(cp);
        profile.customRates = {
          ...profile.customRates,
          baseFee: raw.config.enabled ? toNumber(raw.config.base_fee, defaultCustomRates.baseFee) : defaultCustomRates.baseFee,
          hourlyRate: raw.config.enabled && raw.config.hourly_rate != null ? toNumber(raw.config.hourly_rate) : null,
          minHours: raw.config.enabled ? (raw.config.min_hours ?? null) : null,
          maxHours: raw.config.enabled ? (raw.config.max_hours ?? null) : null,
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
                // Present only on the option(s) representing a selectable
                // coverage duration — Booking.tsx reads this to compute the
                // reserved window preview. See PublicCustomPackageComponentResource.php.
                durationMinutes: c.duration_minutes != null ? toNumber(c.duration_minutes) : undefined,
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