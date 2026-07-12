import { env } from "@/config/env";
import { applicationApi } from "@/api/applications";
import type { ApplicationRecord, ApplicationStatus, StudioApplicationPayload } from "@/api/types/application";
import {
  mockListApplications,
  mockSaveApplication,
  mockUpdateApplicationStatus,
  mockGetApplication,
} from "@/data/mockApplications";
import { mockCreateProfileFromApplication } from "@/data/mockProfiles";

/** Shape used by Register.tsx and AdminVerifications.tsx (camelCase). */
export interface PendingApplication {
  id: string;
  role: "freelancer" | "studio";
  status: ApplicationStatus;
  submittedAt: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  yearsExp?: string;
  yearsOperating?: string;
  teamSize?: string;
  services: string[];
  areaCoverage: string;
  shootingTypes: string[];
  priceMin: string;
  priceMax: string;
  packages: { name: string; price: string; desc: string }[];
  bio: string;
  equipment?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
  tiktok?: string;
  twitter?: string;
  behance?: string;
  flickr?: string;
  docs: {
    governmentIdName?: string;
    selfieWithIdName?: string;
    businessPermitName?: string;
    portfolioSampleNames?: string[];
  };
  adminNote?: string;
}

function toRecord(app: PendingApplication): ApplicationRecord {
  return {
    id: app.id,
    role: app.role,
    status: app.status,
    submitted_at: app.submittedAt,
    name: app.name,
    email: app.email,
    phone: app.phone,
    password: "",
    password_confirmation: "",
    business_name: app.businessName,
    address: app.address,
    years_exp: app.yearsExp,
    years_operating: app.yearsOperating,
    team_size: app.teamSize,
    services: app.services,
    area_coverage: app.areaCoverage,
    shooting_types: app.shootingTypes,
    price_min: app.priceMin,
    price_max: app.priceMax,
    packages: app.packages,
    bio: app.bio,
    equipment: app.equipment,
    facebook: app.facebook,
    instagram: app.instagram,
    website: app.website,
    tiktok: app.tiktok,
    twitter: app.twitter,
    behance: app.behance,
    flickr: app.flickr,
    admin_note: app.adminNote,
    docs: {
      government_id_name: app.docs.governmentIdName,
      selfie_with_id_name: app.docs.selfieWithIdName,
      business_permit_name: app.docs.businessPermitName,
      portfolio_sample_names: app.docs.portfolioSampleNames,
    },
  };
}

function fromRecord(r: ApplicationRecord): PendingApplication {
  return {
    id: r.id,
    role: r.role,
    status: r.status,
    submittedAt: r.submitted_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    businessName: r.business_name,
    address: r.address,
    yearsExp: r.years_exp,
    yearsOperating: r.years_operating,
    teamSize: r.team_size,
    services: r.services,
    areaCoverage: r.area_coverage,
    shootingTypes: r.shooting_types,
    priceMin: r.price_min,
    priceMax: r.price_max,
    packages: r.packages,
    bio: r.bio,
    equipment: r.equipment,
    facebook: r.facebook,
    instagram: r.instagram,
    website: r.website,
    tiktok: r.tiktok,
    twitter: r.twitter,
    behance: r.behance,
    flickr: r.flickr,
    adminNote: r.admin_note,
    docs: {
      governmentIdName: r.docs?.government_id_name,
      selfieWithIdName: r.docs?.selfie_with_id_name,
      businessPermitName: r.docs?.business_permit_name,
      portfolioSampleNames: r.docs?.portfolio_sample_names,
    },
  };
}

export const applicationService = {
  async list(): Promise<PendingApplication[]> {
    if (env.useMockApi) {
      return mockListApplications().map(fromRecord);
    }
    const { data } = await applicationApi.list();
    return data.map(fromRecord);
  },

  async submit(app: PendingApplication): Promise<void> {
    if (env.useMockApi) {
      mockSaveApplication(toRecord(app));
      return;
    }
    await applicationApi.submit(toRecord(app) as unknown as StudioApplicationPayload);
  },

  async updateStatus(id: string, status: ApplicationStatus, adminNote?: string): Promise<void> {
    if (env.useMockApi) {
      mockUpdateApplicationStatus(id, status, adminNote);
      if (status === "approved") {
        const app = mockGetApplication(id);
        if (app) mockCreateProfileFromApplication(app);
      }
      return;
    }
    await applicationApi.updateStatus(id, status, adminNote);
  },
};

/** Backward-compatible exports for existing imports. */
export type { ApplicationStatus };
export const listApplications = () => applicationService.list();
export const saveApplication = (app: PendingApplication) => applicationService.submit(app);
export const updateApplicationStatus = (
  id: string,
  status: ApplicationStatus,
  adminNote?: string,
) => applicationService.updateStatus(id, status, adminNote);
