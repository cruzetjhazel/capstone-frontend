import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, Calendar, DollarSign, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Pagination, usePagination } from "@/components/ListPagination";

const PAGE_SIZE = 10;

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
    default:
      return (
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
      );
  }
};

export default function ClientActivityLog() {
  const { data: logs = [], isLoading, error, refetch } = useActivityLogs("client");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = log.title.toLowerCase().includes(q) || log.description.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "other" ? !["bookings", "payments"].includes(log.category) : log.category === categoryFilter);

      let matchesDate = true;
      if (dateFilter !== "all") {
        const diffInDays = Math.floor((Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24));
        if (dateFilter === "today") matchesDate = diffInDays === 0;
        if (dateFilter === "7days") matchesDate = diffInDays <= 7;
        if (dateFilter === "month") matchesDate = diffInDays <= 30;
      }
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [logs, searchQuery, categoryFilter, dateFilter]);

  const pager = usePagination(filteredLogs, PAGE_SIZE, `${searchQuery}|${dateFilter}|${categoryFilter}`);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">A record of your own actions on the platform.</p>
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
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">Loading activity...</div>}

        {!isLoading && error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
            <span>Unable to load your activity.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden card-shadow">
            <div className="divide-y divide-border">
              {filteredLogs.length > 0 ? (
                pager.pageItems.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    {renderIcon(log.category)}
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{log.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
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
                  <p className="text-sm font-medium">No activity found.</p>
                  <p className="text-xs opacity-70 mt-1">Try adjusting your search or filter settings.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && !error && <Pagination pagination={pager} />}
      </div>
    </DashboardLayout>
  );
}
