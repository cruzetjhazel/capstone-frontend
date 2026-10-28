import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, Filter, Activity, Eye, X, Calendar, Archive, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

const PER_PAGE = 50;

type RawLog = {
  id: number;
  action: string;
  description: string;
  causer?: { id: number; name: string; account_type?: string | null } | null;
  subject_type: string | null;
  subject_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const CATEGORY_BY_SUBJECT: Record<string, string> = {
  Booking: "Bookings",
  Payment: "Payments",
  PaymentReference: "Payments",
  User: "Users",
  PhotographerApplication: "Verifications",
  Report: "Reports",
  Review: "Reviews",
};

const categoryOf = (log: RawLog) => (log.subject_type && CATEGORY_BY_SUBJECT[log.subject_type]) || "Other";

const roleLabel = (log: RawLog) => {
  if (!log.causer) return "System";
  switch (log.causer.account_type) {
    case "administrator": return "Administrator";
    case "photographer": return "Photographer";
    case "client": return "Client";
    default: return "User";
  }
};

const roleClass: Record<string, string> = {
  Administrator: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Photographer: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Client: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  System: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  User: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${roleClass[role] ?? roleClass.System}`}>{role}</span>
);

const humanize = (action: string) =>
  action.split(/[._]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [selectedLog, setSelectedLog] = useState<RawLog | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Debounce the search box so we don't call the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (pageToLoad: number): Promise<RawLog[]> => {
      const res = await api.get("/admin/activity-logs", {
        params: {
          page: pageToLoad,
          per_page: PER_PAGE,
          search: search || undefined,
          role: roleFilter || undefined,
          category: categoryFilter || undefined,
          from: startDate || undefined,
          to: endDate || undefined,
          archived: showArchived ? 1 : undefined,
        },
      });
      const raw = res.data?.data;
      return (Array.isArray(raw) ? raw : raw?.data ?? []) as RawLog[];
    },
    [search, roleFilter, categoryFilter, startDate, endDate, showArchived]
  );

  // Reload from page 1 whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchPage(1)
      .then((items) => {
        if (cancelled) return;
        setLogs(items);
        setPage(1);
        setHasMore(items.length === PER_PAGE);
      })
      .catch((err) => !cancelled && setLoadError(getApiErrorMessage(err, "Unable to load activity logs.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const items = await fetchPage(page + 1);
      setLogs((prev) => [...prev, ...items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage((p) => p + 1);
      setHasMore(items.length === PER_PAGE);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load more logs."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleArchiveLogs = async () => {
    if (logs.length === 0) {
      toast.error("No logs to archive based on current filters.");
      setShowArchiveModal(false);
      return;
    }
    setIsArchiving(true);
    try {
      const ids = logs.map((l) => l.id);
      for (let i = 0; i < ids.length; i += 100) {
        await api.post("/admin/activity-logs/archive", { ids: ids.slice(i, i + 100) });
      }
      toast.success(`${ids.length} activity logs archived.`);
      setLogs([]);
      setHasMore(false);
      setShowArchiveModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't archive the logs."));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              System Activity Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every recorded action on the platform, from all users and the system.
            </p>
          </div>
          {!showArchived && (
            <Button onClick={() => setShowArchiveModal(true)} variant="outline" className="shrink-0 gap-2" disabled={logs.length === 0}>
              <Archive className="w-4 h-4" />
              Archive Displayed Logs
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col lg:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activity or user..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="photographer">Photographer</option>
                <option value="client">Client</option>
                <option value="system">System</option>
              </select>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Categories</option>
              <option value="bookings">Bookings</option>
              <option value="payments">Payments</option>
              <option value="users">Users</option>
              <option value="verifications">Verifications</option>
              <option value="reports">Reports</option>
              <option value="reviews">Reviews</option>
            </select>

            <select
              value={showArchived ? "archived" : "active"}
              onChange={(e) => setShowArchived(e.target.value === "archived")}
              className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="active">Active logs</option>
              <option value="archived">Archived logs</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 border-t lg:border-t-0 lg:border-l border-border/50 pt-4 lg:pt-0 lg:pl-4">
            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-9 h-10 w-full" title="Start Date" />
            </div>
            <span className="text-muted-foreground hidden sm:block">-</span>
            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-9 h-10 w-full" title="End Date" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Performed By</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Affected Target</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Activity</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading logs...
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-destructive">{loadError}</td>
                  </tr>
                )}
                {!isLoading && !loadError && logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{log.causer?.name ?? "System"}</td>
                    <td className="px-4 py-3"><RoleBadge role={roleLabel(log)} /></td>
                    <td className="px-4 py-3">{categoryOf(log)}</td>
                    <td className="px-4 py-3 font-medium text-foreground/80">
                      {log.subject_type ? `${log.subject_type}${log.subject_id ? ` #${log.subject_id}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[250px] truncate">{log.description}</td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)} className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                        <Eye className="w-4 h-4 mr-1.5" /> Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !loadError && logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No logs found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasMore && !isLoading && (
            <div className="border-t border-border/50 p-3 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Details modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-md p-6 m-4 relative">
            <button onClick={() => setSelectedLog(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-heading font-bold text-foreground mb-4">Activity Details</h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Date & Time</span>
                <span className="col-span-2">{formatDateTime(selectedLog.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium">Performed By</span>
                <span className="col-span-2 flex items-center gap-2">
                  <span className="font-medium">{selectedLog.causer?.name ?? "System"}</span>
                  <RoleBadge role={roleLabel(selectedLog)} />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Action</span>
                <span className="col-span-2">{humanize(selectedLog.action)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Category</span>
                <span className="col-span-2">{categoryOf(selectedLog)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Target</span>
                <span className="col-span-2">
                  {selectedLog.subject_type ? `${selectedLog.subject_type}${selectedLog.subject_id ? ` #${selectedLog.subject_id}` : ""}` : "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Description</span>
                <span className="col-span-2">{selectedLog.description}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Archive className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-bold">Archive Displayed Logs?</h3>
            <p className="text-sm text-muted-foreground">
              {logs.length} log{logs.length === 1 ? "" : "s"} will be moved out of the active list. They are kept, not deleted, and you can view them under "Archived logs".
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowArchiveModal(false)} disabled={isArchiving}>Cancel</Button>
              <Button className="flex-1" onClick={handleArchiveLogs} disabled={isArchiving}>{isArchiving ? "Archiving…" : "Archive"}</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
