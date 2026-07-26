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
import { useBooking, useApproveBooking } from "@/hooks/useBookings";
import toast from "react-hot-toast";

export default function BookingSent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const approveBooking = useApproveBooking();

  const [status, setStatus] = useState<"pending" | "accepted" | "cancelled" | "rejected">("pending");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  useEffect(() => {
    if (booking?.status) {
      if (booking.status === "approved" || booking.status === "accepted") {
        setStatus("accepted");
      } else if (booking.status === "cancelled") {
        setStatus("cancelled");
      } else if (booking.status === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending");
      }
    }
  }, [booking?.status]);

  // Demo simulation for acceptance workflow (Pending -> Accepted)
  useEffect(() => {
    if (!id || !booking || booking.status !== "pending" || status !== "pending") return;
    const timer = setTimeout(async () => {
      const updated = await approveBooking.mutateAsync(id);
      if (updated) {
        setStatus("accepted");
        toast.success(`Booking request accepted by ${updated.photographerName}! Payment is now required.`, {
          id: "booking-accepted-toast"
        });
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [id, booking, status, approveBooking]);

  const handleCancelRequest = () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancelling your booking request.");
      return;
    }

    setIsSubmittingCancel(true);
    // Simulate API cancellation request
    setTimeout(() => {
      setIsSubmittingCancel(false);
      setIsCancelModalOpen(false);
      setStatus("cancelled");
      toast.success("Booking cancellation request submitted successfully.");
    }, 800);
  };

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
                <strong>{booking.photographerName}</strong> accepted your request. Complete online payment via Xendit to confirm your booking.
              </p>
            </>
          )}

          {status === "cancelled" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="w-9 h-9 text-destructive" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Booking Request Cancelled</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                This booking request has been cancelled and the temporary schedule hold has been released.
              </p>
            </>
          )}

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 mt-5 px-4 py-1.5 rounded-full bg-muted border border-border text-xs font-semibold uppercase tracking-wider">
            {status === "pending" && (
              <>
                <Hourglass className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Pending Professional Review</span>
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
                <span className="text-muted-foreground">Cancelled</span>
              </>
            )}
          </div>

          {/* Temporary Hold Info Box */}
          {status === "pending" && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 max-w-md mx-auto">
              <Clock className="w-4 h-4 shrink-0" />
              <span>A temporary time hold (max 24 hours) has been placed on your requested date & time.</span>
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
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Date</p>
              <p className="font-medium truncate">{booking.date}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Initial Payment</p>
              <p className="font-semibold text-primary">{formatPrice(booking.dueNow)}</p>
            </div>
          </div>

          {/* Payment Action Banner (When Accepted) */}
          {status === "accepted" && (
            <div className="mt-6 p-4 rounded-xl border border-primary/30 bg-primary/5 text-left flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Action Required: Complete Online Payment</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pay {formatPrice(booking.dueNow)} online via Xendit to transition your booking from Accepted to Confirmed.
                </p>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0 w-full sm:w-auto" onClick={() => navigate(`/booking/${booking.id}/pay`)}>
                <Wallet className="w-3.5 h-3.5" /> Pay Now
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

            <Button onClick={() => navigate("/dashboard")} className="gap-1.5">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {status === "pending" 
            ? "Professionals review requests within 24 hours. You'll receive a notification when accepted." 
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
              Are you sure you want to cancel this booking request? This will release your temporary hold on {booking.date}.
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