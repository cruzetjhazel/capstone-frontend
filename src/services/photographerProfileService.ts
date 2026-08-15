import api, { getApiErrorMessage } from "@/lib/api";

export interface PhotographerProfile {
  bio: string;
  style: string[];
  facebook: string;
  instagram: string;
  website: string;
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
}

type RawProfile = {
  bio: string | null;
  style: string[] | null;
  facebook: string | null;
  instagram: string | null;
  website: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
};

function toProfile(raw: RawProfile): PhotographerProfile {
  return {
    bio: raw.bio ?? "",
    style: raw.style ?? [],
    facebook: raw.facebook ?? "",
    instagram: raw.instagram ?? "",
    website: raw.website ?? "",
    profilePhotoUrl: raw.profile_photo_url ?? null,
    coverPhotoUrl: raw.cover_photo_url ?? null,
  };
}

export interface ProfileFormPayload {
  bio: string;
  style: string[];
  facebook: string;
  instagram: string;
  website: string;
  profilePhoto?: File | null;
  coverPhoto?: File | null;
}

function buildFormData(payload: ProfileFormPayload): FormData {
  const fd = new FormData();
  fd.append("bio", payload.bio);
  payload.style.forEach((s) => fd.append("style[]", s));
  if (payload.facebook.trim()) fd.append("facebook", payload.facebook.trim());
  if (payload.instagram.trim()) fd.append("instagram", payload.instagram.trim());
  if (payload.website.trim()) fd.append("website", payload.website.trim());
  if (payload.profilePhoto) fd.append("profile_photo", payload.profilePhoto);
  if (payload.coverPhoto) fd.append("cover_photo", payload.coverPhoto);
  return fd;
}

export const photographerProfileService = {
  /** Returns null if no profile exists yet (a photographer who somehow
   * reached Settings without finishing Step 7 — shouldn't normally happen,
   * but handled rather than crashing). */
  get: async (): Promise<PhotographerProfile | null> => {
    try {
      const res = await api.get("/photographer/profile");
      return toProfile(res.data.data as RawProfile);
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  create: async (payload: ProfileFormPayload): Promise<PhotographerProfile> => {
    const res = await api.post("/photographer/profile", buildFormData(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toProfile(res.data.data as RawProfile);
  },

  // Laravel can't parse multipart PATCH bodies, so this POSTs with a
  // _method=PATCH override — same pattern already proven in clientProfileService.ts
  // and in this same file's existing GCash upload.
  update: async (payload: ProfileFormPayload): Promise<PhotographerProfile> => {
    const fd = buildFormData(payload);
    fd.append("_method", "PATCH");
    const res = await api.post("/photographer/profile", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toProfile(res.data.data as RawProfile);
  },
};

export { getApiErrorMessage };