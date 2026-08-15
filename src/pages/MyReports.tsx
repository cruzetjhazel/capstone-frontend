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

  const handleNewReportClick = () => {
    const isPro = role === "studio";
    navigate(isPro ? "/studio/report-problem" : "/report-problem");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up py-4 sm:py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              My Filed Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track resolution progress and administrator updates for your reported issues.
            </p>
          </div>
          
          <Button onClick={handleNewReportClick} className="shrink-0 gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> File New Report
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
            {["all", "pending", "reviewing", "resolved", "closed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? "bg-primary text-primary-foreground shadow-xs" 
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace("Reviewing", "Under Review")}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by ID or reason..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Reports Container */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50 border-dashed">
              <Loader2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground text-xs">Loading your reports...</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-destructive/30 border-dashed">
              <AlertCircle className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">Couldn't load reports</h3>
              <p className="text-muted-foreground text-xs mt-1">{loadError}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50 border-dashed">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">No reports found</h3>
              <p className="text-muted-foreground text-xs mt-1">There are no filed reports matching your active filters.</p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const StatusIcon = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].icon;
              return (
                <div 
                  key={report.id} 
                  onClick={() => setSelectedReport(report)}
                  className="group flex flex-col sm:flex-row gap-4 p-5 bg-card border border-border/50 rounded-2xl hover:shadow-sm hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary text-sm">{report.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-foreground">{report.reason}</span>
                      <span className="text-muted-foreground text-xs">• Submitted {report.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/50 sm:border-0 pt-3 sm:pt-0">
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
                    <p className="text-xs text-muted-foreground mt-1">Your case was created and assigned to the Trust & Safety review queue.</p>
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
                      <p className="text-xs text-muted-foreground mt-0.5">This issue has been closed by platform administration.</p>
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
