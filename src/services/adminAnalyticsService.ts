import api from "@/lib/api";

export interface AdminAnalytics {
  kpis: {
    total_users: number;
    new_users_this_month: number;
    active_professionals: number;
    verified_this_month: number;
    bookings_this_month: number;
    bookings_change_pct: number | null;
    open_reports: number;
    reports_opened_this_week: number;
  };
  growth: { month: string; clients: number; professionals: number }[];
  registrations: { month: string; new_clients: number; new_professionals: number }[];
  user_distribution: {
    clients: number;
    verified_professionals: number;
    pending_professionals: number;
    admins: number;
  };
  reports_by_type: { type: string; count: number }[];
  booking_status: { status: string; count: number; percentage: number }[];
  verification_pipeline: { pending: number; approved: number; rejected: number };
  top_professionals: { name: string; bookings: number; completed: number; rating: number | null }[];
  health: { verified_pct: number | null; completion_rate: number | null; avg_rating: number | null };
  reports_resolution: { resolved_pct: number | null; avg_resolution_hours: number | null; open: number };
  marketplace: { profile_views_this_month: number; profile_views_last_month: number };
  most_booked_packages?: { name: string; photographer: string; count: number }[];
  most_favorited_packages?: { name: string; photographer: string; count: number }[];
  most_favorited_photographers?: { name: string; photographer: string; count: number }[];
}

export const adminAnalyticsService = {
  async get(): Promise<AdminAnalytics> {
    const res = await api.get("/admin/analytics");
    return res.data?.data ?? res.data;
  },
};