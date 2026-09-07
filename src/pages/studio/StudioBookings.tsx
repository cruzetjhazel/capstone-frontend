import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingTracker } from "@/components/BookingTracker";
import {
  Check, DollarSign, AlertCircle, ArrowRight,
  Search, SlidersHorizontal, ArrowUpDown,
} from "lucide-react";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/services/clientProfileService";
import {
  usePhotographerBookings,
  useAcceptBooking,
  useRejectBooking,
  useApproveCancellation,
  useRejectCancellation,
  useUpdateServiceTracker,
  useRecordOnsitePayment,
} from "@/hooks/usePhotographerBookings";
import type { StudioBookingRecord } from "@/services/photographerBookingService";

type FilterTab = "All" | "Pending" | "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Expired";
type SortOption = "newest" | "oldest" | "event_soonest" | "event_latest" | "price_low" | "price_high";

// A "pending" booking's 24h review window (set by CreateBookingAction) may
// have lapsed server-side before ExpireStaleBookingHoldsAction next runs and
// flips its status to "expired". AcceptBookingAction rejects these with a
// validation error, so we detect it client-side first and disable the
// Accept/Decline actions instead of letting the request fail confusingly.
function isPendingHoldExpired(b: StudioBookingRecord): boolean {
  return b.status === "pending" && !!b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now();
}

// A confirmed booking whose service tracker has moved past its default first
// stage is treated as "in progress" for tab purposes — no separate backend
// status exists for this, so we derive it from the same tracker data the
// card's "Update status" control already reads.
function isServiceInProgress(b: StudioBookingRecord): boolean {
  return b.status === "confirmed" && !!b.serviceStatus && b.serviceStatus !== trackingStages[0]?.id;
}

function parseBookingDateTime(b: StudioBookingRecord): number {
  const withTime = new Date(`${b.date} ${b.startTime}`).getTime();
  if (!isNaN(withTime)) return withTime;
  const dateOnly = new Date(b.date).getTime();
  return isNaN(dateOnly) ? 0 : dateOnly;
}

function sortBookings(list: StudioBookingRecord[], sort: SortOption): StudioBookingRecord[] {
  const arr = [...list];
  switch (sort) {
    case "oldest": return arr.reverse();
    case "event_soonest": return arr.sort((a, b) => parseBookingDateTime(a) - parseBookingDateTime(b));
    case "event_latest": return arr.sort((a, b) => parseBookingDateTime(b) - parseBookingDateTime(a));
    case "price_low": return arr.sort((a, b) => a.totalPrice - b.totalPrice);
    case "price_high": return arr.sort((a, b) => b.totalPrice - a.totalPrice);
    case "newest":
    default: return arr; // bookings load newest-first from the API
  }
}

export default function StudioBookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: bookings = [], isLoading, error, refetch } = usePhotographerBookings();
  const acceptMutation = useAcceptBooking();
  const rejectMutation = useRejectBooking();
  const approveCancelMutation = useApproveCancellation();
  const rejectCancelMutation = useRejectCancellation();
  const trackerMutation = useUpdateServiceTracker();
  const onsitePaymentMutation = useRecordOnsitePayment();

  const [filter, setFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [pendingAction, setPendingAction] = useState<{ type: "accept" | "decline"; booking: StudioBookingRecord } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<StudioBookingRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [cancellationActionFor, setCancellationActionFor] = useState<{ type: "approve" | "reject"; booking: StudioBookingRecord } | null>(null);
  const [pendingTrackerChange, setPendingTrackerChange] = useState<{ booking: StudioBookingRecord; stage: TrackingStage } | null>(null);

  const packageOptions = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.packageName).filter(Boolean))),
    [bookings]
  );
  const clientOptions = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.clientName).filter(Boolean))),
    [bookings]
  );

  const tabFiltered = bookings.filter((b) => {
    switch (filter) {
      case "All": return b.status !== "cancelled";
      case "Pending": return b.status === "pending";
      case "Confirmed": return b.status === "confirmed" && !isServiceInProgress(b);
      case "In Progress": return isServiceInProgress(b);
      case "Completed": return b.status === "completed";
      case "Cancelled": return b.status === "cancelled";
      case "Expired": return b.status === "expired";
      default: return true;
    }
  });

  const searched = tabFiltered.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      b.clientName.toLowerCase().includes(q) ||
      b.packageName.toLowerCase().includes(q) ||
      b.eventType.toLowerCase().includes(q)
    );
  });

  const advancedFiltered = searched.filter((b) => {
    if (paymentFilter !== "all" && (b.paymentStatus ?? "pending") !== paymentFilter) return false;
    if (packageFilter !== "all" && b.packageName !== packageFilter) return false;
    if (clientFilter !== "all" && b.clientName !== clientFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      const bd = new Date(b.date).getTime();
      if (!isNaN(from) && !isNaN(bd) && bd < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      const bd = new Date(b.date).getTime();
      if (!isNaN(to) && !isNaN(bd) && bd > to) return false;
    }
    return true;
  });

  const visible = sortBookings(advancedFiltered, sortBy);
  const activeFilterCount = [paymentFilter !== "all", packageFilter !== "all", clientFilter !== "all", !!dateFrom, !!dateTo].filter(Boolean).length;
  const hasSearchOrFilters = !!search.trim() || activeFilterCount > 0;

  const resetAdvancedFilters = () => {
    setPaymentFilter("all");
    setPackageFilter("all");
    setClientFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const confirmAccept = async () => {
    if (!pendingAction) return;
    try {
      await acceptMutation.mutateAsync(pendingAction.booking.id);
      toast({ title: "Booking accepted", description: "Client notified to proceed with payment." });
      setPendingAction(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const confirmReject = async () => {
    if (!pendingAction || !rejectionReason.trim()) {
      toast({ title: "Reason required", description: "A rejection reason is required.", variant: "destructive" as never });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: pendingAction.booking.id, reason: rejectionReason });
      toast({ title: "Booking declined", description: "Reason logged and client notified." });
      setPendingAction(null);
      setRejectionReason("");
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const confirmOnsitePayment = async () => {
    if (!recordingPaymentFor || paymentAmountInput <= 0) return;
    try {
      const paymentDate = new Date().toISOString().slice(0, 10); // Y-m-d, today
      await onsitePaymentMutation.mutateAsync({ id: recordingPaymentFor.id, amount: paymentAmountInput, paymentDate });
      toast({ title: "Payment recorded", description: `Recorded onsite payment of ₱${paymentAmountInput.toLocaleString()}.` });
      setRecordingPaymentFor(null);
      setPaymentAmountInput(0);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleTrackerChange = async (id: string, stage: TrackingStage) => {
    try {
      await trackerMutation.mutateAsync({ id, status: stage });
      toast({ title: "Service tracker updated", description: `Updated to: ${stage.replace(/_/g, " ")}.` });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const confirmTrackerChange = async () => {
    if (!pendingTrackerChange) return;
    await handleTrackerChange(pendingTrackerChange.booking.id, pendingTrackerChange.stage);
    setPendingTrackerChange(null);
  };

  const confirmCancellationDecision = async () => {
    if (!cancellationActionFor) return;
    try {
      if (cancellationActionFor.type === "approve") {
        await approveCancelMutation.mutateAsync(cancellationActionFor.booking.id);
        toast({ title: "Cancellation approved", description: "The booking has been cancelled." });
      } else {
        await rejectCancelMutation.mutateAsync(cancellationActionFor.booking.id);
        toast({ title: "Cancellation request rejected", description: "The booking remains active." });
      }
      setCancellationActionFor(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const isMutating = acceptMutation.isPending || rejectMutation.isPending || approveCancelMutation.isPending || rejectCancelMutation.isPending || onsitePaymentMutation.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 animate-fade-up relative pb-12">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your studio bookings.</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-full border border-border/50 overflow-x-auto w-fit max-w-full">
          {(["All", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled", "Expired"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search / Filter / Sort toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookings..."
              className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <div className="relative">
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setFiltersOpen((v) => !v)}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 text-[10px] leading-none bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {filtersOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl p-4 space-y-3 z-30">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Payment status</label>
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:ring-1 focus:ring-ring"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="pending_verification">Pending Verification</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="fully_paid">Fully Paid</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Package</label>
                    <select
                      value={packageFilter}
                      onChange={(e) => setPackageFilter(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:ring-1 focus:ring-ring"
                    >
                      <option value="all">All packages</option>
                      {packageOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Client</label>
                    <select
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:ring-1 focus:ring-ring"
                    >
                      <option value="all">All clients</option>
                      {clientOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <button onClick={resetAdvancedFilters} className="text-xs text-muted-foreground hover:text-foreground pt-2">
                      Clear filters
                    </button>
                    <Button size="sm" className="h-7 text-xs mt-2" onClick={() => setFiltersOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-9 rounded-md border border-input bg-transparent pl-3 pr-8 text-xs focus:ring-1 focus:ring-ring appearance-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="event_soonest">Event date: Soonest</option>
                <option value="event_latest">Event date: Latest</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-sm text-muted-foreground animate-pulse">Loading bookings…</div>
        )}

        {!isLoading && error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
            <span>{getApiErrorMessage(error, "Unable to load bookings.")}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !error && (
        <div className="space-y-3">
          {visible.map((b) => {
            const holdExpired = b.status === "pending" && isPendingHoldExpired(b);
            const showTracker = (b.status === "confirmed" || b.status === "completed") && !b.hasActiveCancellationRequest;
            const displayStage = (b.serviceStatus ?? trackingStages[0].id) as TrackingStage;

            return (
              <div key={b.id} className={cn(
                "bg-card rounded-2xl card-shadow border p-4 sm:p-5 transition-all",
                b.status === "cancelled" ? "border-border/40 opacity-80" : "border-border/50"
              )}>
                {/* Compact scan row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0",
                      b.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary"
                    )}>
                      {b.clientName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("font-medium text-sm truncate", b.status === "cancelled" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                        {b.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{b.packageName} · {b.eventType}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.date} · {b.startTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className={cn("font-heading font-bold text-sm", b.status === "cancelled" ? "text-muted-foreground" : "text-primary")}>
                      ₱{b.totalPrice.toLocaleString()}
                    </p>
                    <StatusBadge status={b.status as any} />

                    {b.status === "pending" && !b.hasActiveCancellationRequest && !holdExpired ? (
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setPendingAction({ type: "decline", booking: b })} disabled={isMutating}>
                          Decline
                        </Button>
                        <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setPendingAction({ type: "accept", booking: b })} disabled={isMutating}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate(`/studio/bookings/${b.id}`)}>
                          View <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/studio/bookings/${b.id}`)}>
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Only surface what needs the owner's attention below the row */}
                {b.hasActiveCancellationRequest && (
                  <div className="flex items-center justify-between gap-3 p-3 mt-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive truncate">Client requested cancellation{b.cancellationReason ? `: "${b.cancellationReason}"` : "."}</p>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCancellationActionFor({ type: "reject", booking: b })}>Keep</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setCancellationActionFor({ type: "approve", booking: b })}>Approve</Button>
                    </div>
                  </div>
                )}

                {b.status === "pending" && !b.hasActiveCancellationRequest && holdExpired && (
                  <div className="flex items-center gap-2 p-2.5 mt-3 rounded-lg bg-muted/50 border border-border/60">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      <p className="text-xs text-muted-foreground">Response window expired — this request will automatically be marked Expired and moved to the Expired tab.</p>
                  </div>
                )}

                {b.status === "confirmed" && !b.hasActiveCancellationRequest && b.paymentStatus === "pending_verification" && (
                  <div className="flex items-center justify-between gap-3 p-2.5 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-900 dark:text-amber-400">Client submitted a GCash reference — needs review.</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => navigate("/studio/earnings")}>
                      Review Payment
                    </Button>
                  </div>
                )}

                {showTracker && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-border/60">
                    <BookingTracker currentStage={displayStage} />
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {b.remainingBalance > 0 && b.paymentPlan === "half" && b.paymentStatus !== "fully_paid" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { setRecordingPaymentFor(b); setPaymentAmountInput(b.remainingBalance); }}>
                          <DollarSign className="w-3.5 h-3.5" /> Record Payment
                        </Button>
                      )}
                      <select
                        value={displayStage}
                        onChange={(e) => setPendingTrackerChange({ booking: b, stage: e.target.value as TrackingStage })}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 ring-primary"
                        disabled={trackerMutation.isPending}
                      >
                        {trackingStages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="text-center py-16 px-4 bg-card/50 rounded-2xl border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">
                {hasSearchOrFilters ? "No bookings match your search or filters." : `No bookings found in the "${filter}" view.`}
              </p>
            </div>
          )}
        </div>
        )}

        {/* CONFIRMATION MODAL: Accept / Decline */}
        {pendingAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {pendingAction.type === 'accept' ? <><Check className="text-emerald-500 w-5 h-5"/> Accept Booking Request</> : <><AlertCircle className="text-destructive w-5 h-5"/> Decline Request</>}
              </h3>

              {pendingAction.type === 'accept' ? (
                 <p className="text-sm text-muted-foreground">Accepting this request will notify the client to proceed with their online deposit payment.</p>
              ) : (
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Reason for Rejection <span className="text-destructive">*</span></label>
                   <textarea
                     value={rejectionReason}
                     onChange={(e) => setRejectionReason(e.target.value)}
                     placeholder="e.g., Schedule conflict, outside coverage area..."
                     className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
                   />
                 </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setPendingAction(null)} disabled={isMutating}>Cancel</Button>
                <Button variant={pendingAction.type === 'accept' ? 'default' : 'destructive'} onClick={pendingAction.type === 'accept' ? confirmAccept : confirmReject} disabled={isMutating}>
                  {isMutating ? "Processing…" : pendingAction.type === 'accept' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: Cancellation Decision */}
        {cancellationActionFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className={cn("w-5 h-5", cancellationActionFor.type === "approve" ? "text-destructive" : "text-emerald-500")} />
                {cancellationActionFor.type === "approve" ? "Approve Cancellation?" : "Keep This Booking?"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {cancellationActionFor.type === "approve"
                  ? "This will cancel the booking permanently. The client will be notified."
                  : "This will reject the client's cancellation request and keep the booking active. The client will be notified."}
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setCancellationActionFor(null)} disabled={isMutating}>Back</Button>
                <Button variant={cancellationActionFor.type === "approve" ? "destructive" : "default"} onClick={confirmCancellationDecision} disabled={isMutating}>
                  {isMutating ? "Processing…" : cancellationActionFor.type === "approve" ? "Approve Cancellation" : "Keep Booking"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: Record Onsite Payment */}
        {recordingPaymentFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign className="text-primary w-5 h-5"/> Record Onsite Payment</h3>
              <p className="text-sm text-muted-foreground">
                Use this to log a cash or offline payment <strong>{recordingPaymentFor.clientName}</strong> already gave you in person for this booking. This only records that you received it — it does not charge the client.
              </p>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Booking total</span>
                  <span className="font-medium">₱{recordingPaymentFor.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining balance</span>
                  <span className="font-semibold text-primary">₱{recordingPaymentFor.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">Amount Received (₱)</label>
                 <input
                   type="number"
                   value={paymentAmountInput}
                   onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                   max={recordingPaymentFor.remainingBalance}
                   className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:ring-1 focus:ring-ring"
                 />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setRecordingPaymentFor(null)} disabled={isMutating}>Cancel</Button>
                <Button onClick={confirmOnsitePayment} disabled={isMutating}>{isMutating ? "Saving…" : "Record Payment"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: Service Tracker Update */}
        {pendingTrackerChange && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Check className="text-primary w-5 h-5" /> Update Service Stage?
              </h3>
              <p className="text-sm text-muted-foreground">
                Move <strong>{pendingTrackerChange.booking.clientName}</strong>'s booking to{" "}
                <strong>{trackingStages.find((s) => s.id === pendingTrackerChange.stage)?.label ?? pendingTrackerChange.stage}</strong>?
                The client will see this update immediately.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setPendingTrackerChange(null)} disabled={trackerMutation.isPending}>Cancel</Button>
                <Button onClick={confirmTrackerChange} disabled={trackerMutation.isPending}>
                  {trackerMutation.isPending ? "Updating…" : "Confirm Update"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
