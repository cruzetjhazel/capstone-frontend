import { useQuery } from "@tanstack/react-query";
import {
  Users, CalendarDays, ShieldAlert, Camera,
  CheckCircle2, Clock, Star, TrendingUp, Eye, Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { adminAnalyticsService } from "@/services/adminAnalyticsService";
import { getApiErrorMessage } from "@/lib/api";

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: "Client Complaints", color: "hsl(199, 89%, 48%)" },
  studio: { label: "Professional Complaints", color: "hsl(25, 40%, 50%)" },
  booking: { label: "Booking Disputes", color: "hsl(25, 80%, 56%)" },
  payment: { label: "Payment Issues", color: "hsl(348, 83%, 47%)" },
  bug: { label: "Platform Issues", color: "hsl(220, 10%, 40%)" },
  other: { label: "Others", color: "hsl(280, 40%, 55%)" },
};

const BOOKING_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "bg-emerald-500" },
  confirmed: { label: "Confirmed", color: "bg-blue-500" },
  accepted: { label: "Accepted (awaiting payment)", color: "bg-sky-500" },
  pending: { label: "Pending", color: "bg-amber-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500" },
  declined: { label: "Declined", color: "bg-rose-400" },
  expired: { label: "Expired", color: "bg-slate-400" },
  no_show: { label: "Not Completed", color: "bg-purple-500" },
  not_completed: { label: "Not Completed", color: "bg-purple-500" },
};

function formatChange(pct: number | null | undefined, suffix: string) {
  if (pct === null || pct === undefined) return { text: `No data ${suffix}`, up: true };
  return { text: `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`, up: pct >= 0 };
}

export default function AdminAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: adminAnalyticsService.get,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center text-sm text-destructive">
          {getApiErrorMessage(error, "Couldn't load platform analytics.")}
        </div>
      </DashboardLayout>
    );
  }

  const { kpis, growth, registrations, user_distribution, verification_pipeline, health, reports_resolution, marketplace } = data;

  const userDistribution = [
    { name: "Clients", value: user_distribution.clients, color: "hsl(25, 55%, 35%)" },
    { name: "Verified Professionals", value: user_distribution.verified_professionals, color: "hsl(25, 40%, 50%)" },
    { name: "Pending Professionals", value: user_distribution.pending_professionals, color: "hsl(35, 80%, 56%)" },
    { name: "Admins", value: user_distribution.admins, color: "hsl(199, 89%, 48%)" },
  ];

  const reportsAnalytics = data.reports_by_type.map((r) => ({
    name: REPORT_TYPE_LABELS[r.type]?.label ?? r.type,
    value: r.count,
    color: REPORT_TYPE_LABELS[r.type]?.color ?? "hsl(220, 10%, 60%)",
  }));

  const bookingStatus = data.booking_status.map((s) => ({
    label: BOOKING_STATUS_STYLES[s.status]?.label ?? s.status,
    percentage: s.percentage,
    count: s.count,
    color: BOOKING_STATUS_STYLES[s.status]?.color ?? "bg-slate-400",
  }));

  const bookingChange = formatChange(kpis.bookings_change_pct, "vs last month");
  const kpiCards = [
    { label: "Total Users", value: kpis.total_users.toLocaleString(), change: `+${kpis.new_users_this_month} this month`, up: true, icon: Users },
    { label: "Active Professionals", value: kpis.active_professionals.toLocaleString(), change: `+${kpis.verified_this_month} verified this month`, up: true, icon: Camera },
    { label: "Bookings This Month", value: kpis.bookings_this_month.toLocaleString(), change: bookingChange.text, up: bookingChange.up, icon: CalendarDays },
    { label: "Open Reports", value: kpis.open_reports.toLocaleString(), change: `${kpis.reports_opened_this_week} opened in the last 7 days`, up: kpis.open_reports === 0, icon: ShieldAlert },
  ];

  const viewsChange =
    marketplace.profile_views_last_month > 0
      ? Math.round(((marketplace.profile_views_this_month - marketplace.profile_views_last_month) / marketplace.profile_views_last_month) * 100)
      : null;

  const tooltipStyle = { backgroundColor: "hsl(25, 15%, 98%)", border: "1px solid hsl(25, 10%, 88%)", borderRadius: "8px", fontSize: "13px" };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up pb-10">
        <div>
          <h1 className="text-2xl font-heading font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor platform health, user growth, and moderation metrics.</p>
        </div>

        {/* ROW 1: KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-xl p-5 shadow-sm border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium">
                <TrendingUp className={`w-3.5 h-3.5 ${kpi.up ? "text-emerald-500" : "text-red-500 rotate-180"}`} />
                <span className={kpi.up ? "text-emerald-500" : "text-red-500"}>{kpi.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 2: GROWTH + DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Platform Growth</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line type="monotone" name="Clients" dataKey="clients" stroke="hsl(25, 55%, 35%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Professionals" dataKey="professionals" stroke="hsl(35, 80%, 56%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">User Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                  {userDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2.5">
              {userDistribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground font-medium">{s.name}</span>
                  </div>
                  <span className="font-bold">{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: BOOKING STATUS + VERIFICATION PIPELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Booking Status Overview</h3>
            {bookingStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No bookings yet.</p>
            ) : (
              <div className="space-y-5 mt-2">
                {bookingStatus.map((status) => (
                  <div key={status.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{status.label}</span>
                      <span className="text-muted-foreground font-semibold">{status.count} · {status.percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${status.color} rounded-full`} style={{ width: `${status.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-semibold mb-2">Verification Pipeline</h3>
              <p className="text-sm text-muted-foreground mb-6">Current professional onboarding statuses.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-amber-600 mb-1">{verification_pipeline.pending}</p>
                <p className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">Pending</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-emerald-600 mb-1">{verification_pipeline.approved}</p>
                <p className="text-xs font-semibold text-emerald-700/70 uppercase tracking-wider">Approved</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-red-600 mb-1">{verification_pipeline.rejected}</p>
                <p className="text-xs font-semibold text-red-700/70 uppercase tracking-wider">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: REPORTS BREAKDOWN + REGISTRATION TREND */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-4">Reports & Disputes Breakdown</h3>
            {reportsAnalytics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No reports submitted yet.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-1/2 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportsAnalytics} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                        {reportsAnalytics.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-3">
                  {reportsAnalytics.map((report) => (
                    <div key={report.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: report.color }} />
                        <span className="text-muted-foreground">{report.name}</span>
                      </div>
                      <span className="font-semibold">{report.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">User Registration Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "5px" }} />
                <Line type="monotone" name="New Clients" dataKey="new_clients" stroke="hsl(25, 55%, 35%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" name="New Professionals" dataKey="new_professionals" stroke="hsl(35, 80%, 56%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 5: MOST ACTIVE PROFESSIONALS */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
            <h3 className="font-heading font-semibold">Most Active Professionals</h3>
            <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border/50">Top 5 Performers</span>
          </div>
          {data.top_professionals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No confirmed or completed bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground bg-muted/10">
                    <th className="px-6 py-3 font-semibold">Professional</th>
                    <th className="px-6 py-3 font-semibold">Platform Bookings</th>
                    <th className="px-6 py-3 font-semibold">Completed Jobs</th>
                    <th className="px-6 py-3 font-semibold">Average Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.top_professionals.map((pro, i) => (
                    <tr key={`${pro.name}-${i}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          {pro.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold">{pro.bookings}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> {pro.completed}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pro.rating === null ? (
                          <span className="text-muted-foreground">No reviews</span>
                        ) : (
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {pro.rating}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ROW 5B: PACKAGE RANKINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: "Most Booked Packages", unit: "bookings", items: data.most_booked_packages ?? [], empty: "No confirmed or completed bookings yet." },
            { title: "Most Favorited Packages", unit: "favorites", items: data.most_favorited_packages ?? [], empty: "No packages have been favorited yet." },
            { title: "Most Favorited Photographers", unit: "favorites", items: data.most_favorited_photographers ?? [], empty: "No photographers have been favorited yet." },
          ].map((card) => (
            <div key={card.title} className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
                <h3 className="font-heading font-semibold">{card.title}</h3>
              </div>
              {card.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">{card.empty}</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {card.items.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.photographer}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap shrink-0 pl-3">{p.count} {card.unit}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ROW 6: HEALTH / MARKETPLACE / RESOLUTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold border-b border-border/50 pb-3">Platform Health</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Verified Professionals</span>
              <span className="font-bold text-emerald-600">{health.verified_pct === null ? "—" : `${health.verified_pct}%`}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Booking Completion Rate</span>
              <span className="font-bold text-primary">{health.completion_rate === null ? "—" : `${health.completion_rate}%`}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Average Rating</span>
              <span className="font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {health.avg_rating === null ? "—" : health.avg_rating}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold border-b border-border/50 pb-3">Marketplace Activity</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Profile Views (This Month)</span>
              <span className="font-bold flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary" /> {marketplace.profile_views_this_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Profile Views (Last Month)</span>
              <span className="font-bold">{marketplace.profile_views_last_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Change</span>
              <span className={`font-bold ${viewsChange === null ? "" : viewsChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {viewsChange === null ? "—" : `${viewsChange >= 0 ? "+" : ""}${viewsChange}%`}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold border-b border-border/50 pb-3">Reports Resolution</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Overall Resolved</span>
              <span className="font-bold text-emerald-600">{reports_resolution.resolved_pct === null ? "—" : `${reports_resolution.resolved_pct}%`}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Avg Resolution Time</span>
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {reports_resolution.avg_resolution_hours === null ? "—" : `${reports_resolution.avg_resolution_hours} hrs`}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Currently Open</span>
              <span className="font-bold text-red-500">{reports_resolution.open} {reports_resolution.open === 1 ? "Ticket" : "Tickets"}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
