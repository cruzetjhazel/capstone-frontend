import api from "@/lib/api";

export interface Province {
  id: number;
  name: string;
}

export interface CityMunicipality {
  id: number;
  provinceId: number;
  name: string;
  type: "city" | "municipality";
}

export interface Barangay {
  id: number;
  cityMunicipalityId: number;
  name: string;
}

type RawProvince = { id: number; psgc_code: string; name: string };
type RawCityMunicipality = { id: number; psgc_code: string; province_id: number; name: string; type: "city" | "municipality" };
type RawBarangay = { id: number; psgc_code: string; city_municipality_id: number; name: string };

export const locationService = {
  getProvinces: async (): Promise<Province[]> => {
    const res = await api.get("/locations/provinces");
    return (res.data.data as RawProvince[]).map((p) => ({ id: p.id, name: p.name }));
  },

  getCitiesMunicipalities: async (provinceId: number): Promise<CityMunicipality[]> => {
    const res = await api.get("/locations/cities-municipalities", { params: { province_id: provinceId } });
    return (res.data.data as RawCityMunicipality[]).map((c) => ({
      id: c.id,
      provinceId: c.province_id,
      name: c.name,
      type: c.type,
    }));
  },

  getBarangays: async (cityMunicipalityId: number): Promise<Barangay[]> => {
    const res = await api.get("/locations/barangays", { params: { city_municipality_id: cityMunicipalityId } });
    return (res.data.data as RawBarangay[]).map((b) => ({
      id: b.id,
      cityMunicipalityId: b.city_municipality_id,
      name: b.name,
    }));
  },
};