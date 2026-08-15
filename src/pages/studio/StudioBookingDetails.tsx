import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import {
  ArrowLeft, Calendar, User, Package, Mail,
  FileText, AlertTriangle, Loader2, Phone,
  Wand2, Check, Camera, MapPin, Users,
  CreditCard, X, DollarSign, Clock, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/services/clientProfileService";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import {
  usePhotographerBooking,
  useAcceptBooking,
  useRejectBooking,
  useApproveCancellation,
  useRejectCancellation,
  useUpdateServiceTracker,
  useRecordOnsitePayment,
} from "@/hooks/usePhotographerBookings";
import type { StudioBookingRecord } from "@/services/photographerBookingService";
import { useState } from "react";

// A "pending" booking's 24h review window (set by CreateBookingAction) may
// have lapsed server-side before ExpireStaleBookingHoldsAction next runs and
// flips its status to "expired". AcceptBookingAction rejects these with a
// validation error, so we detect it client-side first and disable the
// Accept/Decline actions instead of letting the request fail confusingly.
function isPendingHoldExpired(b: StudioBookingRecord): boolean {
  return b.status === "pending" && !!b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now();
}

export default function StudioBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useRole();
  const { toast } = useToast();

  const { data: booking, isLoading, error, refetch } = usePhotographerBooking(id);
  const acceptMutation = useAcceptBooking();
  const rejectMutation = useRejectBooking();
  const approveCancelMutation = useApproveCancellation();
  const rejectCancelMutation = useRejectCancellation();
  const trackerMutation = useUpdateServiceTracker();
  const onsitePaymentMutation = useRecordOnsitePayment();

  const [activeModal, setActiveModal] = useState<"accept" | "reject" | "record_onsite" | "approve_cancel" | "reject_cancel" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [onsitePaymentInput, setOnsitePaymentInput] = useState<number>(0);
  const [pendingTrackerStage, setPendingTrackerStage] = useState<TrackingStage | null>(null);

  const isMutating = acceptMutation.isPending || rejectMutation.isPending || approveCancelMutation.isPending || rejectCancelMutation.isPending || onsitePaymentMutation.isPending || trackerMutation.isPending;

  if (roleLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "studio") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm">Only photography professionals can access studio booking details.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Return Home</Button>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Unable to load booking</h2>
        <p className="text-muted-foreground text-sm">{getApiErrorMessage(error, "This booking could not be found.")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const handleConfirmAccept = async () => {
    try {
      await acceptMutation.mutateAsync(booking.id);
      setActiveModal(null);
      toast({ title: "Booking accepted", description: "Client has been notified to proceed with payment." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for rejecting the booking request.", variant: "destructive" as never });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: booking.id, reason: rejectionReason });
      setActiveModal(null);
      toast({ title: "Booking rejected", description: "Reason logged and client notified." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmOnsitePayment = async () => {
    const amountToRecord = onsitePaymentInput > 0 ? onsitePaymentInput : booking.remainingBalance;
    try {
      await onsitePaymentMutation.mutateAsync({ id: booking.id, amount: amountToRecord });
      setActiveModal(null);
      toast({ title: "Payment recorded", description: `Recorded onsite payment of ₱${amountToRecord.toLocaleString()}.` });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleTrackerStageChange = async (newStage: TrackingStage) => {
    try {
      await trackerMutation.mutateAsync({ id: booking.id, status: newStage });
      toast({ title: "Service tracker updated", description: `Updated to: ${newStage.replace(/_/g, " ")}.` });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const confirmTrackerStageChange = async () => {
    if (!pendingTrackerStage) return;
    await handleTrackerStageChange(pendingTrackerStage);
    setPendingTrackerStage(null);
  };

  const handleCancellationDecision = async (approve: boolean) => {
    try {
      if (approve) {
        await approveCancelMutation.mutateAsync(booking.id);
        toast({ title: "Cancellation approved", description: "This booking has been cancelled." });
      } else {
        await rejectCancelMutation.mutateAsync(booking.id);
        toast({ title: "Cancellation request rejected", description: "The booking remains active." });
      }
      setActiveModal(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const displayStage = (booking.serviceStatus ?? trackingStages[0].id) as TrackingStage;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-12">

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded border border-border">
            Booking ID: {booking.id}
          </span>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-6 sm:p-8 card-shadow space-y-8">

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <h1 className="text-2xl font-heading font-bold">{booking.eventType}</h1>
              <p className="text-sm text-muted-foreground mt-1">Client: <strong>{booking.clientName}</strong></p>
              {booking.coverageAreaNotice && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                  <MapPin className="w-3 h-3" /> Outside primary coverage area
                </span>
              )}
            </div>

            <div className="text-right bg-muted/40 px-4 py-2.5 rounded-xl border border-border/50">
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">Total Contract Price</span>
              <span className="text-2xl font-heading font-bold text-primary">₱{booking.totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Booking Status</span>
              <span className={`font-bold capitalize inline-flex items-center gap-1 ${
                booking.status === 'confirmed' ? 'text-emerald-600 dark:text-emerald-400' :
                booking.status === 'pending' ? 'text-amber-600 dark:text-amber-400' :
                booking.status === 'rejected' ? 'text-destructive' : 'text-blue-600'
              }`}>
                ● {booking.status}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Payment Status</span>
              <span className={`font-bold capitalize inline-flex items-center gap-1 ${
                booking.paymentStatus === 'fully_paid' ? 'text-emerald-600 dark:text-emerald-400' :
                booking.paymentStatus === 'partially_paid' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                ● {(booking.paymentStatus ?? "pending").replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Payment Plan</span>
              <span className="font-bold text-foreground">{booking.paymentPlan === "full" ? "Full Payment" : "Half Payment"}</span>
            </div>
          </div>

          {booking.hasActiveCancellationRequest && (
            <div className="bg-destructive/10 p-5 rounded-xl border border-destructive/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Client Requested Cancellation</p>
                  {booking.cancellationReason && (
                    <p className="text-xs text-muted-foreground mt-0.5">"{booking.cancellationReason}"</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-end sm:self-center">
                <Button size="sm" variant="outline" onClick={() => setActiveModal("reject_cancel")}>Keep Booking</Button>
                <Button size="sm" variant="destructive" onClick={() => setActiveModal("approve_cancel")}>Approve Cancellation</Button>
              </div>
            </div>
          )}

          {booking.status === "pending" && !booking.hasActiveCancellationRequest && (
            isPendingHoldExpired(booking) ? (
              <div className="bg-muted/50 p-5 rounded-xl border border-border/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Request Expired</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This request's response window has passed and can no longer be accepted. It will be archived automatically.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Pending Booking Request</p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                      Review requested date, times, and specifications below before responding.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 self-end sm:self-center">
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setActiveModal("reject")}>
                    Decline Request
                  </Button>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setActiveModal("accept")}>
                    Accept Request
                  </Button>
                </div>
              </div>
            )
          )}

          {booking.status === "accepted" && !booking.hasActiveCancellationRequest && (
            booking.paymentStatus === "pending_verification" ? (
              <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3 justify-between text-amber-800 dark:text-amber-300 text-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Client submitted a GCash reference — needs your review before this booking can confirm.</span>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs bg-background shrink-0" onClick={() => navigate("/studio/earnings")}>
                  Review Payment
                </Button>
              </div>
            ) : booking.paymentStatus === "partially_paid" || booking.paymentStatus === "fully_paid" ? (
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Payment received — booking is finalizing confirmation.</span>
              </div>
            ) : (
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3 text-blue-800 dark:text-blue-300 text-sm">
                <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Request accepted. Awaiting client online deposit payment to confirm booking.</span>
              </div>
            )
          )}

          {(booking.status === "confirmed" || booking.status === "completed") && !booking.hasActiveCancellationRequest && (
            <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                  <Check className="w-5 h-5" /> Booking Confirmed & Active
                </div>
                {booking.remainingBalance > 0 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-background gap-1.5" onClick={() => {
                    setOnsitePaymentInput(booking.remainingBalance);
                    setActiveModal("record_onsite");
                  }}>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Record Onsite Payment
                  </Button>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800/80 dark:text-emerald-400/80 uppercase tracking-wider">Update Service Tracker Stage</span>
                  <select
                    value={displayStage}
                    onChange={(e) => setPendingTrackerStage(e.target.value as TrackingStage)}
                    className="h-8 rounded-md border border-emerald-500/30 bg-background px-3 text-xs font-medium focus:ring-1 ring-primary cursor-pointer shadow-sm"
                    disabled={trackerMutation.isPending}
                  >
                    {trackingStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <BookingTracker currentStage={displayStage} />
              </div>
            </div>
          )}

          {/* SECTION 1: Event & Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
              Event & Client Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3 p-4 bg-muted/20 border border-border/30 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-primary"/> Schedule & Venue
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Event Date:</span>
                  <span className="col-span-2 font-medium">{booking.date}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Time Slot:</span>
                  <span className="col-span-2 font-medium">{booking.startTime}{booking.endTime ? ` - ${booking.endTime}` : ""}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="col-span-2 font-medium capitalize">{booking.locationType.replace(/_/g, " ")}</span>
                </div>
                {booking.eventAddress && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="col-span-2 font-medium flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" /> {booking.eventAddress}
                    </span>
                  </div>
                )}
                {booking.guestCount != null && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Est. Guests:</span>
                    <span className="col-span-2 font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" /> {booking.guestCount} Guests
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 bg-muted/20 border border-border/30 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-primary"/> Client Contact
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="col-span-2 font-medium">{booking.clientName}</span>
                </div>
                {/* Phone/email aren't exposed by the booking API — BookingResource only
                    returns client { id, name }. Contact details would need to come from
                    a separate client-lookup endpoint (Photographer\ClientController). */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/60 p-2 rounded border border-border/30">
                  <Phone className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50" />
                  <span>Phone and email aren't available through the booking API yet.</span>
                </div>
                <div className="pt-2 border-t border-border/30 mt-2">
                  <span className="text-muted-foreground block text-xs mb-1">Special Instructions:</span>
                  <p className="font-medium text-xs text-foreground italic bg-background p-2 rounded border border-border/40">
                    "{booking.specialRequests || "No special requests provided."}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Package & Add-ons Snapshot */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" /> Package & Add-ons Breakdown
            </h3>

            <div className="bg-muted/10 border border-border/40 rounded-xl p-5 space-y-4">
              {booking.isCustomPackage && booking.customBuild ? (
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="flex items-center gap-2 text-primary">
                      <Wand2 className="w-4 h-4" /> Customized Package Breakdown
                    </span>
                  </div>
                  <div className="pl-6 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Base Service Fee</span>
                      <span className="font-medium">₱{booking.customBuild.baseFee.toLocaleString()}</span>
                    </div>
                    {booking.customBuild.components.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-muted-foreground" /> {c.label}
                        </span>
                        <span className="font-medium">+ ₱{c.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm pb-4 border-b border-border/50">
                  <span className="text-foreground font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> {booking.packageName} (Fixed Package)
                  </span>
                  <span className="font-bold">₱{booking.subtotal.toLocaleString()}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" /> Selected Add-ons
                </p>
                {booking.addOns.length > 0 ? (
                  booking.addOns.map((addon, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm pl-2">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border border-primary/50 rounded bg-primary/10 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary" />
                        </div>
                        {addon.name}
                      </span>
                      <span className="font-medium">+ ₱{addon.price.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground pl-2 italic">No additional add-ons selected for this booking.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Payment Summary */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" /> Payment Summary & Balance
            </h3>

            <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-sm font-semibold text-foreground">Selected Plan: {booking.paymentPlan === "full" ? "Full Payment" : "Half Payment"}</span>
                  <p className="text-xs text-muted-foreground">
                    {booking.paymentPlan === "half"
                      ? "50% paid online upfront, remaining balance to be settled on-site."
                      : "100% full payment collected online."}
                  </p>
                </div>
                <span className="px-3 py-1 bg-background border border-border rounded-full text-xs font-bold text-primary self-start sm:self-auto">
                  Total: ₱{booking.totalPrice.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-primary/10 pt-4">
                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Total Booking Amount</span>
                  <span className="font-bold text-sm text-foreground">₱{booking.totalPrice.toLocaleString()}</span>
                </div>

                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Total Paid To Date</span>
                  <span className="font-bold text-sm text-emerald-600">₱{booking.amountPaid.toLocaleString()}</span>
                </div>

                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Remaining Balance</span>
                  <span className={`font-bold text-sm ${booking.remainingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    ₱{booking.remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: Accept */}
      {activeModal === "accept" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Accept Booking Request?</h3>
                  <p className="text-xs text-muted-foreground">Confirm availability for this slot.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Accepting this request will notify <strong>{booking.clientName}</strong> to proceed with their deposit payment. The time slot will be reserved.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmAccept} disabled={isMutating}>
                {isMutating ? "Processing…" : "Yes, Accept Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject */}
      {activeModal === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Decline Booking Request</h3>
                  <p className="text-xs text-muted-foreground">Reason required by system rules.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Rejection Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Schedule fully booked, location outside service coverage..."
                className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmReject} disabled={isMutating}>
                {isMutating ? "Processing…" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancellation decision */}
      {(activeModal === "approve_cancel" || activeModal === "reject_cancel") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activeModal === "approve_cancel" ? "bg-destructive/10" : "bg-emerald-500/10")}>
                  <AlertCircle className={cn("w-5 h-5", activeModal === "approve_cancel" ? "text-destructive" : "text-emerald-600")} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{activeModal === "approve_cancel" ? "Approve Cancellation?" : "Keep This Booking?"}</h3>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeModal === "approve_cancel"
                ? "This will cancel the booking permanently. The client will be notified."
                : "This will reject the client's cancellation request and keep the booking active. The client will be notified."}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Back</Button>
              <Button variant={activeModal === "approve_cancel" ? "destructive" : "default"} onClick={() => handleCancellationDecision(activeModal === "approve_cancel")} disabled={isMutating}>
                {isMutating ? "Processing…" : activeModal === "approve_cancel" ? "Approve Cancellation" : "Keep Booking"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Onsite Payment */}
      {activeModal === "record_onsite" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Record Onsite Payment</h3>
                  <p className="text-xs text-muted-foreground">Record manual cash/onsite transaction.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1 border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Balance Due:</span>
                  <span className="font-bold text-amber-600">₱{booking.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Amount Received (₱)</label>
                <input
                  type="number"
                  value={onsitePaymentInput}
                  onChange={(e) => setOnsitePaymentInput(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleConfirmOnsitePayment} disabled={isMutating}>
                {isMutating ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Service Tracker Update Confirmation */}
      {pendingTrackerStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Update Service Stage?</h3>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPendingTrackerStage(null)} disabled={trackerMutation.isPending}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Move this booking to{" "}
              <strong>{trackingStages.find((s) => s.id === pendingTrackerStage)?.label ?? pendingTrackerStage}</strong>?
              The client will see this update immediately.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPendingTrackerStage(null)} disabled={trackerMutation.isPending}>Cancel</Button>
              <Button onClick={confirmTrackerStageChange} disabled={trackerMutation.isPending}>
                {trackerMutation.isPending ? "Updating…" : "Confirm Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
