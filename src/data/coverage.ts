export type CoverageArea =
  | "bulan_only" | "bulan_nearby" | "anywhere_sorsogon"
  | "travel_outside_sorsogon" | "travel_outside_bicol" | null | undefined;

// EDIT THIS LIST: the municipalities you count as "nearby" for bulan_nearby.
export const NEARBY_MUNICIPALITIES = ["bulan", "irosin", "juban", "casiguran", "barcelona", "matnog"];

export const BICOL_PROVINCES = [
  "albay", "camarines norte", "camarines sur", "catanduanes", "masbate", "sorsogon",
];

const KNOWN: string[] = [
  "bulan_only", "bulan_nearby", "anywhere_sorsogon", "travel_outside_sorsogon", "travel_outside_bicol",
];

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().trim().replace(/^city of\s+/, "").replace(/\s+city$/, "");

// Null or an unrecognised value restricts nothing (and warns), so options never vanish silently.
function known(area: CoverageArea): boolean {
  if (area && !KNOWN.includes(area)) console.warn("[coverage] Unrecognised coverage_area value:", area);
  return !!area && KNOWN.includes(area);
}

// "Outside Bicol" is only for photographers who travel outside Bicol.
export function allowedLocationTypes(area: CoverageArea, all: string[]): string[] {
  return known(area) && area !== "travel_outside_bicol" ? all.filter((t) => t !== "Outside Bicol") : all;
}

// Every province in our location tables is in Bicol, so only the three Sorsogon-limited tiers narrow this.
export function provinceAllowed(area: CoverageArea, provinceName: string): boolean {
  const sorsogonOnly = area === "bulan_only" || area === "bulan_nearby" || area === "anywhere_sorsogon";
  return !sorsogonOnly || norm(provinceName) === "sorsogon";
}

export function cityAllowed(area: CoverageArea, cityName: string): boolean {
  if (area === "bulan_only") return norm(cityName) === "bulan";
  if (area === "bulan_nearby") return NEARBY_MUNICIPALITIES.includes(norm(cityName));
  return true; // anywhere_sorsogon, travel_outside_sorsogon, travel_outside_bicol, null/unknown
}

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Short label for profile pages and cards. */
export function coverageLabel(area: CoverageArea): string {
  switch (area) {
    case "bulan_only": return "Bulan Only";
    case "bulan_nearby": return "Bulan and Nearby Municipalities";
    case "anywhere_sorsogon": return "Anywhere in Sorsogon";
    case "travel_outside_sorsogon": return "Travel Outside Sorsogon";
    case "travel_outside_bicol": return "Travel Outside Bicol";
    default: return "";
  }
}

/** Sentence shown in the booking form. */
export function coverageNote(area: CoverageArea): string | null {
  switch (area) {
    case "bulan_only": return "This photographer only accepts clients in Bulan.";
    case "bulan_nearby":
      return `This photographer only accepts clients in Bulan and nearby municipalities (${NEARBY_MUNICIPALITIES.filter((m) => m !== "bulan").map(cap).join(", ")}).`;
    case "anywhere_sorsogon": return "This photographer only accepts clients within Sorsogon.";
    case "travel_outside_sorsogon": return "This photographer accepts clients anywhere in Bicol.";
    case "travel_outside_bicol": return "This photographer also travels outside Bicol.";
    default: return null;
  }
}
function parsePlace(raw: string) {
  const parts = raw.split(",").map((p) => p.trim().toLowerCase());
  return { municipality: parts[0] ?? "", province: parts[parts.length - 1] ?? "", hasProvince: parts.length > 1 };
}

/** Can a photographer with this coverage tier serve an event at "Municipality, Province"? */
export function servesPlace(area: CoverageArea, whereText: string): boolean {
  const { municipality, province, hasProvince } = parsePlace(whereText.trim());
  if (municipality === "bulan") return true; // everyone's home turf

  // Unset coverage is treated as the most conservative tier for search.
  switch (area ?? "bulan_only") {
    case "bulan_only": return false;
    case "bulan_nearby": return province === "sorsogon" && NEARBY_MUNICIPALITIES.includes(municipality);
    case "anywhere_sorsogon": return province === "sorsogon";
    // Travels anywhere in Bicol. No comma = province unknown, so don't exclude them.
    case "travel_outside_sorsogon": return !hasProvince || BICOL_PROVINCES.includes(province);
    case "travel_outside_bicol": return true;
    default: return false;
  }
}

const ALL_TIERS: CoverageArea[] = [
  "bulan_only", "bulan_nearby", "anywhere_sorsogon", "travel_outside_sorsogon", "travel_outside_bicol",
];

/** One-line hint for the search UI: which coverage tiers can serve the typed place. */
export function placeCoverageHint(whereText: string): string | null {
  const q = whereText.trim();
  if (!q || q.toLowerCase() === "anywhere") return null;
  const matching = ALL_TIERS.filter((t) => servesPlace(t, q));
  if (matching.length === ALL_TIERS.length) return `Every photographer covers ${q}.`;
  if (matching.length === 0) return null;
  return `Showing photographers whose coverage includes ${q}: ${matching.map(coverageLabel).join(", ")}.`;
}