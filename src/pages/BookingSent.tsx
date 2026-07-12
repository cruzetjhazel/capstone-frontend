import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Clock, FileText, ArrowRight, Bell, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { useToast } from "@/hooks/use-toast";
import { useBooking, useApproveBooking } from "@/hooks/useBookings";

export default function BookingSent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: booking, isLoading } = useBooking(id);
  const approveBooking = useApproveBooking();
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (booking?.status === "approved") setApproved(true);
  }, [booking?.status]);

  // Simulate studio approval after 6s (demo flow until Laravel webhooks exist)
  useEffect(() => {
    if (!id || !booking || booking.status !== "pending" || approved) return;
    const t = setTimeout(async () => {
      const updated = await approveBooking.mutateAsync(id);
      if (updated) {
        setApproved(true);
        toast({
          title: "🎉 Booking Approved by Studio",
          description: `${updated.photographerName} approved ${updated.id}. Check notifications to pay your balance.`,
        });
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [id, booking, approved, approveBooking, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading booking…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Booking not found.</p>
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full space-y-6 animate-fade-up">
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Booking Request Sent!</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            We've sent your request to <strong>{booking.photographerName}</strong>. You'll receive a notification once they review it.
          </p>

          <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-warning/10 text-warning border border-warning/20">
            {approved ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4 animate-pulse" />}
            <span className="text-sm font-medium">
              {approved ? "Approved by studio" : "Pending studio approval"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left text-sm">
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-[11px] uppercase text-muted-foreground font-semibold">Booking ID</p>
              <p className="font-mono">{booking.id}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-[11px] uppercase text-muted-foreground font-semibold">Event</p>
              <p>{booking.eventType}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-[11px] uppercase text-muted-foreground font-semibold">Date</p>
              <p>{booking.date}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-[11px] uppercase text-muted-foreground font-semibold">Due Now</p>
              <p className="font-semibold text-primary">{formatPrice(booking.dueNow)}</p>
            </div>
          </div>

          {approved && (
            <div className="mt-6 p-4 rounded-xl border border-primary/30 bg-primary/5 text-left flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Booking confirmed — settle your balance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.photographerName} accepted your request. Pay {formatPrice(booking.dueNow)} to lock the date.
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => navigate(`/booking/${booking.id}/pay`)}>
                <Wallet className="w-3.5 h-3.5" /> Pay Now
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(`/booking/${booking.id}/details`)} className="gap-1.5">
              <FileText className="w-4 h-4" /> View Request Details
            </Button>
            <Button onClick={() => navigate("/notifications")} className="gap-1.5">
              View Notifications <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Most studios respond within 24 hours. You'll be notified when it's time to pay your balance.
        </p>
      </div>
    </div>
  );
}
