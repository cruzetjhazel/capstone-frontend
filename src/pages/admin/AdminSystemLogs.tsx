import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Search, Filter, Activity, AlertTriangle, 
  CheckCircle2, Info, XCircle, Eye, X, Calendar, Archive
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";

interface ActivityLog {
  id: string;
  datetime: string;
  performedBy: string;
  role: "Client" | "Freelancer" | "Studio" | "Administrator" | "System";
  category: "Bookings" | "Payments" | "Users" | "Verifications" | "Reports" | "Reviews" | "Archives" | "System";
  target: string; 
  activity: string;
  status: "Success" | "Information" | "Warning" | "Error";
}

const mockLogs: ActivityLog[] = [
  { 
    id: "LOG-1001", 
    datetime: "Jul 22, 2026 10:45 AM", 
    performedBy: "Admin", 
    role: "Administrator",
    category: "Verifications", 
    target: "Lumina Studios",
    activity: "Approved Professional application", 
    status: "Success"
  },
  { 
    id: "LOG-1002", 
    datetime: "Jul 21, 2026 9:30 AM", 
    performedBy: "Juan Dela Cruz", 
    role: "Client",
    category: "Bookings", 
    target: "BK-1042",
    activity: "Submitted custom package booking request", 
    status: "Information"
  },
  { 
    id: "LOG-1003", 
    datetime: "Jul 20, 2026 2:20 PM", 
    performedBy: "Pixel Perfect Studio", 
    role: "Studio",
    category: "Bookings", 
    target: "BK-1042",
    activity: "Accepted booking request", 
    status: "Success"
  },
  { 
    id: "LOG-1004", 
    datetime: "Jul 20, 2026 9:15 AM", 
    performedBy: "System", 
    role: "System",
    category: "Payments", 
    target: "BK-1042",
    activity: "Automatic payment reference matched via Xendit", 
    status: "Success"
  },
  { 
    id: "LOG-1005", 
    datetime: "Jul 19, 2026 5:10 PM", 
    performedBy: "Admin", 
    role: "Administrator",
    category: "Users", 
    target: "Mark Johnson",
    activity: "Suspended account due to reports", 
    status: "Warning"
  },
  { 
    id: "LOG-1006", 
    datetime: "Jul 18, 2026 2:45 PM", 
    performedBy: "John Photographer", 
    role: "Freelancer",
    category: "Reviews", 
    target: "Review RV-304",
    activity: "Submitted official reply to review", 
    status: "Success"
  }
];

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>(mockLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const filteredLogs = logs.filter(log => {
    // Text Search
    const matchesSearch = 
      log.activity.toLowerCase().includes(searchQuery.toLowerCase()) || 
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category & Role Filters
    const matchesRole = roleFilter === "All" || log.role === roleFilter;
    const matchesActivity = activityFilter === "All" || log.category === activityFilter;
    
    // Date Filtering Logic
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.datetime);
      const filterStart = startDate ? new Date(startDate) : null;
      const filterEnd = endDate ? new Date(endDate) : null;
      
      if (filterStart) filterStart.setHours(0, 0, 0, 0);
      if (filterEnd) filterEnd.setHours(23, 59, 59, 999);

      if (filterStart && logDate < filterStart) matchesDate = false;
      if (filterEnd && logDate > filterEnd) matchesDate = false;
    }
    
    return matchesSearch && matchesRole && matchesActivity && matchesDate;
  });

  const handleArchiveLogs = () => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to archive based on current filters.");
      setShowArchiveModal(false);
      return;
    }
    
    // Simulating moving logs to archive
    const filteredIds = filteredLogs.map(log => log.id);
    setLogs(prev => prev.filter(log => !filteredIds.includes(log.id)));
    
    toast.success(`${filteredLogs.length} activity logs successfully archived.`);
    setShowArchiveModal(false);
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "Success": 
        return <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><CheckCircle2 className="w-4 h-4" /> Success</span>;
      case "Warning": 
        return <span className="flex items-center gap-1.5 text-amber-600 font-medium"><AlertTriangle className="w-4 h-4" /> Warning</span>;
      case "Error": 
        return <span className="flex items-center gap-1.5 text-destructive font-medium"><XCircle className="w-4 h-4" /> Error</span>;
      default: 
        return <span className="flex items-center gap-1.5 text-blue-600 font-medium"><Info className="w-4 h-4" /> Info</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Administrator": return <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-md text-xs font-semibold">Administrator</span>;
      case "Studio": return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-md text-xs font-semibold">Studio</span>;
      case "Freelancer": return <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-md text-xs font-semibold">Freelancer</span>;
      case "Client": return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs font-semibold">Client</span>;
      default: return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs font-semibold">System</span>;
    }
  };

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              System Activity Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor platform activities, bookings, payments, and administrative changes.
            </p>
          </div>
          <Button onClick={() => setShowArchiveModal(true)} variant="outline" className="shrink-0 gap-2">
            <Archive className="w-4 h-4" />
            Archive Displayed Logs
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col lg:flex-row gap-4 shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search target, activity, or user..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          
          {/* Dropdown Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="All">All Roles</option>
                <option value="Administrator">Administrator</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Studio">Studio</option>
                <option value="Client">Client</option>
                <option value="System">System</option>
              </select>
            </div>
            
            <div className="w-full sm:w-auto">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="All">All Categories</option>
                <option value="Bookings">Bookings</option>
                <option value="Payments">Payments</option>
                <option value="Users">Users</option>
                <option value="Verifications">Verifications</option>
                <option value="Reports">Reports</option>
                <option value="Reviews">Reviews</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2 border-t lg:border-t-0 lg:border-l border-border/50 pt-4 lg:pt-0 lg:pl-4">
             <div className="relative w-full sm:w-auto">
               <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input 
                 type="date"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="pl-9 h-10 w-full"
                 title="Start Date"
               />
             </div>
             <span className="text-muted-foreground hidden sm:block">-</span>
             <div className="relative w-full sm:w-auto">
               <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input 
                 type="date"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="pl-9 h-10 w-full"
                 title="End Date"
               />
             </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Performed By</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Affected Target</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Activity</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{log.datetime}</td>
                    <td className="px-4 py-3 font-medium">{log.performedBy}</td>
                    <td className="px-4 py-3">{getRoleBadge(log.role)}</td>
                    <td className="px-4 py-3 font-medium text-foreground/80">{log.target}</td>
                    <td className="px-4 py-3 max-w-[250px] truncate">{log.activity}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusDisplay(log.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedLog(log)}
                        className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No logs found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 m-4 relative">
            <button 
              onClick={() => setSelectedLog(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-heading font-bold text-foreground mb-4">Activity Details</h3>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Date & Time</span>
                <span className="col-span-2">{selectedLog.datetime}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium">Performed By</span>
                <span className="col-span-2 flex items-center gap-2">
                  <span className="font-medium">{selectedLog.performedBy}</span>
                  {getRoleBadge(selectedLog.role)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Category</span>
                <span className="col-span-2">
                  <span className="bg-muted px-2 py-0.5 rounded-md text-xs font-medium border border-border/50">
                    {selectedLog.category}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Reference</span>
                <span className="col-span-2 font-medium">{selectedLog.target}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3">
                <span className="text-muted-foreground font-medium">Status</span>
                <span className="col-span-2">{getStatusDisplay(selectedLog.status)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <span className="text-muted-foreground font-medium">Activity</span>
                <span className="col-span-2 text-foreground">{selectedLog.activity}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedLog(null)} className="w-full sm:w-auto">
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 m-4 relative">
             <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
             </div>
             <h3 className="text-lg font-heading font-bold text-foreground mb-2">Archive Logs</h3>
             <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to move the currently displayed <strong>{filteredLogs.length}</strong> logs to the administrative archives? You can review them later in the Archive Management section.
             </p>
             <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowArchiveModal(false)}>
                   Cancel
                </Button>
                <Button variant="default" onClick={handleArchiveLogs}>
                   Confirm Archiving
                </Button>
             </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}