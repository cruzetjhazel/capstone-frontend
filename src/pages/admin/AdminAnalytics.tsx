import { BarChart3, TrendingUp, Users, CalendarDays, DollarSign, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const monthlyRevenue = [
  { month: "Oct", revenue: 12400, bookings: 34 },
  { month: "Nov", revenue: 18700, bookings: 52 },
  { month: "Dec", revenue: 22100, bookings: 61 },
  { month: "Jan", revenue: 16800, bookings: 47 },
  { month: "Feb", revenue: 28300, bookings: 73 },
  { month: "Mar", revenue: 34200, bookings: 89 },
];

const userGrowth = [
  { month: "Oct", clients: 680, studios: 32 },
  { month: "Nov", clients: 790, studios: 38 },
  { month: "Dec", clients: 870, studios: 41 },
  { month: "Jan", clients: 940, studios: 45 },
  { month: "Feb", clients: 1080, studios: 52 },
  { month: "Mar", clients: 1190, studios: 57 },
];

const serviceBreakdown = [
  { name: "Wedding", value: 38, color: "hsl(25, 55%, 35%)" },
  { name: "Portrait", value: 24, color: "hsl(25, 40%, 50%)" },
  { name: "Events", value: 19, color: "hsl(35, 80%, 56%)" },
  { name: "Couples", value: 12, color: "hsl(199, 89%, 48%)" },
  { name: "Graduation", value: 7, color: "hsl(25, 20%, 70%)" },
];

const topPhotographers = [
  { name: "HH Production", bookings: 34, revenue: 12800, growth: 18 },
  { name: "KAP Studio", bookings: 28, revenue: 9400, growth: 12 },
  { name: "CJ Creatives", bookings: 22, revenue: 7600, growth: -3 },
  { name: "Golden Frame", bookings: 19, revenue: 6200, growth: 24 },
  { name: "Leo Chang", bookings: 14, revenue: 4800, growth: 8 },
];

const kpis = [
  { label: "Monthly Revenue", value: "$34,200", change: "+22%", up: true, icon: DollarSign },
  { label: "Active Bookings", value: "89", change: "+14", up: true, icon: CalendarDays },
  { label: "New Users", value: "148", change: "+38", up: true, icon: Users },
  { label: "Page Views", value: "12.4k", change: "-3%", up: false, icon: Eye },
];

export default function AdminAnalytics() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and performance insights.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${kpi.up ? "text-green-600" : "text-red-500"}`}>
                {kpi.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {kpi.change}
                <span className="text-muted-foreground font-normal ml-1">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Bookings chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Revenue & Bookings</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(25, 15%, 98%)",
                    border: "1px solid hsl(25, 10%, 88%)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(25, 55%, 35%)" fill="hsl(25, 55%, 35%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Service breakdown pie */}
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Services Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {serviceBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {serviceBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User growth + Top studios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">User Growth</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(25, 15%, 98%)",
                    border: "1px solid hsl(25, 10%, 88%)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Line type="monotone" dataKey="clients" stroke="hsl(25, 55%, 35%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="studios" stroke="hsl(35, 80%, 56%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold">Top Photographers</h3>
            </div>
            <div className="divide-y divide-border">
              {topPhotographers.map((studio, i) => (
                <div key={studio.name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{studio.name}</p>
                      <p className="text-xs text-muted-foreground">{studio.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${studio.revenue.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${studio.growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {studio.growth >= 0 ? "+" : ""}{studio.growth}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
