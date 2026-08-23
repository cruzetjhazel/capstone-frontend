import { useState, useEffect } from "react";
import { 
  Users, UserCheck, Aperture, CalendarDays, ShieldAlert, ArrowRight,
  ShieldCheck, UserCog, Terminal, Archive, CheckCircle2, XCircle, 
  RefreshCw, Package, ArrowUpRight, BarChart3, Check
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

// --- Still mocked — pending backend analytics-delta work ---
// (needs PhotographerApplication's approval-timestamp column and
// ActivityLog's action-name strings before this can be made real)
const analyticsPreview = [
  { metric: "Completed Bookings", value: "↑ 18%", desc: "vs last month", color: "text-emerald-600" },
  { metric: "New Clients", value: "↑ 11%", desc: "vs last week", color: "text-emerald-600" },
  { metric: "Verified Professionals", value: "↑ 6%", desc: "MoM growth", color: "text-emerald-600" },
];

const bookingStatusStyles: Record<string, string> = {
  "Pending": "bg-amber-500/10 text-amber-600",
  "Accepted": "bg-blue-500/10 text-blue-600",
  "Confirmed": "bg-emerald-500/10 text-emerald-600",
  "Completed": "bg-primary/10 text-primary",
  "Cancelled": "bg-muted text-muted-foreground",
  "Rejected": "bg-destructive/10 text-destructive",
};

// Same defensive unwrap used in AdminVerifications.tsx — handles
// res.data.data vs res.data.data.data without assuming a fixed depth.
function unwrapList(payload: any): any[] {
  let cur = payload;
  for (let i = 0; i < 4 && cur && !Array.isArray(cur); i++) {
    cur = cur.data;
  }
  return Array.isArray(cur) ? cur : [];
}

// Dashboard-stats isn't paginated, so it doesn't go through unwrapList —
// just unwrap the single success envelope: { data: { data: {...} } } or { data: {...} }
function unwrapObject(payload: any): any {
  let cur = payload;
  for (let i = 0; i < 4 && cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur; i++) {
    cur = cur.data;
  }
  return cur && typeof cur === "object" ? cur : {};
}

type DashboardPendingApp = { id: string; name: string; type: "Studio" | "Freelancer" };
type DashboardBooking = { id: string; client: string; professional: string; event: string; date: string; status: string };
type DashboardStats = {
  total_users: number;
  active_clients: number;
  professionals: number;
  total_bookings: number;
  pending_reviews: number;
};
type ActivityFeedItem = { id: string | number; text: string; time: string; icon: typeof Terminal; color: string };

const defaultStats: DashboardStats = {
  total_users: 0,
  active_clients: 0,
  professionals: 0,
  total_bookings: 0,
  pending_reviews: 0,
};

// Picks an icon/color for an activity log entry from keywords in its text —
// works regardless of the exact action-string convention on the backend.
// TODO: once ActivityLogResource's real shape is confirmed, this can switch
// to matching on the structured `action` field instead of the rendered text.
function iconForActivity(text: string): { icon: typeof Terminal; color: string } {
  const t = text.toLowerCase();
  if (t.includes("approv")) return { icon: CheckCircle2, color: "text-emerald-600" };
  if (t.includes("reject") || t.includes("deactivat") || t.includes("suspend")) return { icon: XCircle, color: "text-destructive" };
  if (t.includes("cancel")) return { icon: RefreshCw, color: "text-muted-foreground" };
  if (t.includes("archiv")) return { icon: Archive, color: "text-amber-600" };
  return { icon: Terminal, color: "text-muted-foreground" };
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminDashboard() {
  const [pendingApplications, setPendingApplications] = useState<DashboardPendingApp[]>([]);
  const [appToApprove, setAppToApprove] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentBookings, setRecentBookings] = useState<DashboardBooking[]>([]);
  const [platformActivities, setPlatformActivities] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    api.get("/admin/photographer-applications", { params: { status: "pending_review" } })
      .then((res) => {
        const list = unwrapList(res.data);
        setPendingApplications(
          list.map((app: any) => ({
            id: String(app.id),
            name: app.business_name || app.applicant?.name || "Unnamed applicant",
            type: app.photographer_type === "studio" ? "Studio" : "Freelancer",
          }))
        );
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load pending applications."));
      });

    api.get("/admin/dashboard-stats")
      .then((res) => {
        const s = unwrapObject(res.data);
        setStats({
          total_users: s.total_users ?? 0,
          active_clients: s.active_clients ?? 0,
          professionals: s.professionals ?? 0,
          total_bookings: s.total_bookings ?? 0,
          pending_reviews: s.pending_reviews ?? 0,
        });
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load dashboard stats."));
      });

    api.get("/admin/bookings", { params: { per_page: 4 } })
      .then((res) => {
        // BookingController now returns { bookings: {paginated}, stats: {...} }
        // wrapped under the standard success envelope, so unwrap one level
        // deeper than before to reach the actual booking array.
        const envelope = unwrapObject(res.data);
        const list = unwrapList(envelope.bookings ?? envelope);
        setRecentBookings(
          list.map((b: any) => ({
            id: b.id,
            client: b.client,
            professional: b.photographer,
            event: b.event,
            date: b.eventDate ? new Date(b.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
            status: b.status,
          }))
        );
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load recent bookings."));
      });

    api.get("/admin/activity-logs", { params: { per_page: 4 } })
      .then((res) => {
        const list = unwrapList(res.data);
        setPlatformActivities(
          list.map((log: any) => {
            // Defensive against unknown field names — tries the common
            // conventions until ActivityLogResource's real shape is confirmed.
            const text: string =
              log.description ?? log.message ?? log.text ??
              `${log.causer?.name ?? "Someone"} performed ${log.action ?? "an action"}`;
            const { icon, color } = iconForActivity(text);
            return {
              id: log.id,
              text,
              time: timeAgo(log.created_at),
              icon,
              color,
            };
          })
        );
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load activity logs."));
      });
  }, []);

  const statCards = [
    { label: "Total Users", value: String(stats.total_users), subtext: "Clients & Professionals", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Active Clients", value: String(stats.active_clients), subtext: "Registered consumers", icon: UserCheck, color: "bg-blue-500/10 text-blue-600" },
    { label: "Professionals", value: String(stats.professionals), subtext: "Freelancers & Studios", icon: Aperture, color: "bg-secondary/10 text-secondary" },
    { label: "Total Bookings", value: String(stats.total_bookings), subtext: "Platform-wide transactions", icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Pending Reviews", value: String(pendingApplications.length), subtext: "Applications waiting", icon: ShieldAlert, color: "bg-amber-500/10 text-amber-600" },
  ];

  const handleApprove = async () => {
    if (!appToApprove) return;

    try {
      await api.post(`/admin/photographer-applications/${appToApprove.id}/approve`);
      setPendingApplications((prev) => prev.filter((app) => app.id !== appToApprove.id));
      toast.success(`Professional application for ${appToApprove.name} has been approved.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to approve application."));
    } finally {
      setAppToApprove(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header Title Greeting */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor users, bookings, payments, and system activity across Bulan.
          </p>
        </div>

        {/* Action Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400">
                {pendingApplications.length} Professional Applications Pending
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-500/80 mt-0.5">
                Review submitted verification documents and portfolios.
              </p>
            </div>
          </div>
          <Link 
            to="/admin/verifications" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm self-stretch sm:self-auto text-center justify-center whitespace-nowrap"
          >
            Review All Applications
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 5-Column Compact Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border/50 shadow-sm p-4 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs font-semibold text-foreground/80">{stat.label}</p>
                <p className="text-[11px] text-muted-foreground">{stat.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pending Applications Panel */}
          <div className="bg-card rounded-xl shadow-sm border border-border/50 flex flex-col">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Pending Professional Review</h3>
              <Link to="/admin/verifications" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/40 flex-1">
              {pendingApplications.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No pending applications.
                </div>
              ) : (
                pendingApplications.map((app) => (
                  <div key={app.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {app.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{app.name}</p>
                        <div className="mt-0.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.type === "Studio" ? "bg-secondary/10 text-secondary" : "bg-blue-500/10 text-blue-600"
                          }`}>
                            {app.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAppToApprove({ id: app.id, name: app.name })}
                      className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
                    >
                      Approve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Bookings Panel */}
          <div className="bg-card rounded-xl shadow-sm border border-border/50 flex flex-col">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Recent Bookings</h3>
              <Link to="/admin/bookings" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/40 flex-1">
              {recentBookings.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No bookings yet.
                </div>
              ) : (
                recentBookings.map((b) => (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{b.client} → <span className="text-muted-foreground font-normal">{b.professional}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.event} · {b.date}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${bookingStatusStyles[b.status] ?? "bg-muted text-muted-foreground"}`}>
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Activity Feed & Micro Charts Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Platform Activity Feed */}
          <div className="bg-card rounded-xl shadow-sm border border-border/50 lg:col-span-2">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold tracking-tight">System Activity Logs</h3>
            </div>
            <div className="p-4 space-y-4">
              {platformActivities.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">No recent activity.</div>
              ) : (
                platformActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-sm">
                    <act.icon className={`w-4 h-4 shrink-0 mt-0.5 ${act.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground leading-tight">{act.text}</p>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">{act.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Micro Analytics Metric Component */}
          <div className="bg-card rounded-xl shadow-sm border border-border/50 flex flex-col justify-between">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold tracking-tight">Analytics Preview</h3>
            </div>
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-center">
              {analyticsPreview.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-none last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-muted/20 border-t border-border/50 text-right">
              <Link to="/admin/analytics" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                View Full Analytics <BarChart3 className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {appToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading">Approve Application</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to approve the professional application for <span className="font-semibold text-foreground">{appToApprove.name}</span>? They will gain access to business dashboard features.
            </p>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setAppToApprove(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold border border-input bg-background hover:bg-muted rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApprove}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
