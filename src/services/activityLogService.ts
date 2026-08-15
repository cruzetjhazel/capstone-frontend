import api from "@/lib/api";

export type ActivityLogCategory = "bookings" | "payments" | "packages" | "clients" | "other";

export interface ActivityLogEntry {
  id: string;
  category: ActivityLogCategory;
  title: string;
  description: string;
  causerName: string | null;
  date: string; // ISO string
}

type RawActivityLog = {
  id: number;
  category?: string | null;
  title?: string | null;
  action: string;
  description: string;
  causer: { id: number; name: string } | null;
  subject_type: string | null;
  subject_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const KNOWN_CATEGORIES: ActivityLogCategory[] = ["bookings", "payments", "packages", "clients"];

// Derives a display category from the machine-readable `action` (e.g.
// "booking.accepted" -> "bookings") when the backend doesn't send a
// `category` field directly, or sends one outside the known set.
function deriveCategory(raw: RawActivityLog): ActivityLogCategory {
  if (raw.category && KNOWN_CATEGORIES.includes(raw.category as ActivityLogCategory)) {
    return raw.category as ActivityLogCategory;
  }
  const prefix = raw.action.split(".")[0];
  const plural = prefix.endsWith("s") ? prefix : `${prefix}s`;
  return KNOWN_CATEGORIES.includes(plural as ActivityLogCategory) ? (plural as ActivityLogCategory) : "other";
}

// Falls back to a humanized version of `action` (e.g. "booking.accepted" ->
// "Booking Accepted") when the backend doesn't send a `title`.
function deriveTitle(raw: RawActivityLog): string {
  if (raw.title) return raw.title;
  return raw.action
    .split(".")
    .join(" ")
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toActivityLog(raw: RawActivityLog): ActivityLogEntry {
  return {
    id: String(raw.id),
    category: deriveCategory(raw),
    title: deriveTitle(raw),
    description: raw.description,
    causerName: raw.causer?.name ?? null,
    date: raw.created_at,
  };
}

export const activityLogService = {
  list: async (): Promise<ActivityLogEntry[]> => {
    const res = await api.get("/photographer/activity-logs");
    // Real endpoint paginates (per_page, default 20) — .data.data holds the
    // page of results, matching the paginator shape Laravel returns wrapped
    // inside this project's ApiResponses trait.
    return (res.data.data as RawActivityLog[]).map(toActivityLog);
  },
};