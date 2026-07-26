import { 
  Users, CalendarDays, ShieldAlert, Camera, 
  CheckCircle2, Clock, Star, MousePointerClick, TrendingUp
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

// --- MOCK PLATFORM DATA ---

const platformGrowth = [
  { month: "Oct", clients: 850, studios: 42 },
  { month: "Nov", clients: 920, studios: 48 },
  { month: "Dec", clients: 1050, studios: 55 },
  { month: "Jan", clients: 1100, studios: 63 },
  { month: "Feb", clients: 1210, studios: 74 },
  { month: "Mar", clients: 1284, studios: 87 },
];

const registrationTrend = [
  { month: "Oct", newClients: 120, newStudios: 5 },
  { month: "Nov", newClients: 70, newStudios: 6 },
  { month: "Dec", newClients: 130, newStudios: 7 },
  { month: "Jan", newClients: 50, newStudios: 8 },
  { month: "Feb", newClients: 110, newStudios: 11 },
  { month: "Mar", newClients: 74, newStudios: 13 },
];

const userDistribution = [
  { name: "Clients", value: 1284, color: "hsl(25, 55%, 35%)" },
  { name: "Verified Studios", value: 87, color: "hsl(25, 40%, 50%)" },
  { name: "Pending Studios", value: 18, color: "hsl(35, 80%, 56%)" },
  { name: "Admins/Mods", value: 4, color: "hsl(199, 89%, 48%)" },
];

const reportsAnalytics = [
  { name: "Payment Issues", value: 14, color: "hsl(348, 83%, 47%)" },
  { name: "Booking Disputes", value: 25, color: "hsl(25, 80%, 56%)" },
  { name: "Client Complaints", value: 12, color: "hsl(199, 89%, 48%)" },
  { name: "Studio Complaints", value: 8, color: "hsl(25, 40%, 50%)" },
  { name: "Platform Bugs", value: 19, color: "hsl(220, 10%, 40%)" },
];

const topActiveStudios = [
  { name: "HH Production", bookings: 56, rating: 4.9, completed: 53 },
  { name: "Lumina Studios", bookings: 49, rating: 4.8, completed: 47 },
  { name: "Snap Moments", bookings: 42, rating: 4.7, completed: 40 },
  { name: "Golden Frame", bookings: 38, rating: 4.9, completed: 37 },
  { name: "Pixel Perfect", bookings: 31, rating: 4.6, completed: 29 },
];

const bookingStatus = [
  { label: "Completed", percentage: 55, color: "bg-emerald-500" },
  { label: "Confirmed", percentage: 22, color: "bg-blue-500" },
  { label: "Pending", percentage: 12, color: "bg-amber-500" },
  { label: "Cancelled", percentage: 7, color: "bg-red-500" },
  { label: "Postponed", percentage: 4, color: "bg-purple-500" },
];

const kpis = [
  { label: "Total Users", value: "1,284", change: "+32 this month", up: true, icon: Users },
  { label: "Active Studios", value: "87", change: "+4 verified this month", up: true, icon: Camera },
  { label: "Bookings This Month", value: "326", change: "+18% vs last month", up: true, icon: CalendarDays },
  { label: "Open Reports", value: "7", change: "-3 from last week", up: true, icon: ShieldAlert }, 
];

export default function AdminAnalytics() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up pb-10">
        <div>
          <h1 className="text-2xl font-heading font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor platform health, user growth, and moderation metrics.</p>
        </div>

        {/* ROW 1: TOP STATISTICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
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
              <div className="flex items-center gap-1 mt-3 text-xs font-medium text-muted-foreground">
                {kpi.up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingUp className="w-3.5 h-3.5 text-red-500 rotate-180" />}
                <span className={kpi.up ? (kpi.label === "Open Reports" ? "text-emerald-500" : "text-emerald-500") : "text-red-500"}>
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 2: PLATFORM GROWTH & USER DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Platform Growth</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={platformGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(25, 15%, 98%)", border: "1px solid hsl(25, 10%, 88%)", borderRadius: "8px", fontSize: "13px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line type="monotone" name="Clients" dataKey="clients" stroke="hsl(25, 55%, 35%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Studios" dataKey="studios" stroke="hsl(35, 80%, 56%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">User Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={userDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                  {userDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
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

        {/* ROW 3: BOOKING STATUS & VERIFICATION PIPELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">Booking Status Overview</h3>
            <div className="space-y-5 mt-2">
              {bookingStatus.map((status) => (
                <div key={status.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{status.label}</span>
                    <span className="text-muted-foreground font-semibold">{status.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${status.color} rounded-full`} style={{ width: `${status.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-semibold mb-2">Verification Pipeline</h3>
              <p className="text-sm text-muted-foreground mb-6">Current studio onboarding statuses.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-amber-600 mb-1">18</p>
                <p className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">Pending</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-emerald-600 mb-1">246</p>
                <p className="text-xs font-semibold text-emerald-700/70 uppercase tracking-wider">Approved</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-heading font-bold text-red-600 mb-1">12</p>
                <p className="text-xs font-semibold text-red-700/70 uppercase tracking-wider">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: REPORTS ANALYTICS & REGISTRATION TREND */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-4">Reports & Disputes Breakdown</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-1/2 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportsAnalytics} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                      {reportsAnalytics.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
            <h3 className="font-heading font-semibold mb-6">User Registration Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 10%, 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(25, 10%, 60%)" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(25, 15%, 98%)", border: "1px solid hsl(25, 10%, 88%)", borderRadius: "8px", fontSize: "13px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "5px" }} />
                <Line type="monotone" name="New Clients" dataKey="newClients" stroke="hsl(25, 55%, 35%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" name="New Studios" dataKey="newStudios" stroke="hsl(35, 80%, 56%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 5: MOST ACTIVE STUDIOS TABLE */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
            <h3 className="font-heading font-semibold">Most Active Studios</h3>
            <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border/50">Top 5 Performers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground bg-muted/10">
                  <th className="px-6 py-3 font-semibold">Studio Name</th>
                  <th className="px-6 py-3 font-semibold">Platform Bookings</th>
                  <th className="px-6 py-3 font-semibold">Completed Jobs</th>
                  <th className="px-6 py-3 font-semibold">Average Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {topActiveStudios.map((studio, i) => (
                  <tr key={studio.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      {studio.name}
                    </td>
                    <td className="px-6 py-4 font-semibold">{studio.bookings}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {studio.completed}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {studio.rating}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROW 6: PLATFORM HEALTH & MISCELLANEOUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-3">
               Platform Health
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Verified Studios</span>
              <span className="font-bold text-emerald-600">82%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Booking Completion Rate</span>
              <span className="font-bold text-primary">91%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Average Rating</span>
              <span className="font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/> 4.8</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Global Avg Response</span>
              <span className="font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> 2.3 hrs</span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-3">
               Featured Brands
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Active Campaigns</span>
              <span className="font-bold">12 Studios</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Clicks</span>
              <span className="font-bold flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-primary" /> 2,104</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Profile Views</span>
              <span className="font-bold">8,442</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Bookings Generated</span>
              <span className="font-bold text-emerald-600">124</span>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-3">
               Reports Resolution
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Overall Resolved</span>
              <span className="font-bold text-emerald-600">85%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Avg Resolution Time</span>
              <span className="font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> 31 hrs</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Currently Open</span>
              <span className="font-bold text-red-500">8 Tickets</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Appeals</span>
              <span className="font-bold">3</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}