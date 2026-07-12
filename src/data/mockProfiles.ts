import type { Photographer } from "@/data/photographers";
import { allPhotographers } from "@/data/photographers";
import type { ApplicationRecord } from "@/api/types/application";
import { defaultCustomRates } from "@/data/photographers";

export type ProfileStatus = "approved" | "pending" | "rejected" | "suspended";

export interface PublicProfile extends Photographer {
  status: ProfileStatus;
  featured: boolean;
  ownerEmail?: string;
  applicationId?: string;
}

/** In-memory profile registry — replace with Laravel API. */
let profiles: PublicProfile[] = allPhotographers.map((p) => ({
  ...p,
  status: "approved" as ProfileStatus,
  featured: ["1", "2", "3", "4", "8"].includes(p.id),
}));

export function mockListProfiles(): PublicProfile[] {
  return [...profiles];
}

export function mockListApprovedProfiles(): PublicProfile[] {
  return profiles.filter((p) => p.status === "approved");
}

export function mockGetProfile(id: string): PublicProfile | undefined {
  return profiles.find((p) => p.id === id);
}

export function mockGetApprovedProfile(id: string): PublicProfile | undefined {
  const p = profiles.find((p) => p.id === id);
  return p?.status === "approved" ? p : undefined;
}

export function mockListFeaturedProfiles(): PublicProfile[] {
  return profiles.filter((p) => p.status === "approved" && p.featured);
}

export function mockSetFeaturedIds(ids: string[]): PublicProfile[] {
  profiles = profiles.map((p) => ({
    ...p,
    featured: p.status === "approved" && ids.includes(p.id),
  }));
  return mockListFeaturedProfiles();
}

export function mockGetFeaturedIds(): string[] {
  return profiles.filter((p) => p.featured).map((p) => p.id);
}

export function mockCreateProfileFromApplication(app: ApplicationRecord): PublicProfile {
  const id = `prof_${Date.now()}`;
  const profile: PublicProfile = {
    id,
    name: app.business_name,
    type: app.role === "studio" ? "Studio" : "Freelancer",
    specialty: app.services[0] ?? "Photography",
    rating: 0,
    reviews: 0,
    priceMin: Number(app.price_min) || 0,
    priceMax: Number(app.price_max) || 0,
    location: app.address,
    avatar: app.business_name.slice(0, 2).toUpperCase(),
    services: app.services,
    about: app.bio,
    packages: app.packages.map((pkg) => ({
      name: pkg.name,
      price: Number(pkg.price) || 0,
      hours: 2,
      photos: 50,
      description: pkg.desc,
      inclusions: [pkg.desc].filter(Boolean),
    })),
    bookedSlots: [],
    reviewList: [],
    portfolio: [],
    customRates: { ...defaultCustomRates },
    socials: {
      facebook: app.facebook,
      instagram: app.instagram,
      website: app.website,
    },
    status: "approved",
    featured: false,
    ownerEmail: app.email,
    applicationId: app.id,
  };
  profiles = [profile, ...profiles];
  return profile;
}

export function mockSuspendProfile(id: string): void {
  profiles = profiles.map((p) => (p.id === id ? { ...p, status: "suspended" } : p));
}

export function mockClearProfiles() {
  profiles = [];
}
