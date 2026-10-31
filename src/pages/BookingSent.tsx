import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight, 
  Bell, 
  Wallet, 
  Hourglass, 
  XCircle, 
  AlertTriangle,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/data/photographers";
import { useBooking, useRequestBookingCancellation } from "@/hooks/useBookings";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";

const formatScheduleDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const formatCardDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function BookingSent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  // Renamed from `toast` — the shadcn/ui hook's toast() takes an object
  // ({ title, description, variant }) and is a completely different API
  // from react-hot-toast's toast.success()/toast.error() imported above.
  // Destructuring this as `toast` shadowed the react-hot-toast import for
  // the rest of the component, so `toast.success(...)` in the "See My
  // Bookings" button below was silently throwing ("toast.success is not
  // a function") and aborting before navigate("/bookings") ever ran —
  // that's why the button appeared to do nothing.
  const { toast: showToast } = useToast();
  const cancelMutation = useRequestBookingCancellation();

  const [status, setStatus] = useState<"pending" | "accepted" | "cancelled" | "rejected" | "expired">("pending");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (booking?.status) {
      // Widened to string: the booking status type doesn't include every label compared below.
      const s: string = booking.status;
      if (s === "accepted" || s === "confirmed" || s === "completed") {
        setStatus("accepted");
      } else if (s === "cancelled") {
        setStatus("cancelled");
      } else if (s === "rejected") {
        setStatus("rejected");
      } else if (s === "expired") {
        setStatus("expired");
      } else {
        setStatus("pending");
      }
    }
  }, [booking?.status]);

  const handleCancelRequest = async () => {
    if (!cancellationReason.trim()) {
      showToast({ title: "Reason required", description: "Please provide a reason for cancelling your booking request.", variant: "destructive" as never });
      return;
    }

    setIsSubmittingCancel(true);
    try {
      // Real call (it used to be a fake setTimeout that never touched the server).
      await cancelMutation.mutateAsync({ id: String(booking!.id), reason: cancellationReason });
      setIsCancelModalOpen(false);
      setStatus("cancelled");
      showToast({ title: "Booking cancelled", description: "Your booking request was cancelled and the photographer was notified." });
    } catch (error) {
      showToast({ title: "Couldn't cancel the booking", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" as never });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleCopyId = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(String(booking.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast({ title: "Couldn't copy", description: "Please copy the booking ID manually.", variant: "destructive" as never });
    }
  };

  const scheduleDates: string[] = Array.from(
    new Set(
      (((booking as any)?.schedules ?? []) as { eventDate: string }[])
        .map((s) => s.eventDate)
        .filter(Boolean)
    )
  ).sort();
  const dateList = scheduleDates.length > 0 ? scheduleDates : booking?.date ? [booking.date] : [];
    // Journey tracker: derived only from the real booking status (nothing invented).
  const rawStatus: string = String((booking as any)?.status ?? "");
  const journeySteps = ["Request Submitted", "Photographer Review", "Payment", "Booking Confirmed"];
  const journeyCurrent =
    status === "pending" ? 1
    : status === "accepted" ? (rawStatus === "confirmed" || rawStatus === "completed" ? journeySteps.length : 2)
    : -1; // cancelled / declined / expired: tracker is hidden
    
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading booking details…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Booking request not found.</p>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden min-h-screen bg-background bg-[linear-gradient(180deg,#FBF8F3_0%,#F6F0E7_100%)] dark:bg-none flex items-center justify-center px-4 sm:px-6 py-3">
      {/* Decorative studio background (purely visual, sits behind the card) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 dark:opacity-20">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(214,190,160,0.35),transparent_70%)]" />
        <div className="absolute -bottom-48 -right-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(160,120,90,0.18),transparent_70%)]" />
        <div className="absolute top-1/3 -right-56 h-[420px] w-[420px] rounded-full border border-[#C9AE8C]/20" />
        <div className="absolute -bottom-32 -left-32 h-[380px] w-[380px] rounded-full border border-[#C9AE8C]/15" />
      </div>
      <div className="w-full max-w-5xl space-y-3 animate-fade-up">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* LEFT: status + actions */}
          <div className="lg:col-span-3 bg-card rounded-2xl shadow-sm border border-border p-5 sm:p-6 text-center flex flex-col justify-center">
            {/* Header Icon & Title based on Status */}
            {status === "pending" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Booking Request Sent</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <Hourglass className="w-3 h-3 text-amber-500" /> Pending
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold mt-2 leading-tight tracking-tight">Awaiting Photographer's Response</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted to <strong>{booking.photographerName}</strong>. You'll be notified as soon as they respond.
                </p>
              </>
            )}

            {status === "accepted" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Request Accepted!</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  <strong>{booking.photographerName}</strong> accepted your request. Pay the photographer directly through GCash, then submit your reference number for verification.
                </p>
              </>
            )}

            {status === "cancelled" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <XCircle className="w-7 h-7 text-destructive" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">{(booking as any).isDeclined ? "Booking Request Declined" : "Booking Request Cancelled"}</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {(booking as any).isDeclined
                    ? `${booking.photographerName} declined this booking request.${(booking as any).rejectionReason ? ` Reason: “${(booking as any).rejectionReason}”` : ""}`
                    : "This booking request has been cancelled."}
                </p>
              </>
            )}

            {status === "expired" && (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <Hourglass className="w-7 h-7 text-destructive" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Payment Window Expired</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  <strong>{booking.photographerName}</strong> accepted your request, but payment wasn't completed in time. This request is now closed.
                </p>
              </>
            )}

            {/* Status Badge (pending uses the inline badge in the header) */}
            {status !== "pending" && (
              <div className="inline-flex items-center gap-1.5 mt-4 mx-auto px-4 py-1.5 rounded-full border bg-muted border-border text-xs font-semibold uppercase tracking-wider">
                {status === "accepted" && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Accepted — Payment Required</span>
                  </>
                )}
                {status === "cancelled" && (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{(booking as any).isDeclined ? "Declined" : "Cancelled"}</span>
                  </>
                )}
                {status === "expired" && (
                  <>
                    <Hourglass className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-destructive">Payment Window Expired</span>
                  </>
                )}
              </div>
            )}

            {/* Temporary Hold Info Box */}
            {status === "pending" && (
              <div className="mt-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[13px] leading-relaxed text-left text-amber-800 dark:text-amber-300 flex items-start gap-2.5 max-w-lg mx-auto">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The photographer has up to 48 hours to respond. Your time is only reserved once your payment is verified.
                  {(booking as any).budgetRequest?.status === "requested" &&
                    ` Your budget of ${formatPrice((booking as any).budgetRequest.budget_amount)} was sent with this request. The photographer can accept it, counter, or decline.`}
                </span>
              </div>
            )}

            {(booking as any).budgetRequest && ["requested", "proposed"].includes((booking as any).budgetRequest.status) && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-muted/40 text-left text-xs space-y-1.5 max-w-lg mx-auto w-full">
                <p className="font-semibold text-foreground">Your budget offer</p>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Listed price (package + add-ons)</span>
                  <span>{formatPrice((booking as any).subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Your offer (before platform fee)</span>
                  <span className="font-medium">{formatPrice((booking as any).budgetRequest.budget_amount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {(booking as any).budgetRequest.status === "proposed"
                      ? "The photographer replied — review the terms"
                      : "Waiting for the photographer"}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Action Banner (When Accepted) */}
            {status === "accepted" && (
              <div className="mt-5 p-4 rounded-xl border border-primary/30 bg-primary/5 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{(booking as any).awaitingOfferAcceptance ? "Action Required: Accept the Offered Schedule" : "Action Required: Submit Your GCash Payment"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pay {formatPrice(booking.dueNow)} directly to the photographer via GCash, then submit your reference number for the photographer to verify.
                  </p>
                </div>
                <Button size="sm" className="gap-1.5 shrink-0 w-full sm:w-auto" onClick={() => navigate(`/booking/${booking.id}/${(booking as any).awaitingOfferAcceptance ? "details" : "pay"}`)}>
                  <Wallet className="w-3.5 h-3.5" /> {(booking as any).awaitingOfferAcceptance ? "Review Offer" : "Pay Now"}
                </Button>
              </div>
            )}


          </div>

          {/* RIGHT: booking details */}
          <aside className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-border p-5 sm:p-6 text-left flex flex-col">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Booking Details</h2>

            <div className="mt-3 divide-y divide-border/60">
              <div className="flex items-center justify-between gap-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Booking ID</p>
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{booking.id}</p>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    aria-label="Copy booking ID"
                    title={copied ? "Copied" : "Copy booking ID"}
                    className="shrink-0 p-1 -m-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Event</p>
                <p className="text-sm font-medium capitalize truncate">{booking.eventType}</p>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold pt-0.5">
                  {dateList.length > 1 ? `Dates (${dateList.length})` : "Date"}
                </p>
                <div className="space-y-1 text-right">
                  {dateList.map((d) => (
                    <p key={d} className="text-sm font-medium">{formatCardDate(d)}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/30 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Total Amount</p>
                <p className="text-2xl font-heading font-bold text-primary truncate">{formatPrice((booking as any).totalPrice ?? booking.dueNow)}</p>
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM: journey tracker */}
        <div className="bg-card rounded-2xl shadow-sm border border-border px-6 sm:px-8 py-4">
          {journeyCurrent >= 0 && (
            <>
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">What Happens Next</h2>
            <ol className="grid grid-cols-4">
              {journeySteps.map((label, i) => {
                const state = i < journeyCurrent ? "done" : i === journeyCurrent ? "current" : "upcoming";
                return (
                  <li key={label} className="relative flex flex-col items-center text-center px-1">
                    {i < journeySteps.length - 1 && (
                      <span
                        aria-hidden
                        className={cn("absolute top-3.5 left-1/2 w-full h-0.5", i < journeyCurrent ? "bg-primary" : "bg-border")}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-card",
                        state === "done" && "bg-primary border-primary text-primary-foreground",
                        state === "current" && "border-primary ring-4 ring-primary/15",
                        state === "upcoming" && "border-dashed border-border text-muted-foreground"
                      )}
                    >
                      {state === "done" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : state === "current" ? (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="text-[10px] font-semibold">{i + 1}</span>
                      )}
                    </span>
                    <span className={cn("mt-2 text-xs sm:text-sm leading-tight", state === "upcoming" ? "text-muted-foreground" : "font-semibold text-foreground")}>
                      {label}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {state === "done" ? "Done" : state === "current" ? "In progress" : "Upcoming"}
                    </span>
                  </li>
                );
              })}
            </ol>
            </>
          )}

          {/* Navigation & Action Buttons */}
          <div
            className={cn(
              "flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3",
              journeyCurrent >= 0 && "mt-3 pt-3 border-t border-border/60"
            )}
          >
            <div className="flex sm:justify-start">
              {status === "pending" && (
                <Button
                  variant="ghost"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="gap-1.5 w-full sm:w-auto h-10 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 sm:-ml-3"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Request
                </Button>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/booking/${booking.id}/details`)}
                className="gap-1.5 w-full sm:w-auto h-10"
              >
                <FileText className="w-4 h-4" /> View Request Details
              </Button>
              <Button
                onClick={() => {
                  toast.success("Redirecting to your bookings...");
                  navigate("/bookings");
                }}
                className="gap-1.5 w-full sm:w-auto sm:min-w-[170px] h-10"
              >
                See My Bookings <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {status !== "pending" && (
          <p className="text-xs text-muted-foreground text-center">
            You can monitor all status changes and payment updates from your Client Dashboard.
          </p>
        )}
      </div>

      {/* Confirmation Modal for Booking Cancellation */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-heading font-bold text-foreground">Cancel Booking Request?</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this booking request? This will withdraw your request for {dateList.map(formatScheduleDate).join(", ")}.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Cancellation Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please state why you are cancelling this request..."
                className="w-full text-sm p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isSubmittingCancel}
              >
                Keep Request
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelRequest}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
