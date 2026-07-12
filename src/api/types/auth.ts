export type UserRole = "admin" | "client" | "studio" | "freelancer";

export interface ApiUser {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  initials?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface RegisterClientPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: "client";
}
