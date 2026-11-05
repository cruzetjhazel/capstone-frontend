import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Users, CalendarDays, ShieldAlert, Camera,
  CheckCircle2, Clock, Star, Eye, Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { adminAnalyticsService } from "@/services/adminAnalyticsService";
import { getApiErrorMessage } from "@/lib/api";
import { AdminStatCard } from "@/components/AdminStatCard";

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: "Client Complaints", color: "hsl(199, 89%, 48%)" },
  studio: { label: "Photographer Complaints", color: "hsl(25, 40%, 50%)" },
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
  waitlisted: { label: "Waitlisted", color: "bg-orange-400" },
  no_show: { label: "Not Completed", color: "bg-purple-500" },
  not_completed: { label: "Not Completed", color: "bg-purple-500" },
};

function formatChange(pct: number | null | undefined, suffix: string) {
  if (pct === null || pct === undefined) return { text: `No data ${suffix}`, up: true };
  return { text: `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`, up: pct >= 0 };
}

function CardTitle({ title, scope, className = "mb-6" }: { title: string; scope: string; className?: string }) {
  return (
    <div className={className}>
      <h3 className="font-heading font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{scope}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [year, setYear] = useState<number | null>(null); // null = All Time
  const { data: fresh, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "analytics", year],
    queryFn: () => adminAnalyticsService.get(year),
    staleTime: 60_000,
  });

  // Keep showing the previous numbers (dimmed) while a new year loads, instead of a blank page.
  const lastData = useRef(fresh);
  if (fresh) lastData.current = fresh;
  const data = fresh ?? lastData.current;

  if (isLoading && !data) {
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
          {year !== null && (
            <button onClick={() => setYear(null)} className="block mx-auto mt-3 text-xs font-medium text-primary hover:underline">
              Back to all time
            </button>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const { kpis, growth, user_distribution, verification_pipeline, health, reports_resolution, marketplace } = data;

  // Labels follow the data actually on screen (data.year), so dimmed old data is never mislabelled.
  const shownYear = data.year ?? null;
  const yr = shownYear !== null;
  const period = yr ? `Jan–Dec ${shownYear}` : "All Time";
  const prevYear = yr ? (shownYear as number) - 1 : null;

  const userDistribution = [
    { name: "Clients", value: user_distribution.clients, color: "hsl(199, 89%, 48%)" },
    { name: "Photographers", value: user_distribution.photographers, color: "hsl(25, 55%, 35%)" },
    { name: "Admins", value: user_distribution.admins, color: "hsl(220, 10%, 45%)" },
  ];
  const userDistributionTotal = userDistribution.reduce((sum, u) => sum + u.value, 0);

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

  const bookingChange = yr
    ? formatChange(kpis.bookings_change_pct, `vs ${prevYear}`)
    : { text: "requests created", up: true };

  const kpiCards = [
    {
      label: yr ? "New Users" : "Total Users",
      value: kpis.new_users.toLocaleString(),
      change: `${period} · accounts registered`,
      up: true,
      icon: Users,
    },
    {
      label: "Photographers",
      value: kpis.approved_professionals.toLocaleString(),
      change: `${period} · applications approved`,
      up: true,
      icon: Camera,
    },
    {
      label: "Booking Requests",
      value: kpis.bookings.toLocaleString(),
      change: `${period} · ${bookingChange.text}`,
      up: bookingChange.up,
      icon: CalendarDays,
    },
    {
      label: "Reports Submitted",
      value: kpis.reports.toLocaleString(),
      change: `${period} · ${kpis.open_reports} open now (current)`,
      up: kpis.open_reports === 0,
      icon: ShieldAlert,
    },
  ];

  const growthScope = yr
    ? `${period}. Running total at the end of each month. Clients by registration date, photographers by approval date.`
    : data.growth_granularity === "year"
      ? "All Time. Running total at the end of each year. Clients by registration date, photographers by approval date."
      : "All Time. Running total at the end of each month. Clients by registration date, photographers by approval date.";

  const tooltipStyle = { backgroundColor: "hsl(25, 15%, 98%)", border: "1px solid hsl(25, 10%, 88%)", borderRadius: "8px", fontSize: "13px" };

  const packageCards = [
    {
      title: "Most Booked Packages",
      scope: `${period}. Top 5 by confirmed and completed bookings created in the period.`,
      unit: "bookings",
      items: data.most_booked_packages ?? [],
      empty: yr ? `No confirmed or completed bookings created in ${shownYear}.` : "No confirmed or completed bookings yet.",
    },
    {
      title: "Most Favorited Packages",
      scope: "Current snapshot. Top 5 by favorites right now; removed favorites are not kept, so there is no yearly history.",
      unit: "favorites",
      items: data.most_favorited_packages ?? [],
      empty: "No packages have been favorited yet.",
    },
    {
      title: "Most Favorited Photographers",
      scope: "Current snapshot. Top 5 by favorites right now; removed favorites are not kept, so there is no yearly history.",
      unit: "favorites",
      items: data.most_favorited_photographers ?? [],
      empty: "No photographers have been favorited yet.",
    },
  ];

  return (
    <DashboardLayout>
      <div className={`max-w-7xl mx-auto space-y-6 animate-fade-up pb-10 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor platform health, user growth, and moderation metrics.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Showing <span className="font-semibold text-foreground">{period}</span>. Items marked "current" always show today's figures.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />}
            <label htmlFor="analytics-year" className="text-xs text-muted-foreground">Year</label>
            <select
              id="analytics-year"
              value={year ?? "all"}
              onChange={(e) => setYear(e.target.value === "all" ? null : Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Time</option>
              {(data.available_years ?? []).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 1: KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <AdminStatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              color="bg-primary/10 text-primary"
              change={{ text: kpi.change, up: kpi.up }}
            />
          ))}
        </div>

        {/* ROW 2: GROWTH + DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <CardTitle title="Platform Growth" scope={growthScope} />
            {growth.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">No data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Line type="monotone" name="Clients" dataKey="clients" stroke="hsl(199, 89%, 48%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Photographers" dataKey="professionals" stroke="hsl(25, 55%, 35%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <CardTitle
              title="User Distribution"
              scope={`${period}. Accounts registered in the period, by account type. Photographers include accounts not yet approved.`}
            />
            {userDistributionTotal === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                {yr ? `No accounts registered in ${shownYear}.` : "No accounts yet."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={userDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                    {userDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
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
            <CardTitle
              title="Booking Status Overview"
              scope={`${period}. Booking requests created in the period, grouped by their current status.`}
            />
            {bookingStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {yr ? `No booking requests created in ${shownYear}.` : "No bookings yet."}
              </p>
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
              <CardTitle
                title="Verification Pipeline"
                scope={`Pending is the current queue (current snapshot). Approved and rejected are decisions from ${period} (drafts not counted).`}
              />
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

        {/* ROW 4: REPORTS BREAKDOWN + RESOLUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <CardTitle
              title="Reports & Disputes Breakdown"
              scope={`${period}. Reports submitted in the period, grouped by report type.`}
              className="mb-4"
            />
            {reportsAnalytics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                {yr ? `No reports submitted in ${shownYear}.` : "No reports submitted yet."}
              </p>
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

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <CardTitle
              title="Reports Resolution"
              scope={`${period}. How the reports submitted in the period are being handled.`}
              className="border-b border-border/50 pb-3"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Reports Resolved or Closed</span>
              <span className="font-bold text-emerald-600">{reports_resolution.resolved_pct === null ? "—" : `${reports_resolution.resolved_pct}%`}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Still Open</span>
              <span className="font-bold">{reports_resolution.open}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Avg Resolution Time</span>
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {reports_resolution.avg_resolution_hours === null ? "—" : `${reports_resolution.avg_resolution_hours} hrs`}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 5: MOST ACTIVE PHOTOGRAPHERS */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center gap-3 bg-muted/20">
            <div>
              <h3 className="font-heading font-semibold">Most Active Photographers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {period}. Confirmed and completed bookings created in the period. Rating covers all reviews.
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border/50 shrink-0">{`Top 5, ${period}`}</span>
          </div>
          {data.top_professionals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {yr ? `No confirmed or completed bookings created in ${shownYear}.` : "No confirmed or completed bookings yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Photographer</th>
                    <th className="px-4 py-3 font-semibold">Confirmed + Completed Bookings</th>
                    <th className="px-4 py-3 font-semibold">Completed Jobs</th>
                    <th className="px-4 py-3 font-semibold">Average Rating (all-time)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.top_professionals.map((pro, i) => (
                    <tr key={`${pro.name}-${i}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          {pro.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{pro.bookings}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> {pro.completed}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
          {packageCards.map((card) => (
            <div key={card.title} className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
                <h3 className="font-heading font-semibold">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{card.scope}</p>
              </div>
              {card.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center px-4">{card.empty}</p>
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

        {/* ROW 6: HEALTH + MARKETPLACE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <CardTitle
              title="Platform Health"
              scope={`Completion rate: bookings created ${yr ? `in ${shownYear}` : "(All Time)"}, completed ÷ (completed + cancelled + not completed). Average rating: All Time.`}
              className="border-b border-border/50 pb-3"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Booking Completion Rate</span>
              <span className="font-bold text-primary">{health.completion_rate === null ? "—" : `${health.completion_rate}%`}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Average Rating (all reviews)</span>
              <span className="font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {health.avg_rating === null ? "—" : health.avg_rating}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <CardTitle
              title="Marketplace Activity"
              scope={`${period}. Unique daily visitors to photographer profiles (one visitor counts once per profile per day).`}
              className="border-b border-border/50 pb-3"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Profile Views{yr ? ` (${shownYear})` : ""}</span>
              <span className="font-bold flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary" /> {marketplace.views.toLocaleString()}</span>
            </div>
            {yr && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Profile Views ({prevYear})</span>
                  <span className="font-bold">{(marketplace.previous_views ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Change vs {prevYear}</span>
                  <span className={`font-bold ${marketplace.change_pct === null ? "" : marketplace.change_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {marketplace.change_pct === null ? "—" : `${marketplace.change_pct >= 0 ? "+" : ""}${marketplace.change_pct}%`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {(data.notes ?? []).length > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Data notes</p>
            {data.notes.map((n) => <p key={n}>{n}</p>)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}