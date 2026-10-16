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
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
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


  const scheduleDates: string[] = Array.from(
    new Set(
      (((booking as any)?.schedules ?? []) as { eventDate: string }[])
        .map((s) => s.eventDate)
        .filter(Boolean)
    )
  ).sort();
  const dateList = scheduleDates.length > 0 ? scheduleDates : booking?.date ? [booking.date] : [];

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
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full space-y-6 animate-fade-up">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 text-center relative overflow-hidden">
          
          {/* Header Icon & Title based on Status */}
          {status === "pending" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Clock className="w-9 h-9 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Booking Request Sent!</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Your request has been submitted to <strong>{booking.photographerName}</strong>. 
              </p>
            </>
          )}

          {status === "accepted" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Request Accepted!</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                <strong>{booking.photographerName}</strong> accepted your request. Pay the photographer directly through GCash, then submit your reference number for verification.
              </p>
            </>
          )}

          {status === "cancelled" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="w-9 h-9 text-destructive" />
              </div>
              <h1 className="text-2xl font-heading font-bold">{(booking as any).isDeclined ? "Booking Request Declined" : "Booking Request Cancelled"}</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {(booking as any).isDeclined
                  ? `${booking.photographerName} declined this booking request.${(booking as any).rejectionReason ? ` Reason: “${(booking as any).rejectionReason}”` : ""}`
                  : "This booking request has been cancelled."}
              </p>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Hourglass className="w-9 h-9 text-destructive" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Payment Window Expired</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                <strong>{booking.photographerName}</strong> accepted your request, but payment wasn't completed in time. This request is now closed.
              </p>
            </>
          )}

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full bg-muted border border-border text-xs font-semibold uppercase tracking-wider">
            {status === "pending" && (
              <>
                <Hourglass className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Pending Photographer Review</span>
              </>
            )}
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

          {/* Temporary Hold Info Box */}
          {status === "pending" && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 max-w-md mx-auto">
              <Clock className="w-4 h-4 shrink-0" />
              <span>The photographer has up to 48 hours to respond. Your time is only reserved once your payment is verified.</span>
            </div>
          )}

          {/* Booking Info Grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left text-sm">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Booking ID</p>
              <p className="font-mono text-xs font-medium truncate">{booking.id}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Event</p>
              <p className="font-medium truncate">{booking.eventType}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                {dateList.length > 1 ? `Dates (${dateList.length} days)` : "Date"}
              </p>
              {dateList.map((d) => (
                <p key={d} className="font-medium text-sm">{formatScheduleDate(d)}</p>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Amount</p>
              <p className="font-semibold text-primary">{formatPrice((booking as any).totalPrice ?? booking.dueNow)}</p>
            </div>
          </div>

          {/* Payment Action Banner (When Accepted) */}
          {status === "accepted" && (
            <div className="mt-6 p-4 rounded-xl border border-primary/30 bg-primary/5 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3">
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

          {/* Navigation & Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(`/booking/${booking.id}/details`)} className="gap-1.5">
              <FileText className="w-4 h-4" /> View Request Details
            </Button>
            
            {status === "pending" && (
              <Button variant="destructive" onClick={() => setIsCancelModalOpen(true)} className="gap-1.5">
                <XCircle className="w-4 h-4" /> Cancel Request
              </Button>
            )}

            <Button
              onClick={() => {
                toast.success("Redirecting to your bookings...");
                navigate("/bookings");
              }}
              className="gap-1.5"
            >
              See My Bookings <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {status === "pending" 
            ? "Photographers have up to 48 hours to respond. You'll receive a notification when accepted." 
            : "You can monitor all status changes and payment updates from your Client Dashboard."}
        </p>
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
