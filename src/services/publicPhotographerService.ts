import api from "@/lib/api";

export interface PublicPackage {
  id: number;
  name: string;
  description: string | null;
  includedItems: string[] | null;
  price: number;
  durationMinutes: number;
}

export interface PublicAddOn {
  id: number;
  name: string;
  description: string | null;
  price: number;
}

export interface PublicPhotographerProfile {
  id: number;
  isBookable: boolean;
  businessName: string | null;
  location: string | null;
  coverageArea: string | null;
  style: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  packages: PublicPackage[];
  addOns: PublicAddOn[];
}

export interface CustomPackageComponent {
  id: number;
  type: string;
  tierName: string | null;
  label: string;
  priceAddition: number;
}

export interface CustomPackageConfig {
  enabled: boolean;
  baseFee: number;
}

type RawPackage = {
  id: number; name: string; description: string | null;
  included_items: string[] | null; price: number | string; duration_minutes: number;
};
type RawAddOn = { id: number; name: string; description: string | null; price: number | string };
type RawProfile = {
  id: number; is_bookable: boolean; business_name: string | null; location: string | null;
  coverage_area: string | null; style: string | null; bio: string | null;
  profile_photo_url: string | null;
  packages: RawPackage[]; add_ons: RawAddOn[];
};
type RawComponent = { id: number; type: string; tier_name: string | null; label: string; price_addition: number | string };

// NOTE: PublicPhotographerCustomPackageController's exact response shape
// wasn't confirmed — only the two Resource classes it composes were seen.
// Assuming { config: {...}, components: [...] } as the natural pairing.
// If this 404s or comes back oddly-shaped, that assumption needs correcting.
type RawCustomPackageResponse = {
  config: { enabled: boolean; base_fee: number | string } | null;
  components: RawComponent[];
};

function toPackage(raw: RawPackage): PublicPackage {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    includedItems: raw.included_items,
    price: Number(raw.price),
    durationMinutes: raw.duration_minutes,
  };
}

function toAddOn(raw: RawAddOn): PublicAddOn {
  return { id: raw.id, name: raw.name, description: raw.description, price: Number(raw.price) };
}

function toComponent(raw: RawComponent): CustomPackageComponent {
  return {
    id: raw.id,
    type: raw.type,
    tierName: raw.tier_name,
    label: raw.label,
    priceAddition: Number(raw.price_addition),
  };
}

export const publicPhotographerService = {
  getProfile: async (photographerId: string): Promise<PublicPhotographerProfile> => {
    const res = await api.get(`/photographers/${photographerId}`);
    const raw = res.data.data as RawProfile;
    return {
      id: raw.id,
      isBookable: raw.is_bookable,
      businessName: raw.business_name,
      location: raw.location,
      coverageArea: raw.coverage_area,
      style: raw.style,
      bio: raw.bio,
      profilePhotoUrl: raw.profile_photo_url,
      packages: (raw.packages ?? []).map(toPackage),
      addOns: (raw.add_ons ?? []).map(toAddOn),
    };
  },

  getCustomPackage: async (
    photographerId: string
  ): Promise<{ config: CustomPackageConfig | null; components: CustomPackageComponent[] }> => {
    const res = await api.get(`/photographers/${photographerId}/custom-package`);
    const raw = res.data.data as RawCustomPackageResponse;
    return {
      config: raw.config ? { enabled: raw.config.enabled, baseFee: Number(raw.config.base_fee) } : null,
      components: (raw.components ?? []).map(toComponent),
    };
  },

  getAvailableSlots: async (
    photographerId: string,
    date: string,
    packageId: number
  ): Promise<string[]> => {
    const res = await api.get(`/photographers/${photographerId}/availability/slots`, {
      params: { date, package_id: packageId },
    });
    return res.data.data.start_times as string[];
  },
};