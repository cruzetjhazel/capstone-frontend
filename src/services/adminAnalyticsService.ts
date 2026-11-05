import api from "@/lib/api";

export interface AdminAnalytics {
  year: number | null;
  available_years: number[];
  notes: string[];
  kpis: {
    new_users: number;
    total_users: number;
    approved_professionals: number;
    active_professionals: number;
    bookings: number;
    bookings_change_pct: number | null;
    reports: number;
    open_reports: number;
  };
  growth: { label: string; clients: number; professionals: number }[];
  growth_granularity: "month" | "year";
  user_distribution: { clients: number; photographers: number; admins: number };
  reports_by_type: { type: string; count: number }[];
  booking_status: { status: string; count: number; percentage: number }[];
  verification_pipeline: { pending: number; approved: number; rejected: number };
  top_professionals: { name: string; bookings: number; completed: number; rating: number | null }[];
  health: { verified_pct: number | null; completion_rate: number | null; avg_rating: number | null };
  reports_resolution: { resolved_pct: number | null; avg_resolution_hours: number | null; open: number };
  marketplace: { views: number; previous_views: number | null; change_pct: number | null };
  most_booked_packages: { name: string; photographer: string; count: number }[];
  most_favorited_packages: { name: string; photographer: string; count: number }[];
  most_favorited_photographers: { name: string; photographer: string; count: number }[];
}

export const adminAnalyticsService = {
  async get(year?: number | null): Promise<AdminAnalytics> {
    const res = await api.get("/admin/analytics", { params: year ? { year } : undefined });
    return res.data?.data ?? res.data;
  },
};