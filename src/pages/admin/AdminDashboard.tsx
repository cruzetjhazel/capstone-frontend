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

// --- Mock Data Aligned with System Requirements ---
// NOTE: "Pending Reviews" value below is a placeholder only — it's
// overridden with the real count at render time via displayStats.
// Total Users / Active Clients / Professionals / Total Bookings are
// still hardcoded and unrelated to this fix.
const stats = [
  { label: "Total Users", value: "1,237", subtext: "Clients & Professionals", icon: Users, color: "bg-primary/10 text-primary" },
  { label: "Active Clients", value: "1,154", subtext: "Registered consumers", icon: UserCheck, color: "bg-blue-500/10 text-blue-600" },
  { label: "Professionals", value: "83", subtext: "Freelancers & Studios", icon: Aperture, color: "bg-secondary/10 text-secondary" },
  { label: "Total Bookings", value: "38", subtext: "Platform-wide transactions", icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-600" },
  { label: "Pending Reviews", value: "0", subtext: "Applications waiting", icon: ShieldAlert, color: "bg-amber-500/10 text-amber-600" },
];

// Valid booking statuses: Pending, Accepted, Confirmed, Rejected, Cancelled, Completed[cite: 28].
// Still hardcoded — unrelated to this fix.
const recentBookings = [
  { id: "BK-2045", client: "Anthony Reyes", professional: "Amara's Studio", event: "Wedding", date: "Mar 30", status: "Confirmed" },
  { id: "BK-2046", client: "Rica Flores", professional: "Kap Studio", event: "Portrait", date: "Mar 28", status: "Completed" },
  { id: "BK-2047", client: "Trisha Garcia", professional: "HH Production", event: "Prenup", date: "Mar 26", status: "Pending" },
  { id: "BK-2048", client: "Mark Johnson", professional: "Leo Chang", event: "Birthday", date: "Mar 25", status: "Cancelled" },
];

const bookingStatusStyles: Record<string, string> = {
  "Pending": "bg-amber-500/10 text-amber-600",
  "Accepted": "bg-blue-500/10 text-blue-600",
  "Confirmed": "bg-emerald-500/10 text-emerald-600",
  "Completed": "bg-primary/10 text-primary",
  "Cancelled": "bg-muted text-muted-foreground",
  "Rejected": "bg-destructive/10 text-destructive",
};

// Still hardcoded — unrelated to this fix.
const platformActivities = [
  { text: "Administrator approved application for 'Amara's Studio'", time: "5 mins ago", icon: CheckCircle2, color: "text-emerald-600" },
  { text: "Account 'Sarah Chen' deactivated by Administrator", time: "42 mins ago", icon: XCircle, color: "text-destructive" },
  { text: "Booking BK-2048 cancelled by client", time: "2 hours ago", icon: RefreshCw, color: "text-muted-foreground" },
  { text: "Package 'Premium Portrait' archived by Rivera Studio", time: "1 day ago", icon: Archive, color: "text-amber-600" },
];

// Still hardcoded — unrelated to this fix.
const analyticsPreview = [
  { metric: "Completed Bookings", value: "↑ 18%", desc: "vs last month", color: "text-emerald-600" },
  { metric: "New Clients", value: "↑ 11%", desc: "vs last week", color: "text-emerald-600" },
  { metric: "Verified Professionals", value: "↑ 6%", desc: "MoM growth", color: "text-emerald-600" },
];

// Same defensive unwrap used in AdminVerifications.tsx — handles
// res.data.data vs res.data.data.data without assuming a fixed depth.
function unwrapList(payload: any): any[] {
  let cur = payload;
  for (let i = 0; i < 4 && cur && !Array.isArray(cur); i++) {
    cur = cur.data;
  }
  return Array.isArray(cur) ? cur : [];
}

type DashboardPendingApp = { id: string; name: string; type: "Studio" | "Freelancer" };

export default function AdminDashboard() {
  const [pendingApplications, setPendingApplications] = useState<DashboardPendingApp[]>([]);
  const [appToApprove, setAppToApprove] = useState<{ id: string; name: string } | null>(null);

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
  }, []);

  const displayStats = stats.map((stat) =>
    stat.label === "Pending Reviews"
      ? { ...stat, value: String(pendingApplications.length) }
      : stat
  );

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
          {displayStats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">{stat.label}</p>
                  <p className="text-xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 font-medium">{stat.subtext}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-card rounded-xl border border-border/50 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground/60 tracking-wider uppercase mb-3">Quick Navigation</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/admin/verifications" className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted text-sm font-medium transition-colors border border-border/30">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Verifications</span>
            </Link>
            <Link to="/admin/users" className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted text-sm font-medium transition-colors border border-border/30">
              <UserCog className="w-4 h-4 text-blue-600" />
              <span>User Accounts</span>
            </Link>
            <Link to="/admin/logs" className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted text-sm font-medium transition-colors border border-border/30">
              <Terminal className="w-4 h-4 text-primary" />
              <span>System Logs</span>
            </Link>
            <Link to="/admin/archives" className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted text-sm font-medium transition-colors border border-border/30">
              <Archive className="w-4 h-4 text-emerald-600" />
              <span>Archives</span>
            </Link>
          </div>
        </div>

        {/* Interactive Lists */}
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
              {recentBookings.map((b) => (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.client} → <span className="text-muted-foreground font-normal">{b.professional}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.event} · {b.date}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${bookingStatusStyles[b.status]}`}>
                    {b.status}
                  </span>
                </div>
              ))}
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
              {platformActivities.map((act, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <act.icon className={`w-4 h-4 shrink-0 mt-0.5 ${act.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground leading-tight">
                      <span className="text-foreground font-medium">{act.text.split("'")[0]}</span>
                      {act.text.includes("'") ? <span className="font-semibold text-primary">'{act.text.split("'")[1]}'</span> : ""}
                      {act.text.split("'")[2]}
                    </p>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">{act.time}</span>
                  </div>
                </div>
              ))}
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
