import api, { getApiErrorMessage } from "@/lib/api";

export type PhotographerType = "freelancer" | "studio";
export type ApplicationStatus = "draft" | "pending_review" | "revision_requested" | "approved" | "rejected";

export interface PhotographerApplication {
  status: ApplicationStatus;
  photographerType: PhotographerType;
  businessName: string;
  location: string;
  yearsActive: number | null;
  teamSize: number | null;
  services: string[];
  otherServices: string;
  coverageArea: string | null;   // backend enum value, e.g. "bulan_nearby"
  shootingTypes: string[];       // backend enum values, e.g. ["indoor","hybrid"]
  priceMin: number | null;
  priceMax: number | null;
  documentsSubmitted: {
    governmentId: boolean;
    selfieWithId: boolean;
    businessPermit: boolean;
    additionalDocuments: number;
  };
}

type RawApplication = {
  status: ApplicationStatus;
  photographer_type: PhotographerType;
  business_name: string | null;
  location: string | null;
  years_active: number | null;
  team_size: number | null;
  services: string[] | null;
  other_services: string | null;
  coverage_area: string | null;
  shooting_types: string[] | null;
  price_min: number | string | null;
  price_max: number | string | null;
  documents_submitted?: {
    government_id?: boolean;
    selfie_with_id?: boolean;
    business_permit?: boolean;
    additional_documents?: number;
  };
};

function toApplication(raw: RawApplication): PhotographerApplication {
  return {
    status: raw.status,
    photographerType: raw.photographer_type,
    businessName: raw.business_name ?? "",
    location: raw.location ?? "",
    yearsActive: raw.years_active ?? null,
    teamSize: raw.team_size ?? null,
    services: raw.services ?? [],
    otherServices: raw.other_services ?? "",
    coverageArea: raw.coverage_area ?? null,
    shootingTypes: raw.shooting_types ?? [],
    priceMin: raw.price_min != null ? Number(raw.price_min) : null,
    priceMax: raw.price_max != null ? Number(raw.price_max) : null,
    documentsSubmitted: {
      governmentId: !!raw.documents_submitted?.government_id,
      selfieWithId: !!raw.documents_submitted?.selfie_with_id,
      businessPermit: !!raw.documents_submitted?.business_permit,
      additionalDocuments: raw.documents_submitted?.additional_documents ?? 0,
    },
  };
}

export interface ApplicationUpdatePayload {
  business_name: string;
  location: string;
  years_active: number;
  team_size?: number; // only sent for photographer_type === "studio"
  services: string[];
  other_services?: string | null;
  coverage_area: string;
  shooting_types: string[];
  price_min: number;
  price_max: number;
}

export const photographerApplicationService = {
  get: async (): Promise<PhotographerApplication> => {
    const res = await api.get("/photographer/application");
    return toApplication(res.data.data as RawApplication);
  },

  update: async (payload: ApplicationUpdatePayload): Promise<PhotographerApplication> => {
    const res = await api.patch("/photographer/application", payload);
    return toApplication(res.data.data as RawApplication);
  },

  /** These document routes stream a private file and require the Bearer
   * token, so they can't be plain <a href> links — fetch as a blob and
   * hand back an object URL the caller opens, then revokes. */
  downloadDocument: async (type: "government_id" | "selfie_with_id" | "business_permit"): Promise<string> => {
    const res = await api.get(`/photographer/application/documents/${type}`, { responseType: "blob" });
    return URL.createObjectURL(res.data as Blob);
  },
};

export { getApiErrorMessage };