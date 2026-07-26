import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Search, Filter, ShieldAlert, AlertTriangle, 
  CheckCircle2, Clock, Eye, X, MessageSquare, 
  FileText, AlertCircle, Shield, User, Send, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// --- MOCK DATA ALIGNED WITH SYSTEM REQUIREMENTS ---
interface AdminReport {
  id: string;
  date: string;
  reporterName: string;
  reporterRole: "Client" | "Studio" | "Freelancer";
  reportType: "Professionals" | "Bookings" | "Payments" | "Platform issues" | "Others";
  referenceId: string;
  reason: string;
  severity: "minor_inconvenience" | "payment_problem" | "event_tomorrow" | "emergency_safety";
  details: string;
  expectedOutcome: string;
  status: "submitted" | "under_review" | "resolved" | "closed";
  adminNotes: { date: string; note: string; author: string }[];
}

const INITIAL_REPORTS: AdminReport[] = [
  {
    id: "RPT-2048",
    date: "Jul 18, 2026 14:30",
    reporterName: "Juan Dela Cruz",
    reporterRole: "Client",
    reportType: "Payments",
    referenceId: "BK-1042",
    reason: "Payment dispute",
    severity: "payment_problem",
    details: "I was charged twice for this booking. Once upon confirmation, and again after the session ended.",
    expectedOutcome: "Refund request",
    status: "submitted",
    adminNotes: [],
  },
  {
    id: "RPT-1933",
    date: "Jul 15, 2026 09:15",
    reporterName: "Lumina Studios",
    reporterRole: "Studio",
    reportType: "Bookings",
    referenceId: "USR-992",
    reason: "Unresponsive",
    severity: "minor_inconvenience",
    details: "The client hasn't responded to any of my messages regarding the setup requirements for tomorrow.",
    expectedOutcome: "Investigate user",
    status: "under_review",
    adminNotes: [
      { date: "Jul 16, 2026", note: "Reached out to the user via email and SMS. Giving them 24 hours to respond.", author: "Admin Sarah" }
    ],
  },
  {
    id: "RPT-1882",
    date: "Jul 10, 2026 18:45",
    reporterName: "Maria Santos",
    reporterRole: "Client",
    reportType: "Professionals",
    referenceId: "STD-401",
    reason: "Harassment/Inappropriate behavior",
    severity: "emergency_safety",
    details: "The photographer was extremely unprofessional and made inappropriate comments during the shoot.",
    expectedOutcome: "Warn user",
    status: "under_review",
    adminNotes: [
      { date: "Jul 11, 2026", note: "Account temporarily suspended pending investigation.", author: "Admin Mike" }
    ],
  },
  {
    id: "RPT-1502",
    date: "Jul 02, 2026 11:20",
    reporterName: "Pixel Perfect Studio",
    reporterRole: "Studio",
    reportType: "Platform issues",
    referenceId: "N/A",
    reason: "App crash",
    severity: "minor_inconvenience",
    details: "Every time I try to upload a portfolio image over 5MB, the whole page crashes instead of showing an error.",
    expectedOutcome: "Other",
    status: "resolved",
    adminNotes: [
      { date: "Jul 03, 2026", note: "Forwarded to dev team. Memory leak found.", author: "System" },
      { date: "Jul 05, 2026", note: "Fix deployed in v2.4.1. Marking as resolved.", author: "Admin Sarah" }
    ],
  }
];

const STATUS_CONFIG = {
  submitted: { label: "Submitted", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50", icon: Clock },
  under_review: { label: "Under Review", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50", icon: Search },
  resolved: { label: "Resolved", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-muted-foreground bg-muted border-border", icon: AlertCircle },
};

const SEVERITY_CONFIG = {
  minor_inconvenience: { label: "Minor Inconvenience", color: "text-slate-600 bg-slate-100 dark:bg-slate-900" },
  payment_problem: { label: "Payment Problem", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50" },
  event_tomorrow: { label: "Event is Tomorrow", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50" },
  emergency_safety: { label: "Emergency/Safety Concern", color: "text-red-600 bg-red-100 dark:bg-red-900/50 animate-pulse" },
};

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReport[]>(INITIAL_REPORTS);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [editingStatus, setEditingStatus] = useState<AdminReport["status"]>("submitted");
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Sync editing status and reset confirmation when a new report is opened
  useEffect(() => {
    if (selectedReport) {
      setEditingStatus(selectedReport.status);
      setIsConfirmingStatus(false);
    }
  }, [selectedReport]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      report.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || report.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleUpdateStatus = () => {
    if (!selectedReport) return;
    
    const updatedReport = { ...selectedReport, status: editingStatus };
    
    setReports(prev => prev.map(r => r.id === selectedReport.id ? updatedReport : r));
    setSelectedReport(updatedReport);
    setIsConfirmingStatus(false);
    
    toast.success(`Report ${selectedReport.id} status updated to ${STATUS_CONFIG[editingStatus].label}`);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedReport) return;
    
    const newNoteObj = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      note: newNote.trim(),
      author: "Admin System", // Mock current user
    };

    const updatedReport = {
      ...selectedReport,
      adminNotes: [...selectedReport.adminNotes, newNoteObj]
    };

    setReports(prev => prev.map(r => r.id === selectedReport.id ? updatedReport : r));
    setSelectedReport(updatedReport);
    setNewNote("");
    
    toast.success("Internal note added securely.");
  };

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
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="minor_inconvenience">Minor Inconvenience</option>
                <option value="payment_problem">Payment Problem</option>
                <option value="event_tomorrow">Event is Tomorrow</option>
                <option value="emergency_safety">Emergency/Safety Concern</option>
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
                {filteredReports.map((report) => {
                  const StatusIcon = STATUS_CONFIG[report.status].icon;
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary">{report.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{report.date}</div>
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
                          {SEVERITY_CONFIG[report.severity].label}
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
                {filteredReports.length === 0 && (
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
                    {SEVERITY_CONFIG[selectedReport.severity].label}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Submitted on {selectedReport.date}</p>
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
                  <div className="bg-muted/20 rounded-xl p-4 border border-border/50 border-dashed flex items-center justify-center text-sm text-muted-foreground min-h-[100px]">
                    No files attached by the user.
                  </div>
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
                          setEditingStatus(e.target.value as AdminReport["status"]);
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
                              <span>{note.date}</span>
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
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="h-10 px-4 shrink-0 gap-2"
                        disabled={!newNote.trim()}
                      >
                        <Send className="w-4 h-4" /> 
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
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={handleUpdateStatus}
                    >
                      <Check className="w-4 h-4" /> Confirm
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