import { useState, useMemo } from "react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Search, Calendar, DollarSign, Package, Download,
  Users, CheckCircle, X, HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ActivityLogs() {
  const { toast } = useToast();
  const { data: logs = [], isLoading, error, refetch } = useActivityLogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        log.title.toLowerCase().includes(searchLower) ||
        log.description.toLowerCase().includes(searchLower);

      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const logDate = new Date(log.date);
        const today = new Date();
        const diffInDays = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === "today") matchesDate = diffInDays === 0;
        if (dateFilter === "7days") matchesDate = diffInDays <= 7;
        if (dateFilter === "month") matchesDate = diffInDays <= 30;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [logs, searchQuery, categoryFilter, dateFilter]);

  const handleExportConfirm = () => {
    setIsExportModalOpen(false);

    const header = "Date,Time,Category,Title,Description,Performed By\n";
    const rows = filteredLogs.map((log) => {
      const d = new Date(log.date);
      const cells = [
        d.toLocaleDateString("en-US"),
        d.toLocaleTimeString("en-US"),
        log.category,
        log.title,
        log.description,
        log.causerName ?? "",
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
      return cells.join(",");
    });
    const csv = header + rows.join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export complete", description: `${filteredLogs.length} record(s) exported.` });
  };

  const renderIcon = (category: string) => {
    switch (category) {
      case "bookings":
        return (
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
        );
      case "payments":
        return (
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
        );
      case "packages":
        return (
          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
        );
      case "clients":
        return (
          <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">System Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and monitor all your studio's operational events.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-lg border border-border/50 card-shadow">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              className="h-9 pl-9 text-xs border-none bg-muted/50 focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs border-none bg-muted/50">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-none bg-muted/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="packages">Packages & Add-ons</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs gap-1.5"
            disabled={filteredLogs.length === 0}
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">Loading activity...</div>
        )}

        {!isLoading && error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
            <span>Unable to load activity logs.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden card-shadow">
            <div className="divide-y divide-border">

              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                    {renderIcon(log.category)}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{log.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                      {log.causerName && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">by {log.causerName}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                        {new Date(log.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap mt-0.5">
                        {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <Search className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-sm font-medium">No activity logs found.</p>
                  <p className="text-xs opacity-70 mt-1">Try adjusting your search or filter settings.</p>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col relative text-center space-y-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExportModalOpen(false)}
              className="absolute right-4 top-4 h-6 w-6 rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
              <Download className="w-6 h-6 text-primary" />
            </div>

            <h3 className="text-lg font-bold font-heading text-foreground">Export Activity Logs</h3>

            <p className="text-sm text-muted-foreground leading-relaxed">
              A CSV file containing <span className="font-bold text-foreground">{filteredLogs.length}</span> records will be generated and downloaded to your device.
            </p>

            <div className="flex items-center gap-3 w-full mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleExportConfirm}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Export
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}