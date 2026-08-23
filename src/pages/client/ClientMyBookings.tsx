import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { usePhotographers } from "@/hooks/usePhotographers";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon, Clock, MapPin, AlertCircle,
  FileText, X, ChevronRight, Settings2, CalendarPlus, FileX, Edit3, Loader2, Star, History as HistoryIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type SimpleTab = "current" | "history";
type RequestType = "reschedule" | "cancel" | "modify" | null;

// Terminal statuses live in Booking History; everything else is "current"
const TERMINAL_STATUSES = ["completed", "cancelled", "rejected", "expired"];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

const isToday = (dateString: string) => {
  try {
    const today = new Date().toDateString();
    const bookingDate = new Date(dateString).toDateString();
    return today === bookingDate;
  } catch {
    return false;
  }
};

// Small status badge shown inside each card — replaces the old tab-per-status navigation
const getStatusBadge = (status: string, date?: string) => {
  if (status === "confirmed" && date && isToday(date)) {
    return { label: "In Progress", className: "bg-blue-500/10 text-blue-600" };
  }
  switch (status) {
    case "pending":
      return { label: "Pending", className: "bg-amber-500/10 text-amber-600" };
    case "accepted":
      return { label: "Accepted", className: "bg-amber-500/10 text-amber-600" };
    case "confirmed":
      return { label: "Confirmed", className: "bg-primary/10 text-primary" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-500/10 text-emerald-600" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-destructive/10 text-destructive" };
    case "rejected":
      return { label: "Rejected", className: "bg-destructive/10 text-destructive" };
    case "expired":
      return { label: "Expired", className: "bg-muted text-muted-foreground" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
};

export default function MyBookings() {
  const { user } = useRole();
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email);
  const { data: allPhotographers = [] } = usePhotographers();
  const [activeTab, setActiveTab] = useState<SimpleTab>("current");

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [requestFormType, setRequestFormType] = useState<RequestType>(null);
  const [localRequests, setLocalRequests] = useState<Record<string, boolean>>({});

  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeBookings = bookings || [];

  // Current Booking: anything not in a terminal status (pending, accepted, confirmed, in-progress)
  const currentBookings = useMemo(
    () =>
      safeBookings
        .filter((b) => !TERMINAL_STATUSES.includes(b.status))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [safeBookings]
  );

  // Booking History: completed, cancelled, rejected, expired — most recent first
  const historyBookings = useMemo(
    () =>
      safeBookings
        .filter((b) => TERMINAL_STATUSES.includes(b.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [safeBookings]
  );

  const visibleBookings = activeTab === "current" ? currentBookings : historyBookings;

  const handleManageClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setRequestFormType(null);
    setIsConfirming(false);
    setReason("");
    setPreferredDate("");
    setRequestModalOpen(true);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!selectedBookingId || !requestFormType) return;
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLocalRequests((prev) => ({ ...prev, [selectedBookingId]: true }));
      toast.success(`Your ${requestFormType} request has been submitted successfully.`);
      setRequestModalOpen(false);
      setRequestFormType(null);
      setIsConfirming(false);
      setReason("");
      setPreferredDate("");
    } catch (error) {
      toast.error("Failed to submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBooking = useMemo(() => safeBookings.find((b) => b.id === selectedBookingId), [safeBookings, selectedBookingId]);

  // Modification Timing Rule: Up to 7 days before event date
  const canModifyOrReschedule = useMemo(() => {
    if (!selectedBooking?.date) return false;
    const eventDate = new Date(selectedBooking.date);
    const today = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [selectedBooking?.date]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up relative">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keep track of your current session and look back on past ones.
          </p>
        </div>

        {/* Simple two-way segmented control — replaces the old five-status tab row */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
          <button
            onClick={() => setActiveTab("current")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === "current" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            Current Booking
            {currentBookings.length > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                activeTab === "current" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {currentBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HistoryIcon className="w-4 h-4" />
            Booking History
            {historyBookings.length > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                activeTab === "history" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {historyBookings.length}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-4">
          {loadingBookings ? (
            <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Syncing your booking timeline...</div>
          ) : visibleBookings.length === 0 ? (
            activeTab === "current" ? (
              <div className="bg-card rounded-2xl border border-dashed border-border p-10 sm:p-14 text-center max-w-md mx-auto mt-6">
                <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg">No current booking</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                  You don't have an active photography session right now. Browse our photographers and book your next session.
                </p>
                <Link to="/explore"><Button size="sm">Find a Photographer</Button></Link>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border p-10 sm:p-14 text-center max-w-md mx-auto mt-6">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-heading font-bold text-lg">No booking history yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your completed and past bookings will show up here.
                </p>
              </div>
            )
          ) : (
            visibleBookings.map((b) => {
              const photog = (allPhotographers || []).find((p) => String(p.id) === String(b.photographerId));
              const remainingBalance = b.subtotal - b.dueNow;
              const hasActiveRequest = (b as any).hasActiveRequest || localRequests[b.id];
              const badge = getStatusBadge(b.status, b.date);
              const isCurrent = !TERMINAL_STATUSES.includes(b.status);

              return (
                <div key={b.id} className={cn(
                  "bg-card rounded-2xl border card-shadow p-5 sm:p-6 transition-all hover:border-border",
                  hasActiveRequest ? "border-amber-200/50" : "border-border/50"
                )}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold shrink-0">
                        {photog?.avatar ?? b.photographerAvatar}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
                          {b.eventType} &bull; {b.packageName}
                        </p>
                        <h3 className="font-heading font-bold text-base flex items-center gap-2 flex-wrap">
                          {b.photographerName}
                          {/* Status badge lives on the card itself, not as a nav tab */}
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", badge.className)}>
                            {badge.label}
                          </span>
                          {hasActiveRequest && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Request Pending
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Booking ID</span>
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{b.id}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-y border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary shrink-0" /> <span>{b.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" /> <span>{b.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 truncate" /> <span className="truncate">{b.eventLocation}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Payment Status</span>
                      <span className={cn(
                        "font-medium",
                        remainingBalance <= 0 ? "text-emerald-500" : b.dueNow > 0 ? "text-primary" : "text-amber-500"
                      )}>
                        {remainingBalance <= 0 ? "Fully Paid" : b.dueNow > 0 ? "Partially Paid" : "Pending Payment"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Remaining Balance</span>
                      <span className="font-bold text-foreground text-sm">{formatPrice(remainingBalance)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end pt-4 border-t border-border/50">
                    {hasActiveRequest ? (
                      <Button disabled variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
                        <AlertCircle className="w-3.5 h-3.5" /> Request Sent
                      </Button>
                    ) : (
                      isCurrent && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleManageClick(b.id)}>
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </Button>
                      )
                    )}

                    {b.status === "accepted" && b.dueNow === 0 && !hasActiveRequest && (
                      <Link to={`/booking/${b.id}/pay`}>
                        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm">
                          Pay Deposit
                        </Button>
                      </Link>
                    )}

                    {b.status === "completed" && !(b as any).hasReviewed && (
                      <Link to={`/booking/${b.id}/review`}>
                        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-current" /> Leave a Review
                        </Button>
                      </Link>
                    )}

                    <Link to={`/booking/${b.id}/details`}>
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {requestModalOpen && selectedBookingId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setRequestModalOpen(false); setRequestFormType(null); setIsConfirming(false); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>

            {requestFormType === null ? (
              <div>
                <h2 className="text-xl font-heading font-bold mb-1">Manage Booking</h2>
                <p className="text-xs text-muted-foreground mb-4">Select the type of change you need for booking ID: {selectedBookingId}</p>

                {!canModifyOrReschedule && (
                  <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>Modifications and rescheduling must be requested at least 7 days before the scheduled event date.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => setRequestFormType("reschedule")}
                    disabled={!canModifyOrReschedule}
                    className="w-full justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 disabled:opacity-50"
                  >
                    <span className="font-semibold text-sm flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-primary" /> Request Reschedule</span>
                    <span className="text-xs text-muted-foreground font-normal pl-6">Propose a new date or time to the studio.</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setRequestFormType("modify")}
                    disabled={!canModifyOrReschedule}
                    className="w-full justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 disabled:opacity-50"
                  >
                    <span className="font-semibold text-sm flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary" /> Request Modification</span>
                    <span className="text-xs text-muted-foreground font-normal pl-6">Modify venue, add-ons, or guest count.</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setRequestFormType("cancel")}
                    className="w-full justify-start h-auto py-3 px-4 flex flex-col items-start gap-1 hover:border-destructive/30 hover:bg-destructive/5"
                  >
                    <span className="font-semibold text-sm flex items-center gap-2"><FileX className="w-4 h-4 text-destructive" /> Request Cancellation</span>
                    <span className="text-xs text-muted-foreground font-normal pl-6">Review policies and submit a cancellation reason.</span>
                  </Button>
                </div>
              </div>
            ) : isConfirming ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-heading font-bold mb-2">Confirm Request</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Are you sure you want to submit this {requestFormType} request?
                  The studio will be notified and this booking will be placed in a pending state until they review it.
                </p>
                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>
                    Back to Edit
                  </Button>
                  <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : "Confirm Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInitialSubmit} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-6">
                  <button type="button" onClick={() => setRequestFormType(null)} className="text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-xl font-heading font-bold capitalize">Request {requestFormType}</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {requestFormType === "reschedule" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Preferred New Date & Time</label>
                      <input
                        required
                        type="datetime-local"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {requestFormType === "modify" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">What would you like to modify?</label>
                      <select required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Select an option</option>
                        <option value="venue">Change Venue</option>
                        <option value="addons">Add Package Add-ons</option>
                        <option value="guests">Guest Count</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Reason / Notes</label>
                    <textarea
                      required
                      placeholder="Please explain your request in detail..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  {requestFormType === "cancel" && (
                    <p className="text-[10px] text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                      By submitting a cancellation request, you must provide a valid reason. You understand that your deposit may be non-refundable according to the studio's cancellation policy.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setRequestFormType(null)}>Cancel</Button>
                  <Button type="submit" variant={requestFormType === 'cancel' ? 'destructive' : 'default'}>Submit Request</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
