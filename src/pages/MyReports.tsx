import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { reportService, getApiErrorMessage, type Report } from "@/services/reportService";
import { ReportingNav, getReportRoute } from "@/components/reporting/ReportingNav";
import { 
  ClipboardList, Plus, Search, AlertCircle, 
  CheckCircle2, Clock, MessageSquare, FileText, ChevronRight, Loader2
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "text-amber-600 bg-amber-500/10 border-amber-500/20", icon: Clock },
  reviewing: { label: "Under Review", color: "text-blue-600 bg-blue-500/10 border-blue-500/20", icon: Search },
  resolved: { label: "Resolved", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-muted-foreground bg-muted border-border/50", icon: AlertCircle },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

// Below this many reports, a search box adds more clutter than it saves.
const SEARCH_VISIBLE_THRESHOLD = 4;

export default function MyReports() {
  const { role } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await reportService.list(role);
        if (!cancelled) setReports(data);
      } catch (err) {
        if (!cancelled) setLoadError(getApiErrorMessage(err, "Couldn't load your reports."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // Filter Logic
  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === "all" || report.status === activeTab;
    const matchesSearch = report.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          report.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const hasReports = reports.length > 0;
  const hasActiveFilters = activeTab !== "all" || searchQuery.trim().length > 0;
  const showSearch = reports.length >= SEARCH_VISIBLE_THRESHOLD;

  const clearFilters = () => {
    setActiveTab("all");
    setSearchQuery("");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-up py-4 sm:py-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-heading font-bold flex items-center gap-2 text-foreground">
              <ClipboardList className="w-5 h-5 text-primary" />
              My Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your submitted reports and their resolution progress.
            </p>
          </div>

          <ReportingNav active="reports" />
        </div>

        {/* Filters and Search */}
        {hasReports && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    activeTab === tab.value 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {showSearch && (
              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search by ID or reason" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>
        )}

        {/* Reports Container */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-10 bg-card rounded-xl border border-border/50 border-dashed">
              <Loader2 className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
              <p className="text-muted-foreground text-xs">Loading your reports...</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-10 bg-card rounded-xl border border-destructive/30 border-dashed">
              <AlertCircle className="w-8 h-8 text-destructive/40 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-foreground">Couldn't load reports</h3>
              <p className="text-muted-foreground text-xs mt-1">{loadError}</p>
            </div>
          ) : !hasReports ? (
            <div className="text-center py-10 bg-card rounded-xl border border-border/50 border-dashed">
              <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-foreground">No reports yet</h3>
              <p className="text-muted-foreground text-xs mt-1">You haven't submitted a report yet.</p>
              <Button
                size="sm"
                onClick={() => navigate(getReportRoute(role))}
                className="mt-4 gap-2 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Report a Problem
              </Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-border/50 border-dashed">
              <Search className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-foreground">No matching reports</h3>
              <p className="text-muted-foreground text-xs mt-1">Try a different search term or status filter.</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredReports.map((report) => {
              const StatusIcon = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].icon;
              return (
                <div 
                  key={report.id} 
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedReport(report)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedReport(report);
                    }
                  }}
                  className="group flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-primary text-sm">{report.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="font-semibold text-foreground">{report.reason}</span>
                      <span className="text-muted-foreground text-xs">• Submitted {report.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/50 sm:border-0 pt-2 sm:pt-0">
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" /> {report.referenceId !== "N/A" ? report.referenceId : "General"}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAILED REPORT TIMELINE & DIALOG MODAL */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-mono font-bold text-primary">
                {selectedReport?.id}
              </DialogTitle>
              {selectedReport && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${STATUS_CONFIG[selectedReport.status as keyof typeof STATUS_CONFIG].color}`}>
                  {STATUS_CONFIG[selectedReport.status as keyof typeof STATUS_CONFIG].label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Submitted on {selectedReport?.date}</p>
          </DialogHeader>

          {selectedReport && (
            <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1">
              
              {/* Report Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Submission</h4>
                <div className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Reason Category</p>
                      <p className="font-semibold text-xs mt-0.5">{selectedReport.reason}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Associated Reference</p>
                      <p className="font-mono font-semibold text-xs mt-0.5">{selectedReport.referenceId}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-muted-foreground font-semibold">Report Details</p>
                      <p className="text-xs leading-relaxed text-foreground mt-1">{selectedReport.details}</p>
                    </div>
                    <div className="col-span-2 border-t border-border/40 pt-2">
                      <p className="text-[11px] text-muted-foreground font-semibold">Requested Outcome</p>
                      <p className="text-xs text-foreground mt-0.5">{selectedReport.expectedOutcome}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrator Status Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Case Timeline</h4>
                
                <div className="space-y-4 pl-3 border-l-2 border-primary/20 ml-2">
                  {/* Queue Node */}
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-muted border-2 border-primary rounded-full -left-[7px] top-1" />
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedReport.date}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">Report Received</p>
                    <p className="text-xs text-muted-foreground mt-1">Your report was created and assigned to the Trust & Safety review queue.</p>
                  </div>

                  {/* Dynamic Admin Updates */}
                  {selectedReport.adminNotes.map((note, index) => (
                    <div key={index} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-primary border-2 border-background rounded-full -left-[7px] top-1" />
                      <p className="text-[11px] text-muted-foreground font-mono">{note.date}</p>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Administrator Update
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-3 rounded-xl border border-border/50">{note.note}</p>
                    </div>
                  ))}

                  {/* Resolution Node */}
                  {selectedReport.status === "resolved" && (
                    <div className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-emerald-500 border-2 border-background rounded-full -left-[7px] top-1" />
                      <p className="text-xs font-bold text-emerald-600">Case Resolved</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This report has been closed by platform administration.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
