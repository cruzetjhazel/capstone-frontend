import api, { getApiErrorMessage } from "@/lib/api";

export interface ClientProfile {
  name: string;
  email: string;
  phoneNumber: string | null;
  birthday: string | null; // "YYYY-MM-DD"
  gender: string | null;
  address: string | null;
  profilePhotoUrl: string | null;
}

type RawClientProfile = {
  name: string;
  email: string;
  phone_number: string | null;
  birthday: string | null;
  gender: string | null;
  address: string | null;
  profile_photo_url: string | null;
};

function toClientProfile(raw: RawClientProfile): ClientProfile {
  return {
    name: raw.name,
    email: raw.email,
    phoneNumber: raw.phone_number,
    birthday: raw.birthday,
    gender: raw.gender,
    address: raw.address,
    profilePhotoUrl: raw.profile_photo_url,
  };
}

export interface UpdateClientProfilePayload {
  name?: string;
  phone_number?: string | null;
  birthday?: string | null;
  gender?: string | null;
  address?: string | null;
  profile_photo?: File;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const clientProfileService = {
  get: async (): Promise<ClientProfile> => {
    const res = await api.get("/client/profile");
    return toClientProfile(res.data.data);
  },

  update: async (payload: UpdateClientProfilePayload): Promise<ClientProfile> => {
    const hasFile = !!payload.profile_photo;

    // PHP doesn't parse multipart bodies on PUT/PATCH the way it does on POST,
    // so a real file upload has to go as POST with a _method override — a
    // plain axios.patch() with FormData would silently drop the file.
    if (hasFile) {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value as any);
      });
      const res = await api.post("/client/profile", formData);
      return toClientProfile(res.data.data);
    }

    const res = await api.patch("/client/profile", payload);
    return toClientProfile(res.data.data);
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.post("/client/change-password", payload);
  },

  // DeactivateAccountRequest.php requires confirmation === 'DEACTIVATE' exactly.
  deactivate: async (confirmation: string): Promise<void> => {
    await api.post("/client/deactivate", { confirmation });
  },
};

export { getApiErrorMessage };