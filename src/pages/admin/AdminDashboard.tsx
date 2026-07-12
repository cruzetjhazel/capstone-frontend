import { Users, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";

const stats = [
  { label: "Total Users", value: "1,237", icon: Users, change: "+38 this month" },
  { label: "Active Bookings", value: "38", icon: CalendarDays, change: "4 pending approval" },
  { label: "Total Revenue", value: "₱67,320", icon: DollarSign, change: "+22% vs last month" },
  { label: "Platform Growth", value: "+12%", icon: TrendingUp, change: "Month over month" },
];

const recentUsers = [
  { name: "Golden Hour Studio", email: "goldenhourstudio@gmail.com", date: "Mar 23, 2026" },
  { name: "Erica Muring", email: "muringerica@gmail.com", date: "Mar 22, 2026" },
  { name: "Rivera Studio", email: "marcusrivera@gmail.com", date: "Mar 20, 2026" },
  { name: "Chariza Mae Demtrial", email: "demetrialchariza@gmail.com", date: "Mar 18, 2026" },
];

const recentBookings = [
  { client: "Anthony Reyes", photographer: "Amara's Studio", event: "Event", date: "Mar 30", amount: "₱8,000", status: "confirmed" as const },
  { client: "Rica Flores", photographer: "Kap Studio", event: "Studio Session", date: "Mar 28", amount: "₱5,000", status: "confirmed" as const },
  { client: "Trisha Garcia", photographer: "HH Production", event: "Pre-nup", date: "Mar 26", amount: "₱3,000", status: "pending" as const },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50 hover:card-shadow-hover transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold">Recent Users</h3>
            </div>
            <div className="divide-y divide-border">
              {recentUsers.map((u) => (
                <div key={u.email} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{u.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold">Recent Bookings</h3>
            </div>
            <div className="divide-y divide-border">
              {recentBookings.map((b, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.client} → {b.photographer}</p>
                    <p className="text-xs text-muted-foreground">{b.event} · {b.date} · {b.amount}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
