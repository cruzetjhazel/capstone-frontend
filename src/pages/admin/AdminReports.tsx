import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Search, Filter, ShieldAlert, AlertTriangle, 
  CheckCircle2, Clock, Eye, X, MessageSquare, 
  FileText, AlertCircle, Shield, User, Send, Check,
  Loader2, ChevronLeft, ChevronRight, Paperclip
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

// --- Types aligned with the real backend (Report / ReportNote models) ---
type ReportStatus = "submitted" | "under_review" | "resolved" | "closed";
type ReportSeverity = "low" | "medium" | "high" | "urgent";

interface AdminReportNote {
  date: string | null;
  note: string;
  author: string;
}

interface AdminReport {
  id: string; // display reference code, e.g. RPT-00042
  rawId: number; // numeric PK, used for API calls
  date: string | null;
  reporterName: string;
  reporterRole: "Client" | "Studio" | "Freelancer";
  reportType: string; // already human-labeled by the backend
  referenceId: string;
  reason: string;
  severity: ReportSeverity;
  severityLabel: string;
  details: string;
  expectedOutcome: string; // already human-labeled by the backend
  status: ReportStatus;
  attachments: string[];
  adminNotes: AdminReportNote[];
}

function fromApi(raw: any): AdminReport {
  return {
    id: raw.id,
    rawId: raw.raw_id,
    date: raw.date,
    reporterName: raw.reporterName,
    reporterRole: raw.reporterRole,
    reportType: raw.reportType,
    referenceId: raw.referenceId,
    reason: raw.reason,
    severity: raw.severity,
    severityLabel: raw.severityLabel,
    details: raw.details,
    expectedOutcome: raw.expectedOutcome,
    status: raw.status,
    attachments: raw.attachments ?? [],
    adminNotes: (raw.adminNotes ?? []).map((n: any) => ({
      date: n.date,
      note: n.note,
      author: n.author,
    })),
  };
}

// Handles res.data.data vs res.data.data.data etc. without assuming a fixed depth.
function unwrapObject(payload: any): any {
  let cur = payload;
  for (let i = 0; i < 4 && cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur; i++) {
    cur = cur.data;
  }
  return cur && typeof cur === "object" ? cur : {};
}

function unwrapList(payload: any): any[] {
  let cur = payload;
  for (let i = 0; i < 4 && cur && !Array.isArray(cur); i++) {
    cur = cur.data;
  }
  return Array.isArray(cur) ? cur : [];
}

const ITEMS_PER_PAGE = 10;

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: any }> = {
  submitted: { label: "Submitted", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50", icon: Clock },
  under_review: { label: "Under Review", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50", icon: Search },
  resolved: { label: "Resolved", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-muted-foreground bg-muted border-border", icon: AlertCircle },
};

const SEVERITY_CONFIG: Record<ReportSeverity, { color: string }> = {
  low: { color: "text-slate-600 bg-slate-100 dark:bg-slate-900" },
  medium: { color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50" },
  high: { color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50" },
  urgent: { color: "text-red-600 bg-red-100 dark:bg-red-900/50 animate-pulse" },
};

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [stats, setStats] = useState({ total: 0, submitted: 0, under_review: 0, resolved: 0, closed: 0 });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [editingStatus, setEditingStatus] = useState<ReportStatus>("submitted");
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const fetchReports = () => {
    setIsLoading(true);
    setLoadError("");

    api.get("/admin/reports", {
      params: {
        per_page: ITEMS_PER_PAGE,
        page: currentPage,
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        search: searchQuery || undefined,
      },
    })
      .then((res) => {
        const envelope = unwrapObject(res.data);
        const paginated = envelope.reports ?? {};
        const list = unwrapList(paginated);
        setReports(list.map(fromApi));
        setTotalPages(paginated.last_page ?? 1);
        setTotalCount(paginated.total ?? list.length);
        if (envelope.stats) setStats(envelope.stats);
      })
      .catch((err) => {
        setLoadError(getApiErrorMessage(err, "Failed to load reports."));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, currentPage]);

  // Debounce free-text search so it doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchReports();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Sync editing status and reset confirmation when a new report is opened
  useEffect(() => {
    if (selectedReport) {
      setEditingStatus(selectedReport.status);
      setIsConfirmingStatus(false);
      setNewNote("");
    }
  }, [selectedReport?.rawId]);

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/admin/reports/${selectedReport.rawId}/status`, {
        status: editingStatus,
      });
      const updated = fromApi(unwrapObject(res.data));
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.rawId === updated.rawId ? updated : r)));
      setIsConfirmingStatus(false);
      toast.success(`Report ${updated.id} status updated to ${STATUS_CONFIG[updated.status].label}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update the report status."));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedReport) return;

    setIsAddingNote(true);
    try {
      const res = await api.post(`/admin/reports/${selectedReport.rawId}/notes`, {
        note: newNote.trim(),
      });
      const updated = fromApi(unwrapObject(res.data));
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.rawId === updated.rawId ? updated : r)));
      setNewNote("");
      toast.success("Internal note added securely.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't add that note."));
    } finally {
      setIsAddingNote(false);
    }
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              Platform Reports & Disputes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and resolve trust & safety issues, user disputes, and platform bug reports.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { label: "Submitted", value: stats.submitted, icon: Clock, color: "bg-amber-500/10 text-amber-600" },
            { label: "Under Review", value: stats.under_review, icon: Search, color: "bg-blue-500/10 text-blue-600" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600" },
            { label: "Closed", value: stats.closed, icon: AlertCircle, color: "bg-muted text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-4 border border-border/50 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">{s.label}</p>
                  <p className="text-xl font-heading font-bold mt-1">{s.value.toLocaleString()}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Report ID, Reporter, or Reference..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div className="w-full sm:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Report ID / Date</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Reporter</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Report Type / Reference</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Reason</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Severity</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading reports…
                    </td>
                  </tr>
                )}

                {!isLoading && loadError && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-rose-600">{loadError}</td>
                  </tr>
                )}

                {!isLoading && !loadError && reports.map((report) => {
                  const StatusIcon = STATUS_CONFIG[report.status].icon;
                  return (
                    <tr key={report.rawId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary">{report.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {report.date ? new Date(report.date).toLocaleString() : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{report.reporterName}</div>
                        <div className="text-xs text-muted-foreground">{report.reporterRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground/80">{report.reportType}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{report.referenceId}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={report.reason}>{report.reason}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${SEVERITY_CONFIG[report.severity].color}`}>
                          {report.severityLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${STATUS_CONFIG[report.status].color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {STATUS_CONFIG[report.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedReport(report)}
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && !loadError && reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Shield className="w-8 h-8 opacity-20" />
                        <p>No reports found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && !loadError && totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm">
              <p className="text-xs text-muted-foreground">
                Showing {startItem}–{endItem} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm" className="h-8 gap-1"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline" size="sm" className="h-8 gap-1"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Report Details & Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
              <div>
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  Report {selectedReport.id}
                  <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${SEVERITY_CONFIG[selectedReport.severity].color}`}>
                    {selectedReport.severityLabel}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Submitted on {selectedReport.date ? new Date(selectedReport.date).toLocaleString() : "—"}
                </p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 bg-muted/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Grid) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Report Details */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Incident Details
                  </h4>
                  <div className="bg-background rounded-xl p-5 space-y-5 border border-border/60 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 border-b border-border/50 pb-5">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Reported By</p>
                        <p className="font-semibold text-sm flex items-center gap-1.5">
                          <User className="w-4 h-4 text-primary" /> {selectedReport.reporterName}
                          <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">({selectedReport.reporterRole})</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Report Type</p>
                        <p className="font-semibold text-sm flex items-center">
                          {selectedReport.reportType} 
                          <span className="font-mono text-xs font-normal bg-muted border border-border/50 px-2 py-0.5 rounded ml-2 text-muted-foreground">
                            {selectedReport.referenceId}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Reason</p>
                      <p className="font-semibold text-sm">{selectedReport.reason}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Full Description</p>
                      <div className="text-sm leading-relaxed bg-muted/40 p-4 rounded-xl border border-border/40">
                        {selectedReport.details}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">User's Requested Outcome</p>
                      <p className="text-sm font-medium text-primary bg-primary/10 w-max px-3 py-1 rounded-md">
                        {selectedReport.expectedOutcome}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evidence Section */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Attached Evidence
                  </h4>
                  {selectedReport.attachments.length === 0 ? (
                    <div className="bg-muted/20 rounded-xl p-4 border border-border/50 border-dashed flex items-center justify-center text-sm text-muted-foreground min-h-[100px]">
                      No files attached by the user.
                    </div>
                  ) : (
                    <div className="bg-muted/20 rounded-xl p-4 border border-border/50 space-y-2">
                      {selectedReport.attachments.map((path, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-background border border-border/50 rounded-lg px-3 py-2">
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{path.split("/").pop()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Admin Tools & Notes */}
              <div className="space-y-6 flex flex-col h-full">
                
                {/* Admin Status Management */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Status Management
                  </h4>
                  <div className="bg-primary/5 rounded-xl p-5 border border-primary/10 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Update Status</label>
                      <select 
                        value={editingStatus}
                        onChange={(e) => {
                          setEditingStatus(e.target.value as ReportStatus);
                          setIsConfirmingStatus(false);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    
                    <Button 
                      onClick={() => setIsConfirmingStatus(true)} 
                      className="w-full gap-2 transition-all"
                      disabled={editingStatus === selectedReport.status}
                    >
                      <Check className="w-4 h-4" /> Update Status
                    </Button>
                  </div>
                </div>

                {/* Internal Notes / Timeline */}
                <div className="flex-1 flex flex-col min-h-[350px]">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Internal Notes
                  </h4>
                  <div className="flex-1 bg-background rounded-xl border border-border/60 shadow-sm flex flex-col overflow-hidden">
                    
                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                      {selectedReport.adminNotes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50">
                          <MessageSquare className="w-8 h-8" />
                          <p className="text-xs">No internal notes yet.</p>
                        </div>
                      ) : (
                        selectedReport.adminNotes.map((note, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider">
                              <span className="font-semibold text-primary/80">{note.author}</span>
                              <span>{note.date ? new Date(note.date).toLocaleDateString() : ""}</span>
                            </div>
                            <div className="text-sm bg-background p-3 rounded-lg border border-border/50 shadow-sm">
                              {note.note}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="p-4 bg-muted/30 border-t border-border/60 flex gap-2">
                      <Input 
                        placeholder="Type a secure internal note..." 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="h-10 text-sm bg-background"
                        disabled={isAddingNote}
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="h-10 px-4 shrink-0 gap-2"
                        disabled={!newNote.trim() || isAddingNote}
                      >
                        {isAddingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Add Note</span>
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Confirmation Modal Overlay (Stacked on top of Report Modal) */}
            {isConfirmingStatus && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 rounded-2xl">
                <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold font-heading">Confirm Status Change</h3>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to change the status of <span className="font-mono font-bold text-foreground">{selectedReport.id}</span> to <span className="font-bold text-foreground">{STATUS_CONFIG[editingStatus].label}</span>?
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsConfirmingStatus(false)}
                      disabled={isUpdatingStatus}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
