import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Eye, Search, RotateCcw, ChevronLeft, ChevronRight,
  Calendar, Clock, CreditCard, User, Aperture, FileText, Activity, AlertCircle,
  CalendarDays, CheckCircle2, CheckCircle, XCircle, Receipt, Check, X, Ban, MapPin, Users, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

// --- Types Aligned with System Requirements ---
type BookingStatus = "Pending" | "Accepted" | "Confirmed" | "Rejected" | "Cancelled" | "Completed" | "Expired";
type PaymentStatus = "Pending" | "Pending Verification" | "Partially Paid" | "Fully Paid" | "Failed" | "Cancelled";
type TrackingStatus = "Upcoming" | "In Progress" | "Completed" | "Pending";
type PaymentPlan = "Half Payment" | "Full Payment";
type ProfessionalType = "Freelancer" | "Studio";

interface ServiceTrackingStep {
  label: string;
  status: TrackingStatus;
  date?: string | null;
}

interface BookingRecord {
  id: string;
  rawId: number;
  client: string;
  clientEmail: string | null;
  clientPhone: string | null;
  photographer: string;
  photographerId: number | null;
  professionalType: ProfessionalType;
  event: string;
  eventLocation: string;
  eventAddress?: string | null;
  guests?: number | null;
  bookingDate: string | null;
  eventDate: string | null;
  startingTime: string | null;
  expectedEndTime: string | null;
  paymentStatus: PaymentStatus;
  paymentPlan: PaymentPlan;
  status: BookingStatus;
  package: string;
  addons: string[];
  totalAmount: number;
  amountPaid: number;
  balance: number;
  invoiceId: string | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  clientNotes: string | null;
  cancellationReason?: string | null;
  serviceTracking: ServiceTrackingStep[];
}

function fromApi(raw: any): BookingRecord {
  return {
    id: raw.id,
    rawId: raw.raw_id,
    client: raw.client,
    clientEmail: raw.clientEmail,
    clientPhone: raw.clientPhone,
    photographer: raw.photographer,
    photographerId: raw.photographerId,
    professionalType: raw.professionalType === "Studio" ? "Studio" : "Freelancer",
    event: raw.event,
    eventLocation: raw.eventLocation,
    eventAddress: raw.eventAddress,
    guests: raw.guests,
    bookingDate: raw.bookingDate,
    eventDate: raw.eventDate,
    startingTime: raw.startingTime,
    expectedEndTime: raw.expectedEndTime,
    paymentStatus: raw.paymentStatus,
    paymentPlan: raw.paymentPlan,
    status: raw.status,
    package: raw.package,
    addons: raw.addons ?? [],
    totalAmount: Number(raw.totalAmount ?? 0),
    amountPaid: Number(raw.amountPaid ?? 0),
    balance: Number(raw.balance ?? 0),
    invoiceId: raw.invoiceId,
    paymentMethod: raw.paymentMethod,
    paymentDate: raw.paymentDate,
    clientNotes: raw.clientNotes,
    cancellationReason: raw.cancellationReason,
    serviceTracking: raw.serviceTracking ?? [],
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

// --- Configs ---
const bookingStatusConfig: Record<string, string> = {
  "Pending": "bg-amber-500/10 text-amber-600",
  "Accepted": "bg-blue-500/10 text-blue-600",
  "Confirmed": "bg-emerald-500/10 text-emerald-600",
  "Rejected": "bg-orange-500/10 text-orange-600",
  "Completed": "bg-primary/10 text-primary",
  "Cancelled": "bg-destructive/10 text-destructive",
  "Expired": "bg-muted text-muted-foreground",
};

const paymentStatusConfig: Record<string, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Pending Verification": "bg-amber-500/10 text-amber-600",
  "Partially Paid": "bg-blue-500/10 text-blue-600",
  "Fully Paid": "bg-emerald-500/10 text-emerald-600",
  "Failed": "bg-destructive/10 text-destructive",
  "Cancelled": "bg-destructive/10 text-destructive",
};

type Studio = { id: number; name: string };

export default function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [platformStats, setPlatformStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled_or_rejected: 0 });

  const [studios, setStudios] = useState<Studio[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [studioFilter, setStudioFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [viewBooking, setViewBooking] = useState<BookingRecord | null>(null);
  const [viewPayment, setViewPayment] = useState<BookingRecord | null>(null);
  const [cancelModal, setCancelModal] = useState<BookingRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Studio filter options — reuse the existing user-management endpoint.
  useEffect(() => {
    api.get("/admin/users", { params: { account_type: "photographer", account_status: "active" } })
      .then((res) => {
        const list = unwrapList(res.data);
        setStudios(list.map((u: any) => ({ id: u.id, name: u.name })));
      })
      .catch(() => { /* non-critical — filter just won't populate */ });
  }, []);

  const fetchBookings = () => {
    setIsLoading(true);
    setLoadError("");

    const statusMap: Record<string, string> = {
      Pending: "pending", Accepted: "accepted", Confirmed: "confirmed",
      Rejected: "rejected", Cancelled: "cancelled", Completed: "completed",
    };
    const paymentMap: Record<string, string> = {
      Pending: "pending", "Pending Verification": "pending_verification",
      "Partially Paid": "partially_paid", "Fully Paid": "fully_paid",
      Failed: "failed", Cancelled: "cancelled",
    };

    api.get("/admin/bookings", {
      params: {
        per_page: ITEMS_PER_PAGE,
        page: currentPage,
        status: statusFilter !== "all" ? statusMap[statusFilter] : undefined,
        payment_status: paymentFilter !== "all" ? paymentMap[paymentFilter] : undefined,
        photographer_id: studioFilter !== "all" ? studioFilter : undefined,
        date_filter: dateFilter !== "all" ? dateFilter : undefined,
        search: search || undefined,
      },
    })
      .then((res) => {
        const envelope = unwrapObject(res.data);
        const paginated = envelope.bookings ?? {};
        const list = unwrapList(paginated);
        setBookings(list.map(fromApi));
        setTotalPages(paginated.last_page ?? 1);
        setTotalCount(paginated.total ?? list.length);
        if (envelope.stats) setPlatformStats(envelope.stats);
      })
      .catch((err) => {
        setLoadError(getApiErrorMessage(err, "Failed to load bookings."));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, paymentFilter, studioFilter, dateFilter, currentPage]);

  // Debounce free-text search so it doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchBookings();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setStudioFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    setIsCancelling(true);
    try {
      await api.post(`/admin/bookings/${cancelModal.rawId}/cancel`);
      toast.success(`Booking ${cancelModal.id} has been cancelled.`);
      setCancelModal(null);
      fetchBookings();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "That booking couldn't be cancelled."));
    } finally {
      setIsCancelling(false);
    }
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  const stats = [
    { label: "Total Bookings", value: platformStats.total.toLocaleString(), subtext: "Platform-wide", icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Pending", value: platformStats.pending.toLocaleString(), subtext: "Awaiting studio action", icon: Clock, color: "bg-amber-500/10 text-amber-600" },
    { label: "Confirmed", value: platformStats.confirmed.toLocaleString(), subtext: "Active bookings", icon: CheckCircle2, color: "bg-blue-500/10 text-blue-600" },
    { label: "Completed", value: platformStats.completed.toLocaleString(), subtext: "Finished events", icon: CheckCircle, color: "bg-primary/10 text-primary" },
    { label: "Cancelled/Rejected", value: platformStats.cancelled_or_rejected.toLocaleString(), subtext: "Not proceeding", icon: XCircle, color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4 border border-border/50 card-shadow hover:card-shadow-hover transition-shadow duration-200">
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

        {/* Filters Section */}
        <div className="bg-card rounded-xl border border-border/50 p-5 card-shadow space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search booking ID, client, studio, or event..."
              className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={studioFilter} onValueChange={(v) => { setStudioFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                <SelectValue placeholder="Studio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studios</SelectItem>
                {studios.map(studio => (
                  <SelectItem key={studio.id} value={String(studio.id)}>{studio.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                <SelectValue placeholder="Booking Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters} className="h-10 rounded-xl gap-2 border-border/50">
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-card rounded-xl border border-border/50 card-shadow overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted/20">
                  <th className="px-5 py-3.5 font-semibold">Booking ID</th>
                  <th className="px-5 py-3.5 font-semibold">Client</th>
                  <th className="px-5 py-3.5 font-semibold">Studio</th>
                  <th className="px-5 py-3.5 font-semibold">Event</th>
                  <th className="px-5 py-3.5 font-semibold">Booking Date</th>
                  <th className="px-5 py-3.5 font-semibold">Event Date</th>
                  <th className="px-5 py-3.5 font-semibold">Payment Status</th>
                  <th className="px-5 py-3.5 font-semibold">Booking Status</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading bookings…
                    </td>
                  </tr>
                )}

                {!isLoading && loadError && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-rose-600">{loadError}</td>
                  </tr>
                )}

                {!isLoading && !loadError && bookings.map((b) => (
                  <tr key={b.rawId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{b.id}</td>
                    <td className="px-5 py-3.5 text-sm font-medium">{b.client}</td>
                    <td className="px-5 py-3.5 text-sm">{b.photographer}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{b.event}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm">{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : "—"}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{b.bookingDate ? new Date(b.bookingDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm">{b.eventDate ? new Date(b.eventDate).toLocaleDateString() : "—"}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{b.startingTime ?? ""}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${paymentStatusConfig[b.paymentStatus] ?? "bg-muted text-muted-foreground"}`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${bookingStatusConfig[b.status] ?? "bg-muted text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewBooking(b)}
                          title="View Details"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setViewPayment(b)}
                          title="View Payment"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        {(b.status !== "Cancelled" && b.status !== "Completed" && b.status !== "Rejected") && (
                          <button
                            onClick={() => setCancelModal(b)}
                            title="Force Cancel (Admin Override)"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLoading && !loadError && bookings.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No bookings found matching your search or filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-border/40 bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium">
                Showing {startItem}–{endItem} of {totalCount} bookings
              </span>
              
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 rounded-lg px-3 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                
                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (totalPages > 5 && (page < currentPage - 1 || page > currentPage + 1) && page !== 1 && page !== totalPages) {
                      if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="px-1 text-muted-foreground">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 rounded-lg px-3 text-xs">
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------- */}
      {/* CONFIRMATION CANCELLATION MODAL */}
      {/* ----------------------------- */}
      {cancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading mb-2">Cancel Booking {cancelModal.id}?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to administratively cancel this booking? This action updates the system status and payment record. No refund is processed automatically.
            </p>
            <div className="flex items-center gap-3 w-full">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCancelModal(null)} disabled={isCancelling}>
                Keep Booking
              </Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={confirmCancel} disabled={isCancelling}>
                {isCancelling && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* DETAILED BOOKING MODAL        */}
      {/* ----------------------------- */}
      {viewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative flex flex-col">
            <button 
              onClick={() => setViewBooking(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10 bg-background/50 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Modal Header */}
            <div className="bg-muted/30 px-6 py-6 pr-14 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                  Booking {viewBooking.id}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Reviewing complete booking details</p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${bookingStatusConfig[viewBooking.status] ?? "bg-muted text-muted-foreground"}`}>
                  {viewBooking.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${paymentStatusConfig[viewBooking.paymentStatus] ?? "bg-muted text-muted-foreground"}`}>
                  {viewBooking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-8">
              
              {/* Visual Service Tracking Component */}
              {viewBooking.serviceTracking.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Service Tracking Progress
                  </h3>
                  <div className="bg-muted/20 rounded-xl p-6 border border-border/50">
                    <div className="flex flex-col md:flex-row w-full">
                      {viewBooking.serviceTracking.map((step, index) => {
                        const isCompleted = step.status === "Completed";
                        const isInProgress = step.status === "In Progress";
                        const isPending = step.status === "Pending";
                        const isLast = index === viewBooking.serviceTracking.length - 1;

                        return (
                          <div key={step.label} className={`relative flex md:flex-col items-start md:items-center gap-4 md:gap-3 z-10 ${!isLast ? 'flex-1 pb-8 md:pb-0' : ''}`}>
                            
                            {!isLast && (
                              <div className={`absolute left-[15px] top-[32px] bottom-0 w-0.5 md:w-full md:h-0.5 md:left-[50%] md:top-[15px] md:bottom-auto -z-10 transition-colors duration-300 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                            )}
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 bg-card
                              ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : 
                                isInProgress ? 'border-primary text-primary shadow-[0_0_0_4px_rgba(var(--primary),0.1)]' : 
                                'border-border text-muted-foreground'} transition-all`}
                            >
                              {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                            </div>
                            
                            <div className="text-left md:text-center md:-ml-0">
                              <p className={`text-sm font-semibold ${isPending ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {step.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{step.date ? new Date(step.date).toLocaleDateString() : 'Pending'}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Schedule & Event
                    </h3>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Event Type</p>
                          <p className="text-sm font-medium">{viewBooking.event}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Booking Placed On</p>
                          <p className="text-sm font-medium">{viewBooking.bookingDate ? new Date(viewBooking.bookingDate).toLocaleString() : "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Event Date</p>
                          <p className="text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg inline-block">
                            {viewBooking.eventDate ? new Date(viewBooking.eventDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div>
                           <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Starting Time</p>
                           <p className="text-sm font-medium">{viewBooking.startingTime ?? "—"}</p>
                        </div>
                        <div>
                           <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Exp. End Time</p>
                           <p className="text-sm font-medium">{viewBooking.expectedEndTime ?? "—"}</p>
                        </div>
                        <div className="col-span-2">
                           <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location & Address</p>
                           <p className="text-sm font-medium">{viewBooking.eventLocation}</p>
                           {viewBooking.eventAddress && <p className="text-xs text-muted-foreground mt-0.5">{viewBooking.eventAddress}</p>}
                        </div>
                        {viewBooking.guests && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Guests/Participants</p>
                            <p className="text-sm font-medium">{viewBooking.guests} people</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Package & Add-ons
                    </h3>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Selected Package</p>
                        <p className="text-sm font-medium">{viewBooking.package}</p>
                      </div>
                      {viewBooking.addons.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Add-ons</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {viewBooking.addons.map(addon => (
                              <span key={addon} className="text-xs bg-muted px-2 py-1 rounded-md border border-border">
                                {addon}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Participants
                    </h3>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client Information</p>
                        <p className="text-sm font-medium">{viewBooking.client}</p>
                        <p className="text-xs text-muted-foreground">{viewBooking.clientEmail} • {viewBooking.clientPhone}</p>
                      </div>
                      <div className="h-px bg-border/50 w-full" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Professional / Studio</p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Aperture className="w-3.5 h-3.5 text-primary" /> {viewBooking.photographer}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{viewBooking.professionalType}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Billing Snapshot
                    </h3>
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-xs text-muted-foreground">Total Price</span>
                         <span className="text-sm font-semibold">₱{viewBooking.totalAmount.toLocaleString()}</span>
                       </div>
                       <div className="flex items-center justify-between mb-4">
                         <span className="text-xs text-muted-foreground">Amount Paid ({viewBooking.paymentPlan})</span>
                         <span className="text-sm font-medium text-emerald-600">₱{viewBooking.amountPaid.toLocaleString()}</span>
                       </div>
                       <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                          <span className="text-xs font-semibold">Remaining Balance</span>
                          <span className="text-lg font-bold text-primary">₱{viewBooking.balance.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Requests / Notes */}
              {(viewBooking.clientNotes || viewBooking.cancellationReason) && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Notes & Requests
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-4 border border-border/50">
                    {viewBooking.cancellationReason && (
                      <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        <p className="text-xs font-semibold text-red-600 mb-1">Cancellation Reason</p>
                        <p className="text-sm text-red-800 dark:text-red-300">{viewBooking.cancellationReason}</p>
                      </div>
                    )}
                    {viewBooking.clientNotes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client Notes</p>
                        <p className="text-sm bg-background p-3 rounded-lg border border-border italic text-muted-foreground">"{viewBooking.clientNotes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* DETAILED PAYMENT MODAL        */}
      {/* ----------------------------- */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative flex flex-col">
            <button 
              onClick={() => setViewPayment(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10 bg-background/50 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="bg-muted/30 px-6 py-6 pr-14 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                  Payment Details
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{viewPayment.id} • {viewPayment.client}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${paymentStatusConfig[viewPayment.paymentStatus] ?? "bg-muted text-muted-foreground"}`}>
                  {viewPayment.paymentStatus}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Payment Plan</span>
                  <span className="font-medium">{viewPayment.paymentPlan}</span>
                </div>
                {viewPayment.paymentDate && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Last Payment Date</span>
                    <span className="font-medium">{viewPayment.paymentDate}</span>
                  </div>
                )}
                {viewPayment.paymentMethod && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium">{viewPayment.paymentMethod}</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-5 rounded-xl border border-border/50 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">₱{viewPayment.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-emerald-600">- ₱{viewPayment.amountPaid.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="font-bold text-foreground">Remaining Balance</span>
                  <span className="text-xl font-bold text-primary">₱{viewPayment.balance.toLocaleString()}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
