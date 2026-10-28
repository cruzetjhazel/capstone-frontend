import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { trackingStages, type TrackingStage } from "@/data/photographers";

// Mirrors backend UpdateServiceTrackerStatusAction::ALLOWED_TRANSITIONS.
// The manual tracker can only move one step forward, and only from these
// two stages — Upcoming, Event Day, and Completed are all system/action
// driven (BookingObserver, RunServiceProgressTransitionsAction,
// MarkServiceCompletedAction respectively) and are never manually settable.
const MANUAL_TRACKER_TRANSITIONS: Partial<Record<TrackingStage, TrackingStage>> = {
  upcoming: "event_day",
  // event_day -> editing is NOT here on purpose: it only happens through "Confirm Shoot Completed".
  editing: "delivered",
};
import {
  ArrowLeft, Calendar, User, Package, Mail,
  FileText, AlertTriangle, Loader2, Phone,
  Wand2, Check, Camera, MapPin, Users,
  CreditCard, X, DollarSign, AlertCircle, PackageCheck, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
    import { getApiErrorMessage } from "@/services/clientProfileService";
       import { BudgetResponsePanel } from "@/components/booking/BudgetResponsePanel";
   import { usePhotographerBudgetView } from "@/hooks/useBookingNegotiation";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import {
  usePhotographerBooking,
  useAcceptBooking,
  useRejectBooking,
  useApproveCancellation,
  useRejectCancellation,
  useApproveReschedule,
  useRejectReschedule,
  useApproveModification,
  useRejectModification,
  useCancelBookingAsPhotographer,
  useUpdateServiceTracker,
  useConfirmShoot,
  useMarkServiceCompleted,
  useRecordOnsitePayment,
  useAccommodationCandidates,
  useAccommodateBooking,
  usePhotographerBookings,
  useReportClientNoShow,
  useDisputeStudioNonCompletion,
} from "@/hooks/usePhotographerBookings";
import { usePayments, useVerifyPayment, useRejectPayment } from "@/hooks/usePayments";
import type { StudioBookingRecord } from "@/services/photographerBookingService";
import { useEffect, useState } from "react";

// A "pending" booking's 48h review window (set by CreateBookingAction) may
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
  const { user, role, isLoading: roleLoading } = useRole();
  const { toast } = useToast();

     const { data: booking, isLoading, error, refetch } = usePhotographerBooking(id);
   const budgetView = usePhotographerBudgetView(booking?.status === "pending" ? booking.id : undefined);
   // Terms were sent to the client: a plain "Accept request" would be refused, so don't offer it.
   const termsAwaitingClient = budgetView.data?.budget_request?.status === "proposed";

  // Early-warning hint only (primary date/time, no buffer). The backend is the real guard.
  const { data: allBookings = [] } = usePhotographerBookings();
  const toMin = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const isPaidBooking = (o: StudioBookingRecord) => o.paymentStatus === "partially_paid" || o.paymentStatus === "fully_paid";
  const overlapsThis = (o: StudioBookingRecord) => {
    if (!booking || o.date !== booking.date) return false;
    const aS = toMin(booking.startTime);
    const bS = toMin(o.startTime);
    if (aS === null || bS === null) return false;
    const aE = toMin(booking.endTime) ?? aS + 60;
    const bE = toMin(o.endTime) ?? bS + 60;
    return aS < bE && bS < aE;
  };
  const rivals = booking ? allBookings.filter((o) => String(o.id) !== String(booking.id) && overlapsThis(o)) : [];
  const paidHolder = rivals.some((o) => o.status === "confirmed" && isPaidBooking(o));
  const rivalsAccepted = rivals.filter((o) => o.status === "confirmed" && !isPaidBooking(o));
  const rivalsPaymentSubmitted = rivals.filter(
    (o) => (o.status === "confirmed" || o.status === "waitlisted") && o.paymentStatus === "pending_verification"
  );

  // Reload until the backend flips an overdue request to "expired".
  useEffect(() => {
    if (!booking || !isPendingHoldExpired(booking)) return;
    const timer = setInterval(() => refetch(), 15000);
    return () => clearInterval(timer);
  }, [booking, refetch]);
  const acceptMutation = useAcceptBooking();
  const rejectMutation = useRejectBooking();
  const approveCancelMutation = useApproveCancellation();
  const rejectCancelMutation = useRejectCancellation();
  const approveRescheduleMutation = useApproveReschedule();
  const rejectRescheduleMutation = useRejectReschedule();

  const approveModificationMutation = useApproveModification();
  const rejectModificationMutation = useRejectModification();
  const cancelBookingMutation = useCancelBookingAsPhotographer();
  const trackerMutation = useUpdateServiceTracker();
  const confirmShootMutation = useConfirmShoot();
  const completeMutation = useMarkServiceCompleted();
  const reportNoShowMutation = useReportClientNoShow();
  const disputeMutation = useDisputeStudioNonCompletion();
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const onsitePaymentMutation = useRecordOnsitePayment();
  const accommodateMutation = useAccommodateBooking();

  const [activeModal, setActiveModal] = useState<"accept" | "reject" | "record_onsite" | "approve_cancel" | "reject_cancel" | "approve_reschedule" | "reject_reschedule" | "approve_modification" | "reject_modification" | "cancel_booking" | "review_payment" | "accommodate" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [onsitePaymentInput, setOnsitePaymentInput] = useState<number>(0);
  const [pendingTrackerStage, setPendingTrackerStage] = useState<TrackingStage | null>(null);
  const [paymentActionNotes, setPaymentActionNotes] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Only meaningful for a cancelled booking — lists the other clients who
  // requested this same date/time and were auto-declined when this
  // booking's payment was confirmed first (see backend
  // SlotConflictService). Empty for any booking that was never paid, or
  // that had no rival requests.
  const candidatesQuery = useAccommodationCandidates(booking?.id, booking?.status === "cancelled");
  const candidates = candidatesQuery.data ?? [];

  const paymentsQuery = usePayments();
  const verifyPaymentMutation = useVerifyPayment();
  const rejectPaymentMutation = useRejectPayment();

  const isMutating = acceptMutation.isPending || rejectMutation.isPending || approveCancelMutation.isPending || rejectCancelMutation.isPending || approveRescheduleMutation.isPending || rejectRescheduleMutation.isPending || onsitePaymentMutation.isPending || trackerMutation.isPending || completeMutation.isPending || confirmShootMutation.isPending;
  const isPaymentActionMutating = verifyPaymentMutation.isPending || rejectPaymentMutation.isPending;
  const isRequestMutating = approveModificationMutation.isPending || rejectModificationMutation.isPending || cancelBookingMutation.isPending;

  const paymentToReview = booking
    ? (paymentsQuery.data ?? []).find(
        (p) =>
          p.bookingId === booking.id &&
          p.matchingStatus !== "matched" &&
          p.matchingStatus !== "manually_verified" &&
          p.matchingStatus !== "rejected"
      )
    : undefined;

  const handleConfirmVerifyPayment = async () => {
    if (!paymentToReview) return;
    try {
      await verifyPaymentMutation.mutateAsync({ paymentId: paymentToReview.id, notes: paymentActionNotes || undefined });
      toast({ title: "Payment verified", description: "The booking is now marked as paid." });
      setActiveModal(null);
      setPaymentActionNotes("");
    } catch (error) {
      toast({ title: "Something went wrong", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" as never });
    }
  };

  const handleConfirmRejectPayment = async () => {
    if (!paymentToReview || !paymentActionNotes.trim()) {
      toast({ title: "Notes required", description: "Please explain why this payment is being rejected.", variant: "destructive" as never });
      return;
    }
    try {
      await rejectPaymentMutation.mutateAsync({ paymentId: paymentToReview.id, notes: paymentActionNotes });
      toast({ title: "Payment rejected", description: "The client has been asked to resubmit." });
      setActiveModal(null);
      setPaymentActionNotes("");
    } catch (error) {
      toast({ title: "Something went wrong", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" as never });
    }
  };
  
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
      const accepted = await acceptMutation.mutateAsync(booking.id);
      setActiveModal(null);
      toast(
        accepted?.status === "waitlisted"
          ? { title: "Added to waitlist", description: "Another paid booking already holds this schedule, so this request was waitlisted instead of sent to payment." }
          : { title: "Booking accepted", description: "Client has been notified to proceed with payment." }
      );
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Reason required", description: "Please give a reason for declining this booking request.", variant: "destructive" as never });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: booking.id, reason: rejectionReason });
      setActiveModal(null);
      toast({ title: "Booking request declined", description: "Your reason was saved and the client was notified." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmOnsitePayment = async () => {
    const amountToRecord = onsitePaymentInput > 0 ? onsitePaymentInput : booking.remainingBalance;
    try {
      await onsitePaymentMutation.mutateAsync({ id: booking.id, amount: amountToRecord, paymentDate: new Date().toLocaleDateString("en-CA") });
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

  const handleConfirmShoot = async () => {
    try {
      await confirmShootMutation.mutateAsync(booking.id);
      toast({ title: "Shoot confirmed", description: "The booking is now in Editing." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const confirmTrackerStageChange = async () => {
    if (!pendingTrackerStage) return;
    await handleTrackerStageChange(pendingTrackerStage);
    setPendingTrackerStage(null);
  };

  const handleMarkCompleted = async () => {
    try {
      await completeMutation.mutateAsync(booking.id);
      toast({ title: "Booking completed", description: "The client can now leave a review." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleCancellationDecision = async (approve: boolean) => {
    try {
      if (approve) {
        await approveCancelMutation.mutateAsync(booking.id);
        toast({ title: "Cancellation approved", description: "This booking has been cancelled." });
      } else {
        await rejectCancelMutation.mutateAsync(booking.id);
        toast({ title: "Cancellation request declined", description: "The booking stays active." });
      }
      setActiveModal(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmAccommodate = async () => {
    if (!selectedCandidateId) {
      toast({ title: "Select a client", description: "Choose which client to offer this slot to.", variant: "destructive" as never });
      return;
    }
    try {
      await accommodateMutation.mutateAsync({ id: booking.id, candidateBookingId: selectedCandidateId });
      setActiveModal(null);
      setSelectedCandidateId(null);
      toast({ title: "Reservation accommodated", description: "The client has been notified and must accept the offer before they can pay." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleRescheduleDecision = async (approve: boolean) => {
    try {
      if (approve) {
        await approveRescheduleMutation.mutateAsync(booking.id);
        toast({ title: "Reschedule approved", description: "The booking has been updated to the new date and time." });
      } else {
        await rejectRescheduleMutation.mutateAsync(booking.id);
        toast({ title: "Reschedule request declined", description: "The booking keeps its original date and time." });
      }
      setActiveModal(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleModificationDecision = async (approve: boolean) => {
    try {
      if (approve) {
        await approveModificationMutation.mutateAsync(booking.id);
        toast({ title: "Changes approved", description: "The booking details were updated." });
      } else {
        await rejectModificationMutation.mutateAsync(booking.id);
        toast({ title: "Modification request declined", description: "The booking stays as it was." });
      }
      setActiveModal(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "Reason required", description: "Please tell the client why this booking is being cancelled.", variant: "destructive" as never });
      return;
    }
    try {
      await cancelBookingMutation.mutateAsync({ id: booking.id, reason: cancelReason });
      setActiveModal(null);
      setCancelReason("");
      toast({ title: "Booking cancelled", description: "The client was notified." });
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  // "Confirmed & Paid" (trackingStages[0]) should only show as active once
  // // payment is actually settled — the payment banners above already cover
  // the unpaid case; the tracker stays untouched (nothing active) until then.
  const isPaymentSatisfied = booking.paymentStatus === "partially_paid" || booking.paymentStatus === "fully_paid";
  const displayStage = (booking.serviceStatus ?? trackingStages[0].id) as TrackingStage;
  const trackerStage = (booking.serviceStatus ?? (isPaymentSatisfied ? trackingStages[0].id : undefined)) as TrackingStage | undefined;
  // The only stage a studio user can manually advance to from here, if any —
  // keeps the dropdown from offering transitions the backend will reject.
  const nextManualStage = booking.serviceStatus
    ? MANUAL_TRACKER_TRANSITIONS[booking.serviceStatus as TrackingStage]
    : undefined;
  // Same rules the backend enforces: nothing moves before the scheduled start,
  // and nothing moves forward while a no-show report awaits the admin.
  const serviceHasStarted = new Date(`${booking.date}T${booking.startTime}`) <= new Date();
  // Confirm Shoot Completed needs EVERY session finished (all days). Unconfirmed end = end of that day.
  const serviceHasEnded = (booking.schedules?.length ? booking.schedules : [{ eventDate: booking.date, endTime: booking.endTime }]).every((s) => {
    const day = String(s.eventDate).slice(0, 10);
    const end = s.endTime ? new Date(`${day}T${s.endTime}`) : new Date(`${day}T23:59:59`);
    return end <= new Date();
  });
  const hasPendingNoShowReport = ["open", "awaiting_admin", "disputed"].includes(booking.nonCompletionState ?? "");
  // The client may still report a photographer no-show until end time + 48h; the backend refuses Completed until then.
  const completionBlocked = !!booking.completionBlockedUntil && new Date(booking.completionBlockedUntil) > new Date();

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
                booking.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                (booking.status === 'pending' || booking.status === 'waitlisted') ? 'text-amber-600 dark:text-amber-400' :
                (booking.status === 'cancelled' || booking.status === 'no_show') ? 'text-destructive' :
                booking.status === 'expired' ? 'text-muted-foreground' : 'text-blue-600'
              }`}>
                ● {booking.status === "no_show" ? "not completed" : booking.status === "cancelled" && booking.nonCompletionReason ? "not completed" : booking.status === "cancelled" && booking.isDeclined ? "declined" : booking.status}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Payment Status</span>
              <span className={`font-bold capitalize inline-flex items-center gap-1 ${
                booking.paymentStatus === 'fully_paid' ? 'text-emerald-600 dark:text-emerald-400' :
                booking.paymentStatus === 'partially_paid' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                ● {booking.status === 'expired' && booking.amountPaid === 0 ? '—' : (booking.paymentStatus ?? "pending").replace('_', ' ')}
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
                <Button size="sm" variant="outline" onClick={() => setActiveModal("reject_cancel")}>Decline Cancellation</Button>
                <Button size="sm" variant="destructive" onClick={() => setActiveModal("approve_cancel")}>Approve Cancellation</Button>
              </div>
            </div>
          )}

          {booking.hasPendingRescheduleRequest && booking.pendingReschedule && (
            <div className="bg-blue-500/10 p-5 rounded-xl border border-blue-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Client Requested Reschedule</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New date/time requested: <strong>{booking.pendingReschedule.eventDate} at {booking.pendingReschedule.startTime}</strong>
                    {booking.pendingReschedule.reason && (
                      <span className="block mt-1">Reason: “{booking.pendingReschedule.reason}”</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-end sm:self-center">
                <Button size="sm" variant="outline" onClick={() => setActiveModal("reject_reschedule")}>Decline Reschedule</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setActiveModal("approve_reschedule")}>Approve Reschedule</Button>
              </div>
            </div>
          )}

          {booking.pendingModification && (
            <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Client Asked to Update the Booking Details</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {booking.pendingModification.changes.event_address !== undefined && (
                      <li>Venue / address: <strong>{booking.eventAddress || "—"}</strong> → <strong>{booking.pendingModification.changes.event_address}</strong></li>
                    )}
                    {booking.pendingModification.changes.guest_count !== undefined && (
                      <li>Guest count: <strong>{booking.guestCount ?? "—"}</strong> → <strong>{booking.pendingModification.changes.guest_count}</strong></li>
                    )}
                    {booking.pendingModification.changes.special_requests !== undefined && (
                      <li>Special requests: <strong>{booking.pendingModification.changes.special_requests}</strong></li>
                    )}
                  </ul>
                  <p className="text-xs text-muted-foreground">Reason: “{booking.pendingModification.reason}”</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-end sm:self-center">
                <Button size="sm" variant="outline" onClick={() => setActiveModal("reject_modification")}>Decline Changes</Button>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setActiveModal("approve_modification")}>Approve Changes</Button>
              </div>
            </div>
          )}

                 {booking.status === "pending" && <BudgetResponsePanel bookingId={booking.id} onChanged={() => refetch()} />}

       {booking.status === "pending" && !booking.hasActiveCancellationRequest && !termsAwaitingClient && (
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

          {booking.status === "waitlisted" && (
            <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3 justify-between text-amber-800 dark:text-amber-300 text-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Waitlisted — another paid booking holds this schedule. If that booking is cancelled, the slot is offered automatically to the oldest waitlisted client, who must accept the offer before paying. You can still offer it yourself from the cancelled booking's page ("Accommodate Other Reservation").</span>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs bg-background shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setCancelReason(""); setActiveModal("cancel_booking"); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Remove from Waitlist
              </Button>
            </div>
          )}

          {(booking.status === "confirmed" || booking.status === "waitlisted") && !booking.hasActiveCancellationRequest && booking.paymentStatus === "pending_verification" && (
            <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-3 justify-between text-amber-800 dark:text-amber-300 text-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{booking.status === "waitlisted" ? "Client submitted a GCash reference before another booking took this schedule. It is kept on record; it can only be verified if the schedule becomes free." : "Client submitted a GCash reference — needs your review before this booking can confirm."}</span>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs bg-background shrink-0" onClick={() => setActiveModal("review_payment")}>
                Review Payment
              </Button>
            </div>
          )}

            {booking.status === "confirmed" && !booking.hasActiveCancellationRequest && booking.remainingBalance > 0 &&
              booking.paymentStatus !== "pending_verification" && booking.paymentStatus !== "fully_paid" && booking.paymentStatus !== "partially_paid" && (
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3 text-blue-800 dark:text-blue-300 text-sm">
                <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Confirmed, but the client hasn't paid their deposit yet.</span>
              </div>
            )}

          {booking.status === "confirmed" && !booking.hasActiveCancellationRequest && (
            <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                  <Check className="w-5 h-5" /> Booking Confirmed & Active
                </div>
                {(!booking.serviceStatus || booking.serviceStatus === "upcoming") && (
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-background gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { setCancelReason(""); setActiveModal("cancel_booking"); }}>
                    <X className="w-3.5 h-3.5" /> Cancel Booking
                  </Button>
                )}
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
                  {nextManualStage && !hasPendingNoShowReport && (nextManualStage !== "event_day" || serviceHasStarted) ? (
                    <select
                      value={displayStage}
                      onChange={(e) => setPendingTrackerStage(e.target.value as TrackingStage)}
                      className="h-8 rounded-md border border-emerald-500/30 bg-background px-3 text-xs font-medium focus:ring-1 ring-primary cursor-pointer shadow-sm"
                      disabled={trackerMutation.isPending}
                    >
                      <option value={displayStage}>
                        {trackingStages.find((s) => s.id === displayStage)?.label ?? displayStage}
                      </option>
                      <option value={nextManualStage}>
                        {trackingStages.find((s) => s.id === nextManualStage)?.label ?? nextManualStage}
                      </option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {booking.serviceStatus === "delivered"
                        ? "Awaiting completion"
                        : hasPendingNoShowReport
                        ? "Paused — a no-show report is awaiting admin review"
                        : booking.serviceStatus === "event_day"
                        ? "Use “Confirm Shoot Completed” below"
                        : booking.serviceStatus === "upcoming" && !serviceHasStarted
                        ? "Event Day starts at the scheduled time"
                        : "Advances automatically"}
                    </span>
                  )}
                </div>
                <BookingTracker currentStage={trackerStage} />
              </div>

              {booking.serviceStatus === "event_day" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-500/20">
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                    {hasPendingNoShowReport
                      ? "A no-show report is awaiting admin review. You can't confirm the shoot until it is resolved."
                      : !serviceHasEnded
                      ? "You can confirm the shoot once the whole scheduled service has ended (all days)."
                      : "Shoot done? Confirm it to move this booking to Editing. The client can still report a problem until 48 hours after the scheduled end time."}
                  </p>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={handleConfirmShoot}
                    disabled={isMutating || hasPendingNoShowReport || !serviceHasEnded}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {confirmShootMutation.isPending ? "Confirming…" : "Confirm Shoot Completed"}
                  </Button>
                </div>
              )}

              {booking.serviceStatus !== "delivered" &&
                !booking.nonCompletionReason && booking.nonCompletionState !== "overturned" &&
                new Date(`${booking.date}T${booking.startTime}`) < new Date() && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-500/20">
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                    Client didn't show up? Report it. An admin will review the report.
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs shrink-0"
                    disabled={reportNoShowMutation.isPending}
                    onClick={() =>
                      reportNoShowMutation.mutate(
                        { id: booking.id },
                        {
                          onSuccess: () => toast({ title: "No-show reported", description: "An admin will review the report. The client can still send their side." }),
                          onError: (e) => toast({ title: "Something went wrong", description: getApiErrorMessage(e), variant: "destructive" as never }),
                        }
                      )
                    }
                  >
                    {reportNoShowMutation.isPending ? "Reporting…" : "Report client no-show"}
                  </Button>
                </div>
              )}

              {booking.serviceStatus === "delivered" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-500/20">
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                    {completionBlocked
                      ? `Photos delivered. You can mark this booking Completed after ${new Date(booking.completionBlockedUntil as string).toLocaleString()}, once the client's 48-hour window to report a problem has ended.`
                      : "Photos delivered. Conclude this booking once everything is squared away."}
                  </p>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    onClick={handleMarkCompleted}
                    disabled={isMutating || hasPendingNoShowReport || completionBlocked}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    {completeMutation.isPending ? "Completing…" : "Mark Service as Completed"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {booking.status === "completed" && (
            <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm border-b border-emerald-500/20 pb-3">
                <PackageCheck className="w-5 h-5" /> Booking Completed
              </div>
              <BookingTracker currentStage="completed" />
              <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70">
                This booking is concluded. The client has been able to leave a review since it was marked Completed.
              </p>
            </div>
          )}
                    {booking.status !== "cancelled" && booking.status !== "no_show" && (booking.nonCompletionReason || booking.nonCompletionState === "overturned") && (
            <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/30 space-y-2">
              <p className="text-sm font-semibold text-amber-700">
                {booking.nonCompletionState === "overturned"
                  ? "No-show report dismissed by admin"
                  : booking.nonCompletionReason === "photographer_no_show"
                  ? "The client reported that you did not attend — under admin review"
                  : "You reported a client no-show — under admin review"}
              </p>
              <p className="text-xs text-muted-foreground">
                The booking is not cancelled. An admin will review the report, and the service can't move forward until it is resolved.
              </p>

              {booking.nonCompletionState === "open" && booking.nonCompletionReportedBy !== Number(user?.id) && (
                <>
                  <p className="text-xs text-muted-foreground">
                    You can dispute this until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}. Your dispute is sent to the admin.
                  </p>
                  {!showDispute ? (
                    <Button size="sm" variant="outline" onClick={() => setShowDispute(true)}>Dispute this report</Button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Explain what happened (min 10 characters)"
                        value={disputeText}
                        onChange={(e) => setDisputeText(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={disputeText.trim().length < 10 || disputeMutation.isPending}
                        onClick={() =>
                          disputeMutation.mutate(
                            { id: booking.id, reason: disputeText.trim() },
                            {
                              onSuccess: () => {
                                setShowDispute(false);
                                setDisputeText("");
                                toast({ title: "Dispute submitted", description: "An admin will review this case." });
                              },
                            }
                          )
                        }
                      >
                        {disputeMutation.isPending ? "Submitting…" : "Submit dispute"}
                      </Button>
                    </div>
                  )}
                </>
              )}
              {booking.nonCompletionState === "open" && booking.nonCompletionReportedBy === Number(user?.id) && (
                <p className="text-xs text-muted-foreground">The client can dispute until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}.</p>
              )}
              {booking.nonCompletionState === "awaiting_admin" && (
                <p className="text-xs text-muted-foreground">An admin is reviewing this report and will make the final decision.</p>
              )}
              {booking.nonCompletionState === "disputed" && (
                <p className="text-xs text-muted-foreground">A dispute was submitted. An admin is reviewing both sides.</p>
              )}
            </div>
          )}
          {(booking.status === "cancelled" || booking.status === "no_show") && (
            <div className="bg-destructive/10 p-5 rounded-xl border border-destructive/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {booking.nonCompletionReason === "photographer_no_show"
                      ? "Not Completed — You Did Not Attend"
                      : booking.nonCompletionReason === "client_no_show"
                      ? "Not Completed — Client No-Show"
                      : booking.isDeclined
                      ? "Booking Request Declined"
                      : booking.cancelledBy === "client"
                      ? "Cancelled by the Client"
                      : booking.cancelledBy === "photographer"
                      ? "Cancelled by You"
                      : booking.cancelledBy === "admin"
                      ? "Cancelled by an Administrator"
                      : "Booking Cancelled"}
                  </p>
                  {(booking.cancellationReason || booking.rejectionReason) && (
                    <p className="text-xs text-muted-foreground mt-0.5">"{booking.cancellationReason || booking.rejectionReason}"</p>
                  )}
                  {candidates.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {candidates.length} waitlisted client{candidates.length > 1 ? "s are" : " is"} waiting for this date and time. The oldest is offered the slot automatically; clients who declined or let an offer lapse stay listed here so you can still offer it to one of them yourself.
                    </p>
                  )}

                  {booking.nonCompletionReason && (
                    <div className="mt-2 space-y-2">
                      {booking.nonCompletionState === "open" && booking.nonCompletionReportedBy !== Number(user?.id) && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            You can dispute this until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}.
                          </p>
                          {!showDispute ? (
                            <Button size="sm" variant="outline" onClick={() => setShowDispute(true)}>Dispute this report</Button>
                          ) : (
                            <div className="space-y-2">
                              <textarea
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                rows={3}
                                placeholder="Explain why this report is incorrect (min 10 characters)"
                                value={disputeText}
                                onChange={(e) => setDisputeText(e.target.value)}
                              />
                              <Button
                                size="sm"
                                disabled={disputeText.trim().length < 10 || disputeMutation.isPending}
                                onClick={() =>
                                  disputeMutation.mutate(
                                    { id: booking.id, reason: disputeText.trim() },
                                    {
                                      onSuccess: () => {
                                        setShowDispute(false);
                                        setDisputeText("");
                                        toast({ title: "Dispute submitted", description: "An admin will review this case." });
                                      },
                                      onError: (e) => toast({ title: "Something went wrong", description: getApiErrorMessage(e), variant: "destructive" as never }),
                                    }
                                  )
                                }
                              >
                                {disputeMutation.isPending ? "Submitting…" : "Submit dispute"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      {booking.nonCompletionState === "open" && booking.nonCompletionReportedBy === Number(user?.id) && (
                        <p className="text-xs text-muted-foreground">
                          The client can dispute until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}. An admin will make the final decision.
                        </p>
                      )}
                      {booking.nonCompletionState === "disputed" && <p className="text-xs text-muted-foreground">Disputed — awaiting admin review.</p>}
                      {booking.nonCompletionState === "upheld" && <p className="text-xs text-muted-foreground">An admin upheld the no-show report.</p>}
                      {booking.nonCompletionState === "final" && <p className="text-xs text-muted-foreground">The dispute period has ended. This booking is Not Completed.</p>}
                    </div>
                  )}
                </div>
              </div>
              {candidates.length > 0 && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 self-end sm:self-center"
                  onClick={() => { setSelectedCandidateId(candidates[0]?.id ?? null); setActiveModal("accommodate"); }}
                >
                  Accommodate Other Reservation
                </Button>
              )}
            </div>
          )}

          {booking.status === "expired" && (
            <div className="bg-muted/50 p-5 rounded-xl border border-border/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Booking Expired</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This request lapsed automatically — either it wasn't reviewed in time, or the client didn't pay within the payment window. No one actively cancelled it.
                </p>
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
                {booking.schedules && booking.schedules.length > 1 && (
                  <div className="pt-2 mt-2 border-t border-border/30 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground">Additional Sessions (same booking, same package)</span>
                    {booking.schedules.filter((s) => !s.isPrimary).map((s) => (
                      <div key={s.id} className="text-xs pl-1">
                        <span className="font-medium">{s.label}</span> — {s.eventDate}, {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : " · end time to be confirmed"}
                        <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {s.locationType
                            ? s.locationLabel || s.locationType.replace(/_/g, " ")
                            : "Same location as the booking"}
                        </div>
                      </div>
                    ))}
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
                    {booking.customBuild.hourlyRate != null ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Coverage</span>
                          <span className="font-medium">{booking.customBuild.hours ?? 0} hour{(booking.customBuild.hours ?? 0) === 1 ? "" : "s"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Scheduled</span>
                          <span className="font-medium">{booking.startTime}{booking.endTime ? ` – ${booking.endTime}` : ""}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rate</span>
                          <span className="font-medium">₱{booking.customBuild.hourlyRate.toLocaleString()}/hour</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Coverage Price</span>
                          <span className="font-medium">₱{(booking.customBuild.hourlyRate * (booking.customBuild.hours ?? 0)).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                          The client's booked coverage represents the agreed photography coverage period. If the
                          event ends earlier, this booking is not automatically reduced or refunded. If the client
                          requests additional coverage, you may accept or decline — accepted hours are billed
                          separately at this rate.
                        </p>
                        {booking.extensions.filter((e) => e.status === "approved").length > 0 && (
                          <div className="pt-2 mt-1 border-t border-border/30 space-y-1.5">
                            <p className="text-[11px] font-semibold text-foreground">Approved Extensions</p>
                            {booking.extensions.filter((e) => e.status === "approved").map((ext) => (
                              <div key={ext.id} className="text-[11px] space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Additional Coverage</span>
                                  <span className="font-medium">+{ext.requestedHours} hour{ext.requestedHours === 1 ? "" : "s"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Additional Charge</span>
                                  <span className="font-medium">₱{ext.additionalCharge.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">New Scheduled End</span>
                                  <span className="font-medium">{ext.newEndTime}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Base Service Fee</span>
                        <span className="font-medium">₱{booking.customBuild.baseFee.toLocaleString()}</span>
                      </div>
                    )}
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
              Accepting this request will notify <strong>{booking.clientName}</strong> to proceed with their deposit payment. The time slot is only reserved once you verify their payment.
            </p>

            {paidHolder && (
              <p className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg p-3">
                Another client has already paid for this time, so accepting will put this request on the waitlist instead of sending it to payment.
              </p>
            )}
            {!paidHolder && rivalsAccepted.length > 0 && (
              <p className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg p-3">
                Another client was already accepted for this time. If both pay, only the first payment you verify keeps the slot. The other booking moves to the waitlist, and you would need to refund them if the slot doesn't open.
              </p>
            )}

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
                  <p className="text-xs text-muted-foreground">The client will see your reason.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Reason for declining <span className="text-destructive">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Schedule fully booked, location outside service coverage..."
                className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Back</Button>
              <Button variant="destructive" onClick={handleConfirmReject} disabled={isMutating}>
                {isMutating ? "Processing…" : "Confirm Decline"}
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
                  <h3 className="font-bold text-lg">{activeModal === "approve_cancel" ? "Approve Cancellation?" : "Decline Cancellation Request?"}</h3>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeModal === "approve_cancel"
                ? "This will cancel the booking permanently. The client will be notified. If they already paid, arrange the refund with them."
                : "This will decline the client's cancellation request and keep the booking active. The client will be notified."}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Back</Button>
              <Button variant={activeModal === "approve_cancel" ? "destructive" : "default"} onClick={() => handleCancellationDecision(activeModal === "approve_cancel")} disabled={isMutating}>
                {isMutating ? "Processing…" : activeModal === "approve_cancel" ? "Approve Cancellation" : "Decline Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reschedule decision */}
      {(activeModal === "approve_reschedule" || activeModal === "reject_reschedule") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activeModal === "approve_reschedule" ? "bg-blue-500/10" : "bg-muted")}>
                  <Calendar className={cn("w-5 h-5", activeModal === "approve_reschedule" ? "text-blue-600" : "text-muted-foreground")} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{activeModal === "approve_reschedule" ? "Approve Reschedule?" : "Decline Reschedule Request?"}</h3>
                  {booking.pendingReschedule && (
                    <p className="text-xs text-muted-foreground">
                      Requested: {booking.pendingReschedule.eventDate} at {booking.pendingReschedule.startTime}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeModal === "approve_reschedule"
                ? "This will move the booking to the client's requested date and time, if that slot is still available. The client will be notified."
                : "This will decline the reschedule request and keep the booking on its original date and time. The client will be notified."}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isMutating}>Back</Button>
              <Button
                className={activeModal === "approve_reschedule" ? "bg-blue-600 hover:bg-blue-700 text-white" : undefined}
                variant={activeModal === "approve_reschedule" ? undefined : "default"}
                onClick={() => handleRescheduleDecision(activeModal === "approve_reschedule")}
                disabled={isMutating}
              >
                {isMutating ? "Processing…" : activeModal === "approve_reschedule" ? "Approve Reschedule" : "Decline Reschedule"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Modification decision */}
      {(activeModal === "approve_modification" || activeModal === "reject_modification") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-lg">{activeModal === "approve_modification" ? "Approve Detail Changes?" : "Decline Modification Request?"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isRequestMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeModal === "approve_modification"
                ? "The booking details will be updated with what the client asked for. The client will be notified."
                : "The booking stays as it is. The client will be notified."}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isRequestMutating}>Back</Button>
              <Button onClick={() => handleModificationDecision(activeModal === "approve_modification")} disabled={isRequestMutating}>
                {isRequestMutating ? "Processing…" : activeModal === "approve_modification" ? "Approve Changes" : "Decline Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel this booking (photographer) */}
      {activeModal === "cancel_booking" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">Cancel This Booking?</h3>
                <p className="text-xs text-muted-foreground">This ends the booking. The client will be notified.</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isRequestMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {booking.amountPaid > 0 && (
              <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                The client has already paid ₱{booking.amountPaid.toLocaleString()}. Arrange the refund with them directly.
              </p>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Reason for cancelling <span className="text-destructive">*</span></label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Emergency, equipment failure, illness..."
                className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isRequestMutating}>Back</Button>
              <Button variant="destructive" onClick={handleConfirmCancelBooking} disabled={isRequestMutating}>
                {isRequestMutating ? "Processing…" : "Cancel Booking"}
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
                  min={0}
                  value={onsitePaymentInput}
                  onChange={(e) => setOnsitePaymentInput(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

      {/* MODAL: Review Payment */}
      {activeModal === "review_payment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Review Payment</h3>
                  <p className="text-xs text-muted-foreground">Check your GCash transaction history for the reference number and amount below, then verify or reject.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveModal(null); setPaymentActionNotes(""); }} disabled={isPaymentActionMutating}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!paymentToReview ? (
              <p className="text-sm text-muted-foreground">
                {paymentsQuery.isLoading ? "Loading payment details…" : "No pending payment found for this booking."}
              </p>
            ) : (
              <>
                <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1.5 border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-primary">₱{paymentToReview.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference #:</span>
                    <span className="font-semibold">{paymentToReview.referenceNumber ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payer Name:</span>
                    <span className="font-semibold">{paymentToReview.payerName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span className="font-semibold">{paymentToReview.paymentDate}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {rivalsPaymentSubmitted.length > 0 && (
                    <p className="text-[11px] text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2">
                      {rivalsPaymentSubmitted.map((o) => o.clientName).join(", ")} also submitted a payment for this time. Verifying this one moves them to the waitlist. Their payment stays on record, so refund them if the slot doesn't open.
                    </p>
                  )}
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                    Only verify if your GCash history shows this exact reference number <strong>and</strong> an amount of ₱{paymentToReview.amount.toLocaleString()}. If you received less, reject it and write how much you actually received in the notes.
                  </p>
                  <label className="text-xs font-semibold text-foreground">Verification Notes (required to reject)</label>
                  <textarea
                    value={paymentActionNotes}
                    onChange={(e) => setPaymentActionNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleConfirmRejectPayment} disabled={isPaymentActionMutating || !paymentToReview}>
                {rejectPaymentMutation.isPending ? "Rejecting…" : "Reject"}
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleConfirmVerifyPayment} disabled={isPaymentActionMutating || !paymentToReview}>
                {verifyPaymentMutation.isPending ? "Verifying…" : "Verify Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Accommodate Other Reservation */}
      {activeModal === "accommodate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Accommodate Other Reservation</h3>
                  <p className="text-xs text-muted-foreground">Choose which waitlisted client to offer this date/time to. The oldest request is listed first.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveModal(null); setSelectedCandidateId(null); }} disabled={accommodateMutation.isPending}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {candidatesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading previous requests…</p>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No previous requests are available for this date and time.</p>
              ) : (
                candidates.map((c, idx) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer text-sm",
                      selectedCandidateId === c.id ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="candidate"
                        checked={selectedCandidateId === c.id}
                        onChange={() => setSelectedCandidateId(c.id)}
                      />
                      <div>
                        <p className="font-semibold">{c.clientName}{idx === 0 && <span className="ml-2 text-[10px] font-bold uppercase text-primary">Oldest request</span>}</p>
                        <p className="text-xs text-muted-foreground">{c.packageName} • ₱{c.totalPrice.toLocaleString()}{c.paymentStatus === "pending_verification" ? " • payment reference already submitted" : ""}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setActiveModal(null); setSelectedCandidateId(null); }} disabled={accommodateMutation.isPending}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmAccommodate}
                disabled={accommodateMutation.isPending || candidates.length === 0}
              >
                {accommodateMutation.isPending ? "Accommodating…" : "Accommodate Selected Client"}
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
