import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { locationService, type Province, type CityMunicipality, type Barangay } from "@/services/locationService";

export const SESSION_LOCATION_TYPES = ["Studio", "Client Location", "Outdoor Location", "Outside Bicol", "Other"];
const needsPsgc = (t: string) => t === "Client Location" || t === "Outdoor Location" || t === "Other";
const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "_");

export interface SessionLocation {
  locationType: string;
  provinceId: number | null;
  cityMunicipalityId: number | null;
  barangayId: number | null;
  address: string;
  summary: string; // human-readable one-liner for the booking summary
}

export const emptySessionLocation = (): SessionLocation => ({
  locationType: SESSION_LOCATION_TYPES[0],
  provinceId: null,
  cityMunicipalityId: null,
  barangayId: null,
  address: "",
  summary: SESSION_LOCATION_TYPES[0],
});

export function isSessionLocationComplete(l: SessionLocation): boolean {
  if (!l.locationType) return false;
  if (needsPsgc(l.locationType)) return !!(l.provinceId && l.cityMunicipalityId && l.barangayId && l.address.trim());
  if (l.locationType === "Outside Bicol") return !!l.address.trim();
  return true;
}

// Snake_case fields exactly as CreateBookingRequest.php expects them for an
// additional_schedules entry.
export function sessionLocationPayload(l: SessionLocation) {
  return {
    location_type: slug(l.locationType),
    ...(needsPsgc(l.locationType)
      ? { province_id: l.provinceId!, city_municipality_id: l.cityMunicipalityId!, barangay_id: l.barangayId! }
      : {}),
    ...(l.address.trim() ? { event_address: l.address.trim() } : {}),
  };
}

const selectCls = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function SessionLocationFields({
  value, onChange,
}: {
  value: SessionLocation;
  onChange: (v: SessionLocation) => void;
}) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<CityMunicipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  useEffect(() => {
    locationService.getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (value.provinceId == null) { setCities([]); return; }
    locationService.getCitiesMunicipalities(value.provinceId).then(setCities).catch(() => setCities([]));
  }, [value.provinceId]);

  useEffect(() => {
    if (value.cityMunicipalityId == null) { setBarangays([]); return; }
    locationService.getBarangays(value.cityMunicipalityId).then(setBarangays).catch(() => setBarangays([]));
  }, [value.cityMunicipalityId]);

  // Keep a readable one-line summary in sync for the booking summary panel.
  useEffect(() => {
    const parts = [
      barangays.find((b) => b.id === value.barangayId)?.name,
      cities.find((c) => c.id === value.cityMunicipalityId)?.name,
      provinces.find((p) => p.id === value.provinceId)?.name,
    ].filter(Boolean);
    const summary =
      value.locationType +
      (parts.length ? ` — ${parts.join(", ")}` : "") +
      (value.address.trim() ? ` (${value.address.trim()})` : "");
    if (summary !== value.summary) onChange({ ...value, summary });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinces, cities, barangays, value.locationType, value.provinceId, value.cityMunicipalityId, value.barangayId, value.address]);

  return (
    <div className="space-y-2">
      <select
        className={selectCls}
        value={value.locationType}
        onChange={(e) => onChange({ ...emptySessionLocation(), locationType: e.target.value, summary: e.target.value })}
      >
        {SESSION_LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      {needsPsgc(value.locationType) && (
        <>
          <select
            className={selectCls}
            value={value.provinceId ?? ""}
            onChange={(e) => onChange({ ...value, provinceId: e.target.value ? Number(e.target.value) : null, cityMunicipalityId: null, barangayId: null })}
          >
            <option value="">Select province…</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className={selectCls}
            value={value.cityMunicipalityId ?? ""}
            disabled={!value.provinceId}
            onChange={(e) => onChange({ ...value, cityMunicipalityId: e.target.value ? Number(e.target.value) : null, barangayId: null })}
          >
            <option value="">Select city/municipality…</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className={selectCls}
            value={value.barangayId ?? ""}
            disabled={!value.cityMunicipalityId}
            onChange={(e) => onChange({ ...value, barangayId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Select barangay…</option>
            {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </>
      )}

      {(needsPsgc(value.locationType) || value.locationType === "Outside Bicol") && (
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder={value.locationType === "Outside Bicol" ? "Full address" : "Specific address / venue"}
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}