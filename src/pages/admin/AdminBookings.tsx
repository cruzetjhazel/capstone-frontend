import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Pencil, X, Check, ChevronLeft, ArrowRight, Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled";

interface BookingRecord {
  id: string;
  client: string;
  photographer: string;
  photographerType: "studio" | "freelancer";
  event: string;
  date: string;
  duration: string;
  amount: number;
  status: BookingStatus;
}

const initialBookings: BookingRecord[] = [
  { id: "BK-001", client: "Emily Watson", photographer: "Rivera Studio", photographerType: "studio", event: "Wedding", date: "Mar 28, 2026", duration: "8 hrs", amount: 8000, status: "confirmed" },
  { id: "BK-002", client: "David Kim", photographer: "Anya Petrova", photographerType: "freelancer", event: "Engagement", date: "Apr 2, 2026", duration: "3 hrs", amount: 3500, status: "pending" },
  { id: "BK-003", client: "Sarah Chen", photographer: "Leo Chang", photographerType: "freelancer", event: "Corporate", date: "Apr 5, 2026", duration: "4 hrs", amount: 5000, status: "pending" },
  { id: "BK-004", client: "Tom Brennan", photographer: "Rivera Studio", photographerType: "studio", event: "Portrait", date: "Apr 8, 2026", duration: "2 hrs", amount: 2000, status: "confirmed" },
  { id: "BK-005", client: "Mia Lopez", photographer: "Sofia Mendez", photographerType: "freelancer", event: "Birthday", date: "Mar 20, 2026", duration: "5 hrs", amount: 4000, status: "completed" },
  { id: "BK-006", client: "Lisa Park", photographer: "Rivera Studio", photographerType: "studio", event: "Portrait", date: "Mar 10, 2026", duration: "1.5 hrs", amount: 1500, status: "completed" },
  { id: "BK-007", client: "Anthony Reyes", photographer: "Amara's Studio", photographerType: "studio", event: "Event", date: "Mar 30, 2026", duration: "6 hrs", amount: 8000, status: "confirmed" },
  { id: "BK-008", client: "Rica Flores", photographer: "Kap Studio", photographerType: "studio", event: "Studio Session", date: "Mar 28, 2026", duration: "2 hrs", amount: 5000, status: "confirmed" },
  { id: "BK-009", client: "Trisha Garcia", photographer: "HH Production", photographerType: "studio", event: "Pre-nup", date: "Mar 26, 2026", duration: "4 hrs", amount: 3000, status: "pending" },
  { id: "BK-010", client: "Jake Wilson", photographer: "Leo Chang", photographerType: "freelancer", event: "Graduation", date: "Apr 12, 2026", duration: "3 hrs", amount: 2500, status: "pending" },
];

const tabs = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;

const ITEMS_PER_PAGE = 8;

export default function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewBooking, setViewBooking] = useState<BookingRecord | null>(null);
  const [cancelBooking, setCancelBooking] = useState<BookingRecord | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab !== "All" && b.status !== activeTab.toLowerCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.client.toLowerCase().includes(q) && !b.photographer.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bookings, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCancel = () => {
    if (!cancelBooking) return;
    setBookings((prev) => prev.map((b) => b.id === cancelBooking.id ? { ...b, status: "cancelled" as const } : b));
    setCancelBooking(null);
    toast.success("Booking cancelled");
  };

  const handleApprove = (id: string) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "confirmed" as const } : b));
    toast.success("Booking confirmed");
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first 2, last 2, current ± 1
      const first = [1, 2];
      const last = [totalPages - 1, totalPages];
      const middle = new Set<number>();
      for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) middle.add(i);
      const all = new Set([...first, ...middle, ...last]);
      const sorted = Array.from(all).sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("...");
        pages.push(sorted[i]);
      }
    }
    return pages.map((p, i) =>
      typeof p === "string" ? (
        <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-muted-foreground">…</span>
      ) : (
        <button
          key={p}
          onClick={() => setCurrentPage(p)}
          className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
            currentPage === p
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
          }`}
        >
          {p}
        </button>
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        <h1 className="text-2xl font-heading font-bold">All Bookings</h1>

        {/* Search + Filter */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Button variant="outline" onClick={() => { setSearch(""); setActiveTab("All"); setCurrentPage(1); }} className="h-11 rounded-xl gap-2 border-border/50">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{paginatedBookings.length}</span> of{" "}
          <span className="font-semibold text-foreground">{filteredBookings.length}</span> bookings
        </p>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border/40 card-shadow overflow-hidden">
          <div className="grid grid-cols-[0.8fr_1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/30">
            <span>ID</span>
            <span>Client</span>
            <span>Photographer</span>
            <span>Event</span>
            <span>Date</span>
            <span>Duration</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-center">Actions</span>
          </div>

          {paginatedBookings.map((b) => {
            const showApprove = b.status === "pending";
            return (
              <div
                key={b.id}
                className="grid grid-cols-[0.8fr_1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 px-6 py-4 items-center border-b border-border/20 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm font-medium">{b.id}</p>
                <p className="text-sm truncate">{b.client}</p>
                <div className="min-w-0">
                  <p className="text-sm truncate">{b.photographer}</p>
                  <p className="text-xs text-muted-foreground capitalize">{b.photographerType}</p>
                </div>
                <p className="text-sm text-muted-foreground">{b.event}</p>
                <p className="text-sm text-muted-foreground">{b.date.split(", ")[0]}</p>
                <p className="text-sm text-muted-foreground">{b.duration}</p>
                <p className="text-sm font-semibold">₱{b.amount.toLocaleString()}</p>
                <div><StatusBadge status={b.status} /></div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setViewBooking(b)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-100 text-blue-500 hover:bg-blue-200 transition-colors dark:bg-blue-500/15 dark:hover:bg-blue-500/25"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {showApprove ? (
                    <button
                      onClick={() => handleApprove(b.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-green-100 text-green-600 hover:bg-green-200 transition-colors dark:bg-green-500/15 dark:hover:bg-green-500/25"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : null}
                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <button
                      onClick={() => setCancelBooking(b)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-200 transition-colors dark:bg-red-500/15 dark:hover:bg-red-500/25"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {paginatedBookings.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No bookings found.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl gap-1.5 h-10 px-4 bg-muted/40 text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1 mx-1">
              {renderPageNumbers()}
            </div>
            <Button
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl gap-1.5 h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewBooking} onOpenChange={(open) => !open && setViewBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>Full booking information.</DialogDescription>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Booking ID", viewBooking.id],
                  ["Client", viewBooking.client],
                  ["Photographer", viewBooking.photographer],
                  ["Type", viewBooking.photographerType],
                  ["Event", viewBooking.event],
                  ["Date", viewBooking.date],
                  ["Duration", viewBooking.duration],
                  ["Amount", `₱${viewBooking.amount.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={viewBooking.status} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => !open && setCancelBooking(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>Are you sure you want to cancel booking {cancelBooking?.id}?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelBooking(null)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancel}>Cancel Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
