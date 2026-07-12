export type ApplicantRole = "freelancer" | "studio";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";

export interface VerificationDocs {
  government_id_name?: string;
  selfie_with_id_name?: string;
  business_permit_name?: string;
  portfolio_sample_names?: string[];
}

export interface StudioApplicationPayload {
  role: ApplicantRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  business_name: string;
  address: string;
  years_exp?: string;
  years_operating?: string;
  team_size?: string;
  services: string[];
  area_coverage: string;
  shooting_types: string[];
  price_min: string;
  price_max: string;
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
}

export interface ApplicationRecord extends StudioApplicationPayload {
  id: string;
  status: ApplicationStatus;
  submitted_at: string;
  admin_note?: string;
  docs?: VerificationDocs;
}
