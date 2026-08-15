import { useEffect, useState } from "react";
import { DollarSign, CalendarDays, Star, ArrowUpRight, ArrowDownRight, Users, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

interface MonthlyPoint {
  month: string;
  revenue: number;
  bookings: number;
}

interface ServiceSlice {
  name: string;
  value: number;
}

interface TopClient {
  name: string;
  bookings: number;
  spent: number;
}

interface Kpis {
  totalRevenue: number;
  revenueChangePct: number | null;
  bookingsThisMonth: number;
  bookingsChange: number;
  avgRating: number | null;
}

interface AnalyticsData {
  kpis: Kpis;
  monthly: MonthlyPoint[];
  serviceMix: ServiceSlice[];
  topClients: TopClient[];
}

// Service-mix slice colors are assigned client-side, cycling through this palette,
// since the backend only returns names + percentages.
const SLICE_COLORS = [
  "hsl(25, 55%, 35%)",
  "hsl(25, 40%, 50%)",
  "hsl(35, 80%, 56%)",
  "hsl(199, 89%, 48%)",
  "hsl(25, 20%, 70%)",
];

const formatPHP = (value: number) => `₱${Math.round(value).toLocaleString()}`;

function mapAnalytics(raw: any): AnalyticsData {
  return {
    kpis: {
      totalRevenue: raw.kpis.total_revenue,
      revenueChangePct: raw.kpis.revenue_change_pct,
      bookingsThisMonth: raw.kpis.bookings_this_month,
      bookingsChange: raw.kpis.bookings_change,
      avgRating: raw.kpis.avg_rating,
    },
    monthly: raw.monthly.map((m: any) => ({ month: m.month, revenue: m.revenue, bookings: m.bookings })),
    serviceMix: raw.service_mix.map((s: any) => ({ name: s.name, value: s.value })),
    topClients: raw.top_clients.map((c: any) => ({ name: c.name, bookings: c.bookings, spent: c.spent })),
  };
}

function exportToCsv(data: AnalyticsData) {
  const lines: string[] = [];

  lines.push("KPIs");
  lines.push("Metric,Value");
  lines.push(`Total Revenue (this month),${data.kpis.totalRevenue}`);
  lines.push(`Bookings (this month),${data.kpis.bookingsThisMonth}`);
  lines.push(`Average Rating,${data.kpis.avgRating ?? ""}`);
  lines.push("");

  lines.push("Monthly Trend");
  lines.push("Month,Revenue,Bookings");
  data.monthly.forEach((m) => lines.push(`${m.month},${m.revenue},${m.bookings}`));
  lines.push("");

  lines.push("Service Mix");
  lines.push("Service,Share (%)");
  data.serviceMix.forEach((s) => lines.push(`${s.name},${s.value}`));
  lines.push("");

  lines.push("Top Clients");
  lines.push("Client,Bookings,Spent");
  data.topClients.forEach((c) => lines.push(`${c.name},${c.bookings},${c.spent}`));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function StudioAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data: res } = await api.get("/photographer/analytics");
        if (!cancelled) setData(mapAnalytics(res.data));
      } catch (error) {
        if (!cancelled) setLoadError(getApiErrorMessage(error, "Couldn't load your analytics."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = () => {
    if (!data) return;
    exportToCsv(data);
    toast.success("Analytics report exported.");
  };

  const kpiCards = data
    ? [
        {
          label: "Total Revenue",
          value: formatPHP(data.kpis.totalRevenue),
          change: data.kpis.revenueChangePct !== null ? `${data.kpis.revenueChangePct >= 0 ? "+" : ""}${data.kpis.revenueChangePct}%` : "—",
          up: (data.kpis.revenueChangePct ?? 0) >= 0,
          icon: DollarSign,
        },
        {
          label: "Bookings (this month)",
          value: String(data.kpis.bookingsThisMonth),
          change: `${data.kpis.bookingsChange >= 0 ? "+" : ""}${data.kpis.bookingsChange}`,
          up: data.kpis.bookingsChange >= 0,
          icon: CalendarDays,
        },
        {
          label: "Avg Rating",
          value: data.kpis.avgRating !== null ? data.kpis.avgRating.toFixed(1) : "—",
          change: null,
          up: true,
          icon: Star,
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your performance and business growth.</p>
          </div>
          {data && (
            <button
              onClick={handleExport}
              className="text-sm font-medium text-primary hover:underline"
            >
              Export CSV
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
          </div>
        )}

        {!isLoading && loadError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-4">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiCards.map((k) => (
                <div key={k.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-2xl font-heading font-bold mt-1">{k.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <k.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  {k.change !== null && (
                    <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>
                      {k.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {k.change}<span className="text-muted-foreground font-normal ml-1">vs last month</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 p-6">
                <h3 className="font-heading font-semibold mb-6">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(val) => `₱${val / 1000}k`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      formatter={(value: number) => [formatPHP(value), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(25, 55%, 35%)" fill="hsl(25, 55%, 35%)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
                <h3 className="font-heading font-semibold mb-6">Service Mix</h3>
                {data.serviceMix.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No completed bookings yet.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data.serviceMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {data.serviceMix.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {data.serviceMix.map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-medium">{s.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
                <h3 className="font-heading font-semibold mb-6">Bookings per Month</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    <Bar dataKey="bookings" fill="hsl(35, 80%, 56%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl card-shadow border border-border/50">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-heading font-semibold">Top Clients</h3>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                {data.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No completed bookings yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {data.topClients.map((c, i) => (
                      <div key={c.name} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.bookings} bookings</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">{formatPHP(c.spent)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
