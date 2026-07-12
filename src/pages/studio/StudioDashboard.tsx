import { CalendarDays, DollarSign, Star, TrendingUp, Clock, Users, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";

const stats = [
  { label: "Pending Bookings", value: "6", icon: Clock, change: "+3 this week" },
  { label: "This Month Revenue", value: "$4,280", icon: DollarSign, change: "+18% vs last month" },
  { label: "Completed Sessions", value: "23", icon: CheckCircle, change: "4.9★ avg rating" },
  { label: "Active Clients", value: "14", icon: Users, change: "+2 new this week" },
];

const recentBookings = [
  { client: "Emily Watson", event: "Wedding", date: "Mar 28, 2026", time: "2:00 PM", status: "confirmed" as const, package: "Premium" },
  { client: "David Kim", event: "Engagement", date: "Apr 2, 2026", time: "4:00 PM", status: "pending" as const, package: "Standard" },
  { client: "Sarah Chen", event: "Corporate", date: "Apr 5, 2026", time: "9:00 AM", status: "pending" as const, package: "Premium" },
  { client: "Tom Brennan", event: "Portrait", date: "Apr 8, 2026", time: "11:00 AM", status: "confirmed" as const, package: "Basic" },
];

const reviews = [
  { client: "Lisa Park", rating: 5, text: "Incredible work! The wedding photos exceeded all expectations.", date: "3d ago" },
  { client: "Mark Johnson", rating: 5, text: "Very professional and easy to work with. Highly recommend!", date: "1w ago" },
  { client: "Anna Bell", rating: 4, text: "Great portraits, delivery was slightly delayed but quality was top-notch.", date: "2w ago" },
];

export default function StudioDashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Welcome back, Rivera Studio</h1>
          <p className="text-muted-foreground mt-1">Here's your business overview.</p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent bookings */}
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold">Incoming Bookings</h3>
              <span className="text-xs text-muted-foreground">4 requests</span>
            </div>
            <div className="divide-y divide-border">
              {recentBookings.map((b) => (
                <div key={b.date + b.client} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm shrink-0">
                      {b.client.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.client}</p>
                      <p className="text-xs text-muted-foreground">{b.event} · {b.package}</p>
                    </div>
                  </div>
                  <div className="hidden md:block text-xs text-muted-foreground shrink-0">
                    {b.date} · {b.time}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold">Recent Reviews</h3>
            </div>
            <div className="divide-y divide-border">
              {reviews.map((r, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{r.client}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-accent text-accent" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
