import { DollarSign, CalendarDays, Star, Eye, ArrowUpRight, ArrowDownRight, Users } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const monthly = [
  { month: "Oct", revenue: 2400, bookings: 6 },
  { month: "Nov", revenue: 3100, bookings: 8 },
  { month: "Dec", revenue: 4800, bookings: 12 },
  { month: "Jan", revenue: 3600, bookings: 9 },
  { month: "Feb", revenue: 5200, bookings: 14 },
  { month: "Mar", revenue: 6100, bookings: 17 },
];

const serviceMix = [
  { name: "Wedding", value: 42, color: "hsl(25, 55%, 35%)" },
  { name: "Portrait", value: 22, color: "hsl(25, 40%, 50%)" },
  { name: "Events", value: 18, color: "hsl(35, 80%, 56%)" },
  { name: "Engagement", value: 12, color: "hsl(199, 89%, 48%)" },
  { name: "Others", value: 6, color: "hsl(25, 20%, 70%)" },
];

const topClients = [
  { name: "Emily Watson", bookings: 4, spent: 3200 },
  { name: "David Kim", bookings: 3, spent: 2100 },
  { name: "Sarah Chen", bookings: 2, spent: 1800 },
  { name: "Tom Brennan", bookings: 2, spent: 1200 },
];

const kpis = [
  { label: "Total Revenue", value: "$6,100", change: "+17%", up: true, icon: DollarSign },
  { label: "Bookings (Mar)", value: "17", change: "+3", up: true, icon: CalendarDays },
  { label: "Avg Rating", value: "4.9", change: "+0.1", up: true, icon: Star },
  { label: "Profile Views", value: "1,284", change: "-4%", up: false, icon: Eye },
];

export default function StudioAnalytics() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your performance and growth.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
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
              <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>
                {k.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {k.change}<span className="text-muted-foreground font-normal ml-1">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(25, 55%, 35%)" fill="hsl(25, 55%, 35%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Service Mix</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {serviceMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {serviceMix.map((s) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Bookings per Month</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly}>
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
            <div className="divide-y divide-border">
              {topClients.map((c, i) => (
                <div key={c.name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.bookings} bookings</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">${c.spent.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
