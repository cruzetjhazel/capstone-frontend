import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings, useRequestBookingCancellation, useReportBookingNonCompletion, useDisputeBookingNonCompletion, useRequestBookingReschedule, useRequestBookingModification, useRequestBookingExtension, useRescheduleSlots } from "@/hooks/useBookings";
import { usePhotographer } from "@/hooks/usePhotographers";
import { usePaymentsForBooking } from "@/hooks/useClientPayments";
import { useMyReviews, useSubmitReview } from "@/hooks/useReviews";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  Calendar, Clock, MapPin, ArrowLeft,
  Award, AlertCircle, X, CalendarPlus, FileX, Edit3, Loader2, Sparkles, Receipt, Check,
  CheckCircle2, Camera, Wand2, PackageCheck, FolderOpen, Users, Facebook, Instagram, Globe, Phone, Mail, Star, AlertTriangle, type LucideIcon
} from "lucide-react";
   import { useState, useMemo } from "react";
   import { SlotOfferCard } from "@/components/booking/SlotOfferCard";
   import { BudgetRequestPanel } from "@/components/booking/BudgetRequestPanel";

type RequestType = "reschedule" | "cancel" | "modify" | null;

const RESCHEDULE_MODIFY_ENABLED = true;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

// Display-only — never mutates the stored value, just renders "23:00:00" as "11:00 PM"
const formatTime = (timeString: string) => {
  if (!timeString) return "";
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeString;
  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
};
// Client-facing Service Progress — 4 stages. "confirmed_paid" is a
// frontend-only display stage (service_status is still null, but the
// booking is Confirmed and payment is settled) — never sent to or received
// from the backend. The other 3 map directly to ServiceTrackerStatus. Booking
// status (pending/confirmed/completed/cancelled/expired) is shown separately
// via the badge above, not as a tracker stage.
     const SERVICE_PROGRESS_STEPS: { id: "confirmed_paid" | "upcoming" | "event_day" | "editing" | "delivered" | "completed"; label: string; description: string; icon: LucideIcon }[] = [
       { id: "confirmed_paid", label: "Confirmed & Paid", description: "Your booking is confirmed and payment is settled", icon: CheckCircle2 },
       { id: "upcoming", label: "Upcoming", description: "Waiting for your event date to arrive", icon: Clock },
       { id: "event_day", label: "Event Day", description: "It's photoshoot day!", icon: Camera },
       { id: "editing", label: "Editing", description: "Photos are currently being processed", icon: Wand2 },
       { id: "delivered", label: "Delivered", description: "All files have been delivered", icon: PackageCheck },
       { id: "completed", label: "Completed", description: "This booking is concluded", icon: CheckCircle2 },
     ];

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useRole();
  const { data: bookings = [], isLoading: isBookingsLoading } = useBookings(user?.email);

  const { data: payments = [] } = usePaymentsForBooking(id);
  const { data: myReviews = [] } = useMyReviews();
  const submitReviewMutation = useSubmitReview();
  const { toast } = useToast();
  const cancelMutation = useRequestBookingCancellation();
  const reportNonCompletion = useReportBookingNonCompletion();
  const disputeNonCompletion = useDisputeBookingNonCompletion();
  const [disputeText, setDisputeText] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowStatement, setNoShowStatement] = useState("");
  const [noShowConfirmed, setNoShowConfirmed] = useState(false);
  const rescheduleMutation = useRequestBookingReschedule();
  const modifyMutation = useRequestBookingModification();
  const extensionMutation = useRequestBookingExtension();
  const isSubmittingRequest = cancelMutation.isPending || rescheduleMutation.isPending || modifyMutation.isPending;
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionHours, setExtensionHours] = useState(1);
  // undefined = not yet chosen (only relevant when booking.schedules.length > 1,
  // which forces an explicit choice); null = the primary schedule itself
  // (also a valid, deliberate choice — not the same as "unset").
  const [extensionScheduleId, setExtensionScheduleId] = useState<string | null | undefined>(undefined);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestFormType, setRequestFormType] = useState<RequestType>(null);
  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  // Modify = event details only (address, guest count, notes). Date/time -> Reschedule,
  // extra hours -> Request Additional Coverage, package/add-ons/location type -> cancel and rebook.
  const [modGuestCount, setModGuestCount] = useState("");
  const [modAddress, setModAddress] = useState("");
  const [modNotes, setModNotes] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleKind, setRescheduleKind] = useState<"standard" | "weather" | "venue" | "agreed">("standard");
  const [isConfirming, setIsConfirming] = useState(false);

  const booking: any = bookings.find((b) => String(b.id) === String(id));
  const { data: photographer } = usePhotographer(booking?.photographerId);
  const hasVerifiedPayment = payments.some((p) => !!p.verifiedAt);

  // Modification Timing Rule: Up to 7 days before event date, AND only
  // before the service has actually started (serviceStatus is still unset —
  // event_day/editing/delivered all mean the service has begun). Cancellation
  // eligibility is a separate, backend-enforced rule, below.
  
  
  
  
  
  // Start times the photographer is actually free for this booking's length (checked by the server).
  const rescheduleSlotsQuery = useRescheduleSlots(
    booking?.id ? String(booking.id) : undefined,
    rescheduleDate,
    requestFormType === "reschedule" && requestModalOpen
  );

  const modifyBlockedReason = useMemo(() => {
    if (!booking?.date) return "This booking has no event date.";
    if (booking.serviceStatus && booking.serviceStatus !== "upcoming") {
      return "Changes aren't available once the service has started.";
    }
    const [y, m, d] = booking.date.split("-").map(Number);
    const eventDay = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
    if (diffDays < 7) {
      return `Modify and reschedule requests must be made at least 7 days before the event (this one is ${Math.max(diffDays, 0)} day(s) away). For weather or venue problems, use "Postpone" instead.`;
    }
    return null;
  }, [booking?.date, booking?.serviceStatus]);
  const canModifyDetails = booking?.allowedActions ? booking.allowedActions.can_modify : modifyBlockedReason === null;
  const canRescheduleBooking = booking?.allowedActions ? booking.allowedActions.can_reschedule : modifyBlockedReason === null;

  if (isBookingsLoading && !booking) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Loading booking…
        </div>
      </DashboardLayout>
    );
  }

  if (!booking) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className="text-muted-foreground">Booking not found or you lack authorized access.</p>
          <Link to="/bookings" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Back to Bookings</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isCustom = booking.packageType === "custom";
  // booking.dueNow already IS the remaining balance owed (bookingService maps it
  // straight from raw.remaining_balance) — don't subtract it from subtotal again.
  const remainingBalance = booking.status === "completed" ? 0 : booking.dueNow;
  const amountPaid = Math.max(0, booking.subtotal - remainingBalance);
  // Any request still waiting for the photographer: cancellation, reschedule or modification.
  const hasActiveRequest =
    !!booking.hasActiveRequest ||
    !!(booking.rescheduleInfo && !booking.rescheduleInfo.decision) ||
    !!(booking.modificationInfo && !booking.modificationInfo.decision);
  // Nothing paid yet = cancelling is instant. Otherwise it is a request the photographer answers.
  const cancelsImmediately = !["pending_verification", "partially_paid", "fully_paid"].includes(booking.paymentStatus ?? "");
  // Scheduled start of the booking.
  const noShowStartAt = (() => {
    if (!booking.date || !booking.startTime) return null;
    const [y, m, d] = String(booking.date).split("-").map(Number);
    const [hh, mm] = String(booking.startTime).split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  })();
  const hasStarted = !!noShowStartAt && new Date() >= noShowStartAt;
  const serviceTooFarAlong = ["delivered", "completed"].includes(booking.serviceStatus ?? "");
    const noShowAlreadyReported = !!booking.nonCompletionReason || booking.nonCompletionState === "overturned";
  // Only after the start time, never once Delivered, and only once per booking.
  const canReportNoShow = booking.allowedActions
    ? booking.allowedActions.can_report_photographer_no_show
    : booking.status === "confirmed" && hasStarted && !noShowAlreadyReported;
  const noShowDeadline: Date | null = booking.allowedActions?.no_show_report_deadline
    ? new Date(booking.allowedActions.no_show_report_deadline)
    : null;
  const noShowReportExpired = !!booking.allowedActions?.no_show_report_expired;
  // A photographer no-show can be reviewed only after the admin confirms it.
  const noShowBlocksReview =
    booking.nonCompletionReason === "photographer_no_show" && booking.nonCompletionState !== "upheld";
  // Matches RequestBookingCancellationAction / Booking::isEligibleForCancellationRequest:
  // Pending is always cancellable; Confirmed only before the service has
  // started (serviceStatus unset or Upcoming — event_day/editing/delivered/
  // completed all mean the service has begun and cancellation is no longer
  // available).
  const canRequestCancellation = booking.allowedActions
    ? booking.allowedActions.can_cancel
    : booking.status === "pending" ||
      (booking.status === "confirmed" && (!booking.serviceStatus || booking.serviceStatus === "upcoming"));

  const customBuild = booking.customBuild || {
    baseFee: 5000,
    editedPhotos: { label: "500 Edited Photos", price: 2000 },
    photographers: { label: "3 Photographers", price: 3000 },
    rawFiles: { price: 1000 },
    secondLocation: { price: 2000 },
    delivery: { label: "Express Delivery", price: 2000 }
  };

  const handleOpenForm = (type: RequestType, kind: "standard" | "weather" | "venue" | "agreed" = "standard") => {
    setRequestFormType(type);
    setRescheduleKind(kind);
    setIsConfirming(false);
    setReason("");
    setPreferredDate("");
    setModGuestCount("");
    setModAddress("");
    setModNotes("");
    setRescheduleDate("");
    setRescheduleTime("");
    setRequestModalOpen(true);
  };

  const handleRequestExtension = async () => {
    try {
      const effectiveScheduleId = (booking.schedules && booking.schedules.length > 1) ? extensionScheduleId : null;
      await extensionMutation.mutateAsync({ id: booking.id, additionalHours: extensionHours, scheduleId: effectiveScheduleId });
      toast({
        title: "Extension requested",
        description: "Your request for additional coverage has been sent to the photographer for approval.",
      });
      setShowExtensionModal(false);
      setExtensionHours(1);
      setExtensionScheduleId(undefined);
    } catch (err: any) {
      toast({ title: "Couldn't request extension", description: err?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestFormType === "reschedule" && (!rescheduleDate || !rescheduleTime)) {
      toast({ title: "Pick a new date and time", description: "Choose a date, then one of the available start times.", variant: "destructive" as never });
      return;
    }
    if (requestFormType === "modify" && !modGuestCount.trim() && !modAddress.trim() && !modNotes.trim()) {
      toast({ title: "Nothing to change", description: "Fill in at least one detail you want to update.", variant: "destructive" as never });
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!requestFormType) return;

    try {
      if (requestFormType === "cancel") {
        const cancelled: any = await cancelMutation.mutateAsync({ id: booking.id, reason });
        toast({
          title: cancelled?.status === "cancelled" ? "Booking cancelled" : "Cancellation requested",
          description: cancelled?.status === "cancelled"
            ? "Your booking has been cancelled and the photographer was notified."
            : "Your cancellation request has been sent to the photographer. They will approve or decline it.",
        });
      } else if (requestFormType === "reschedule") {
        const datePart = rescheduleDate;
        const timePart = rescheduleTime;
        await rescheduleMutation.mutateAsync({ id: booking.id, eventDate: datePart, startTime: timePart, reason, type: rescheduleKind });
        toast({
          title: "Reschedule requested",
          description: "Your requested date and time was sent to the photographer. They will approve or decline it.",
        });
      } else if (requestFormType === "modify") {
        const changes: { guest_count?: number; event_address?: string; special_requests?: string } = {};
        if (modGuestCount.trim() !== "") changes.guest_count = Number(modGuestCount);
        if (modAddress.trim() !== "") changes.event_address = modAddress.trim();
        if (modNotes.trim() !== "") changes.special_requests = modNotes.trim();
        await modifyMutation.mutateAsync({ id: booking.id, changes, reason });
        toast({
          title: "Modification requested",
          description: "Your request was sent to the photographer. They will approve or decline it.",
        });
      }
      setRequestModalOpen(false);
      setRequestFormType(null);
      setIsConfirming(false);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" as never,
      });
    }
  };
  const handleSubmitNoShowReport = () => {
  reportNonCompletion.mutate(
    { id: booking.id, reason: "photographer_no_show", notes: noShowStatement.trim() },
    {
      onSuccess: () => {
        setShowNoShowModal(false);
        setNoShowStatement("");
        setNoShowConfirmed(false);
        toast({ title: "Report submitted", description: "Your report was sent to an admin for review. Your booking is not cancelled." });
      },
      onError: (e: any) =>
        toast({ title: "Couldn't submit report", description: e?.message ?? "Please try again.", variant: "destructive" as never }),
    }
  );
};

  const isToday = (dateString: string) => {
    try {
      return new Date().toDateString() === new Date(dateString).toDateString();
    } catch {
      return false;
    }
  };

  const getCurrentStepIndex = (b: any) => {
    if (b.status === "completed" || b.serviceStatus === "completed") return 5;
    if (b.serviceStatus === "delivered") return 4;
    if (b.serviceStatus === "editing") return 3;
    if (b.serviceStatus === "event_day") return 2;
    if (b.serviceStatus === "upcoming") return 1;
    if (b.status === "confirmed" && (b.paymentStatus === "partially_paid" || b.paymentStatus === "fully_paid")) return 0;
    return -1;
  };

  const currentStep = getCurrentStepIndex(booking);

  const fallbackName: string = typeof booking?.photographerName === "string" && booking.photographerName.trim() !== ""
    ? booking.photographerName
    : "studio";

  // The system doesn't collect phone/email for photographers — confirmed against
  // PhotographerProfile.tsx, which only ever renders p.socials (facebook/instagram/website).
  // Mirror that here rather than showing contact fields that don't exist.
  const socialLinks = [
    { url: photographer?.socials?.facebook, Icon: Facebook, label: "Facebook" },
    { url: photographer?.socials?.instagram, Icon: Instagram, label: "Instagram" },
    { url: photographer?.socials?.website, Icon: Globe, label: "Website" },
  ].filter((s): s is { url: string; Icon: typeof Facebook; label: string } => !!s.url);
  
  return (
    <DashboardLayout>
      <div className="w-full max-w-[1400px] mx-auto space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/bookings">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Booking Details</span>
              <h1 className="text-xl font-bold font-heading -mt-0.5">Booking #{booking.id}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasVerifiedPayment && (
              <Link to={`/booking/${booking.id}/receipt`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-full">
                  <Receipt className="w-3.5 h-3.5" /> View Receipt
                </Button>
              </Link>
            )}

            {hasActiveRequest ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Request Pending
              </span>
            ) : (
              <>
                {booking.status === "waitlisted" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5" /> Waitlisted — Schedule Held by Another Booking
                  </span>
                )}
                {booking.status === "pending" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5" /> Waiting for Approval
                  </span>
                )}
                   {booking.status === "confirmed" && booking.awaitingOfferAcceptance && (
     <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-3 py-1.5">
       <Clock className="w-3.5 h-3.5" /> Offer Available — Accept to Pay
     </span>
   )}
   {booking.status === "confirmed" && booking.paymentStatus === "pending" && !booking.awaitingOfferAcceptance && (
                  <Link to={`/booking/${booking.id}/pay`}>
                    <Button size="sm" className="text-xs rounded-full bg-primary">Pay Now</Button>
                  </Link>
                )}
                {booking.status === "confirmed" && booking.paymentStatus === "pending_verification" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border bg-muted/50 rounded-full px-3 py-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Payment Under Review
                  </span>
                )}
                {booking.status === "confirmed" &&
                  (booking.paymentStatus === "partially_paid" || booking.paymentStatus === "fully_paid") && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Payment Verified
                  </span>
                )}
                {booking.status === "completed" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                )}
                {booking.isReviewable && !noShowBlocksReview && !myReviews.some((r) => r.bookingId === String(booking.id)) && (
                  <Button size="sm" className="text-xs rounded-full gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowReviewModal(true)}>
                    <Star className="w-3.5 h-3.5" /> Review & Rate
                  </Button>
                )}
                {booking.status === "expired" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5" /> Expired
                  </span>
                )}

              </>
            )}
          </div>
        </div>

        {booking.status === "cancelled" && !booking.nonCompletionReason && (
          <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/30 space-y-1">
            <p className="text-sm font-semibold text-destructive">
              {booking.isDeclined
                ? "Booking Request Declined"
                : booking.cancelledBy === "photographer"
                ? "Cancelled by the Photographer"
                : booking.cancelledBy === "admin"
                ? "Cancelled by an Administrator"
                : "Booking Cancelled"}
            </p>
            {(booking.isDeclined ? booking.rejectionReason : booking.cancellationReason) && (
              <p className="text-xs text-muted-foreground">Reason: “{booking.isDeclined ? booking.rejectionReason : booking.cancellationReason}”</p>
            )}
          </div>
        )}

   <SlotOfferCard booking={booking} />
   <BudgetRequestPanel booking={booking} />

   {booking.statusNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {booking.statusNotice}
          </div>
        )}

        {booking.status !== "cancelled" && booking.cancellationDecision === "rejected" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Your cancellation request was declined — the booking is still active.
          </div>
        )}
        {booking.status !== "cancelled" && booking.rescheduleInfo?.decision && (
          <div className={`rounded-xl border p-4 text-sm ${booking.rescheduleInfo.decision === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {booking.rescheduleInfo.decision === "approved"
              ? "Your reschedule request was approved — the booking moved to the new date and time."
              : "Your reschedule request was declined — the booking keeps its original date and time."}
          </div>
        )}
        {Array.isArray(booking.rescheduleHistory) && booking.rescheduleHistory.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1">
            <p className="font-semibold text-foreground">Schedule changes</p>
            {booking.rescheduleHistory.map((h: any, i: number) => (
              <p key={i} className="text-muted-foreground">
                {h.original_event_date} {formatTime(h.original_start_time)} → {h.new_event_date} {formatTime(h.new_start_time)}
                {h.type !== "standard" ? ` (${h.type === "weather" ? "weather" : h.type === "venue" ? "venue" : "agreed"} postponement)` : ""}
                {h.reason ? ` — “${h.reason}”` : ""}
              </p>
            ))}
          </div>
        )}
        {booking.status !== "cancelled" && booking.modificationInfo?.decision && (
          <div className={`rounded-xl border p-4 text-sm ${booking.modificationInfo.decision === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {booking.modificationInfo.decision === "approved"
              ? "Your request to update the booking details was approved."
              : "Your request to update the booking details was declined — the booking stays as it was."}
          </div>
        )}

                {(booking.nonCompletionReason || booking.nonCompletionState === "overturned") && (
          <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/30 space-y-2">
            <p className="text-sm font-semibold text-destructive">
              {booking.nonCompletionState === "upheld"
                ? booking.nonCompletionReason === "photographer_no_show"
                  ? "Not Completed — No Photographer Show (confirmed by admin)"
                  : "Not Completed — Client No-Show (confirmed by admin)"
                                : booking.nonCompletionState === "overturned"
                ? "No-show report dismissed by admin"
                : booking.nonCompletionReason === "photographer_no_show"
                ? "Photographer No-Show Reported — Under Admin Review"
                : "Client No-Show Reported — Under Admin Review"}
            </p>

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
                      disabled={disputeText.trim().length < 10 || disputeNonCompletion.isPending}
                      onClick={() =>
                        disputeNonCompletion.mutate(
                          { id: booking.id, reason: disputeText.trim() },
                          {
                            onSuccess: () => {
                              setShowDispute(false);
                              setDisputeText("");
                              toast({ title: "Dispute submitted", description: "An admin will review this case." });
                            },
                            onError: (e: any) => toast({ title: "Something went wrong", description: e?.message ?? "Please try again.", variant: "destructive" as never }),
                          }
                        )
                      }
                    >
                      {disputeNonCompletion.isPending ? "Submitting…" : "Submit dispute"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {booking.nonCompletionState === "open" && booking.nonCompletionReportedBy === Number(user?.id) && (
              <p className="text-xs text-muted-foreground">
                Your report was sent to an admin, who can review it now. The photographer can still send their side until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}. Your booking is not cancelled yet. You can leave a review only after the admin confirms the no-show.
              </p>
            )}
            {booking.nonCompletionState === "disputed" && (
              <p className="text-xs text-muted-foreground">The photographer disputed this report. An admin is reviewing both sides. Your booking stays as it is until the admin decides.</p>
            )}
            {booking.nonCompletionState === "upheld" && (
              <p className="text-xs text-muted-foreground">
                An admin reviewed this and upheld the report.{booking.nonCompletionAdminNotes ? ` Note: ${booking.nonCompletionAdminNotes}` : ""}
              </p>
            )}
              {booking.nonCompletionState === "awaiting_admin" && (
              <p className="text-xs text-muted-foreground">An admin is reviewing this report and will make the final decision.</p>
            )}
           {booking.nonCompletionState === "overturned" && (
              <p className="text-xs text-muted-foreground">An admin reviewed this report and dismissed it. The booking continues as normal.</p>
            )}
          </div>
        )}

        {/* Service Progress — existing six-stage tracker, refined presentation only */}
        {booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'expired' && booking.status !== 'no_show' && (
          <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Service Progress</h3>
              <span className="text-[11px] sm:text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                  {currentStep >= 0 ? SERVICE_PROGRESS_STEPS[currentStep].label : "Not Started"}
              </span>
            </div>

            <div className="relative w-full overflow-x-auto pb-1">
              <div className="relative min-w-[560px] sm:min-w-0">
                <div className="absolute top-4 sm:top-4.5 left-4 sm:left-[18px] right-4 sm:right-[18px]">
                  <div className="h-[2px] w-full bg-muted rounded-full" />
                  <div
                    className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-700 rounded-full"
                      style={{ width: `${(Math.max(currentStep, 0) / (SERVICE_PROGRESS_STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                <div className="relative z-10 flex items-start justify-between w-full">
                  {SERVICE_PROGRESS_STEPS.map((step, idx) => {
                    // When the booking is Completed there is nothing left to do, so the final
                    // step is rendered as fully done (solid fill) instead of "in progress".
                    const allDone = currentStep === SERVICE_PROGRESS_STEPS.length - 1;
                    const isCurrent = idx === currentStep;
                    const isCompleted = idx < currentStep || (isCurrent && (allDone || step.id === "delivered"));
                    const isActive = isCurrent && !isCompleted;
                    const StepIcon = step.icon;

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                        <div className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-card shrink-0",
                          isCompleted ? "border-primary bg-primary text-primary-foreground" :
                          isActive ? "border-primary text-primary ring-4 ring-primary/15" :
                          "border-muted text-muted-foreground/50",
                          allDone && isCurrent && "ring-4 ring-primary/20"
                        )}>
                          {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          "text-[10px] sm:text-[11px] text-center leading-tight px-0.5",
                          isCurrent ? "text-foreground font-bold" : isCompleted ? "text-foreground/70 font-medium" : "text-muted-foreground/60"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 bg-muted/30 rounded-lg py-2.5 px-4 text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <p className="text-xs sm:text-sm text-foreground">
                {currentStep >= 0
                  ? SERVICE_PROGRESS_STEPS[currentStep].description
                  : "Once your payment is confirmed, your service progress will appear here."}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN — wide */}
          <div className="lg:col-span-2 space-y-5">
            {/* Your Shoot + Package, combined into one card */}
            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {booking.eventType}
                  </span>
                  {isCustom && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Custom Package
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-heading font-bold mt-2">
                  {isCustom ? "Customized Package" : booking.packageName}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  {isCustom ? "Built specifically for your event" : "Standard package"} &bull; Provided by {booking.photographerName}
                </p>
              </div>

              {/* Your Shoot — horizontal on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-border/60">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground">Shoot Date</p>
                    <p className="text-sm font-medium text-foreground">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground">{booking.endTime ? "Scheduled Coverage" : "Start Time"}</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatTime(booking.startTime)}{booking.endTime ? ` – ${formatTime(booking.endTime)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground">Venue</p>
                    <p className="text-sm font-medium text-foreground">{booking.eventLocation}</p>
                  </div>
                </div>
              </div>

              {/* Multiple schedules (e.g. Prenup + Wedding on separate,
                  non-contiguous dates) — only shown when there's more than
                  the one primary schedule already covered by "Your Shoot"
                  above, so a normal single-date booking's page looks
                  exactly as it always has. */}
              {booking.schedules && booking.schedules.length > 1 && (
                <div className="pt-5 border-t border-border/60">
                  <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Photography Sessions
                  </h3>
                  <p className="text-xs text-muted-foreground -mt-1 mb-3">
                    These sessions all belong to this one booking and package. The photographer reviews and confirms them together.
                  </p>
                  <div className="space-y-2.5">
                    {booking.schedules.map((sch) => (
                      <div key={sch.id ?? "primary"} className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {sch.label} <span className="text-muted-foreground font-normal">— {sch.eventDate}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(sch.startTime)}
                            {sch.endTime ? ` – ${formatTime(sch.endTime)}` : " · End time to be confirmed"}
                          </p>
                          {!sch.isPrimary && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sch.locationType
                                ? [sch.eventAddress, sch.locationLabel].filter(Boolean).join(", ") || sch.locationType.replace(/_/g, " ")
                                : "Same location as the booking"}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Package inclusions — compact icon rows, no boxed nesting */}
              <div className="pt-5 border-t border-border/60">
                <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {isCustom ? "What's Included" : "Package Includes"}
                </h3>

                {isCustom ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{customBuild.editedPhotos?.label || "Standard photos"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{customBuild.photographers?.label || "1 Photographer"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{customBuild.delivery?.label || "Standard 30 Days"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{customBuild.rawFiles ? "RAW files included" : "RAW not included"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{customBuild.secondLocation ? "Second location included" : "Single location"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{booking.packagePhotos || "300"} edited photos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">RAW files included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">30-day delivery</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Actions */}
            {booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'expired' && booking.status !== 'no_show' && (
              <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6">
                <h3 className="text-sm font-heading font-semibold mb-1">Booking Actions</h3>

                {!canRequestCancellation && (
                  <div className="mb-4 mt-3 p-3 bg-muted text-muted-foreground text-xs rounded-lg border border-border flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>
                      {booking.serviceStatus
                        ? "Cancellation is no longer available once the service has started."
                        : "This booking can no longer be cancelled."}
                    </p>
                  </div>
                )}

                {hasActiveRequest ? (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="w-full">
                        <p className="text-sm font-bold text-amber-800">{booking.hasActiveRequest ? "Cancellation request pending" : booking.rescheduleInfo && !booking.rescheduleInfo.decision ? "Reschedule request pending" : "Modification request pending"}</p>
                        <p className="text-xs text-amber-700/80 mt-1 mb-4">The photographer has been notified. You can't send another request until they approve or decline this one.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-4">Need to change something? Submit a request to the studio.</p>
                    {modifyBlockedReason && (
                      <p className="text-[11px] text-muted-foreground -mt-2 mb-3 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {modifyBlockedReason}
                      </p>
                    )}
                    {booking.extensionEligible && (
                      <div className="mb-3">
                        <Button
                          onClick={() => setShowExtensionModal(true)}
                          disabled={booking.hasPendingExtension}
                          variant="outline"
                          className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {booking.hasPendingExtension ? "Extension request pending" : "Request Additional Coverage"}
                        </Button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button onClick={() => handleOpenForm("reschedule")} disabled={!RESCHEDULE_MODIFY_ENABLED || !canRescheduleBooking} variant="outline" className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50">
                        <CalendarPlus className="w-3.5 h-3.5" /> Reschedule
                      </Button>
                      <Button onClick={() => handleOpenForm("modify")} disabled={!RESCHEDULE_MODIFY_ENABLED || !canModifyDetails} variant="outline" className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50">
                        <Edit3 className="w-3.5 h-3.5" /> Modify Details
                      </Button>
                      <Button
                        onClick={() => handleOpenForm("cancel")}
                        disabled={!canRequestCancellation}
                        variant="outline"
                        className="w-full text-xs font-semibold h-10 gap-1.5 text-destructive/80 border-destructive/25 bg-destructive/5 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:text-muted-foreground disabled:border-border disabled:bg-transparent"
                      >
                        <FileX className="w-3.5 h-3.5" /> Cancel Booking
                      </Button>
                    </div>
                    {booking.allowedActions?.can_postpone && (
                      <div className="mt-3">
                        <Button onClick={() => handleOpenForm("reschedule", "weather")} variant="outline" className="w-full text-xs font-semibold h-10 gap-1.5">
                          <CalendarPlus className="w-3.5 h-3.5" /> Postpone (weather / venue / agreed)
                        </Button>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          For bad weather, venue problems or another agreed reason. Works close to the date and on Event Day. The photographer must approve.
                        </p>
                      </div>
                    )}
                    {booking.status === "confirmed" && !noShowAlreadyReported && (
                      <div className="mt-3">
                        <Button
                          onClick={() => setShowNoShowModal(true)}
                          disabled={!canReportNoShow}
                          variant="destructive"
                          className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Report photographer no-show
                        </Button>
                        {canReportNoShow && noShowDeadline && (
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            You can report until {noShowDeadline.toLocaleString()} (48 hours after the scheduled end of the service).
                          </p>
                        )}
                        {!canReportNoShow && noShowReportExpired && (
                          <p className="text-[11px] text-destructive mt-1.5">
                            The reporting period for this booking has expired{noShowDeadline ? ` (ended ${noShowDeadline.toLocaleString()})` : ""}.
                          </p>
                        )}
                        {!canReportNoShow && !noShowReportExpired && (
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            Available after the scheduled start time ({booking.date} at {formatTime(booking.startTime)}).
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — supporting info */}
          <div className="space-y-5">
            {/* Payment */}
            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Payment Summary
              </h3>

              <div className="space-y-2 text-xs">
                {isCustom ? (
                  <>
                    {customBuild.hourlyRate != null ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Booked Coverage</span>
                          <span className="font-medium text-foreground">{customBuild.hours ?? 0} hour{(customBuild.hours ?? 0) === 1 ? "" : "s"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Hourly Rate</span>
                          <span className="font-medium text-foreground">{formatPrice(customBuild.hourlyRate)}/hour</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Coverage Price</span>
                          <span className="font-medium text-foreground">{formatPrice(customBuild.hourlyRate * (customBuild.hours ?? 0))}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30 mt-1">
                          Coverage Reminder: this is the agreed photography coverage period. If the event ends
                          earlier, the booking isn't automatically reduced or refunded. Need more time? You can
                          request additional coverage from your photographer — subject to their approval and an
                          extra hourly charge.
                        </p>
                        {booking.extensions && booking.extensions.length > 0 && (
                          <div className="pt-2 mt-1 border-t border-border/30 space-y-1.5">
                            <p className="text-[11px] font-semibold text-foreground">Additional Coverage</p>
                            {booking.extensions.map((ext) => (
                              <div key={ext.id} className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">
                                  +{ext.requestedHours}h {ext.status === "approved" ? `(approved, ends ${ext.newEndTime})` : ext.status === "declined" ? "(declined)" : "(pending approval)"}
                                </span>
                                <span className={cn("font-medium", ext.status === "approved" && "text-foreground")}>
                                  {ext.status === "declined" ? "—" : `${formatPrice(ext.additionalCharge)}`}
                                </span>
                              </div>
                            ))}
                            {booking.approvedExtensionCharge > 0 && (
                              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/20 font-semibold">
                                <span>Total Additional Charge</span>
                                <span>{formatPrice(booking.approvedExtensionCharge)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Base Fee</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.baseFee)}</span>
                      </div>
                    )}
                    {customBuild.editedPhotos && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{customBuild.editedPhotos.label}</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.editedPhotos.price)}</span>
                      </div>
                    )}
                    {customBuild.photographers && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{customBuild.photographers.label}</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.photographers.price)}</span>
                      </div>
                    )}
                    {customBuild.rawFiles && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">RAW Files</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.rawFiles.price)}</span>
                      </div>
                    )}
                    {customBuild.secondLocation && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Second Location</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.secondLocation.price)}</span>
                      </div>
                    )}
                    {customBuild.delivery && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{customBuild.delivery.label}</span>
                        <span className="font-medium text-foreground">{formatPrice(customBuild.delivery.price)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Package Base</span>
                    <span className="font-medium text-foreground">{formatPrice(booking.subtotal)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="font-semibold text-foreground">Package Total</span>
                  <span className="font-semibold text-foreground">{formatPrice(booking.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deposit Paid</span>
                  <span className="font-medium text-foreground">{(booking.status === 'confirmed' || booking.status === 'completed') ? formatPrice(amountPaid) : formatPrice(0)}</span>
                </div>
              </div>

              {payments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs">
                      <div>
                        <p className="font-mono font-semibold text-foreground">{p.referenceNumber ?? "Onsite payment (cash)"}</p>
                        <p className="text-muted-foreground">{p.paymentDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(p.amount)}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">{String(p.matchingStatus).replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Remaining Balance</span>
                <span className="text-lg font-bold text-primary">{formatPrice(remainingBalance)}</span>
              </div>
            </div>

            {/* Photographer / Studio */}
            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Photographer
              </h3>

              <p className="text-sm font-semibold text-foreground">{booking.photographerName}</p>

              {(photographer?.phone || photographer?.email) && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {photographer?.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {photographer.phone}
                    </p>
                  )}
                  {photographer?.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {photographer.email}
                    </p>
                  )}
                </div>
              )}

              {socialLinks.length > 0 ? (
                <div className="flex items-center gap-2 pt-1">
                  {socialLinks.map(({ url, Icon, label }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={label}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-1">No public links on file.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {requestModalOpen && requestFormType && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setRequestModalOpen(false); setRequestFormType(null); setIsConfirming(false); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              disabled={isSubmittingRequest}
            >
              <X className="w-5 h-5" />
            </button>

            {isConfirming ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-heading font-bold mb-2">Confirm Request</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {requestFormType === "cancel" && cancelsImmediately
                    ? "Are you sure you want to cancel this booking? This cannot be undone."
                    : `Are you sure you want to submit this ${requestFormType === "cancel" ? "cancellation" : requestFormType} request?`}
                  {requestFormType === "cancel" && cancelsImmediately
                    ? "No payment has been made yet, so it is cancelled right away and the photographer is notified."
                    : "The photographer will be notified. Nothing changes until they approve or decline your request."}
                </p>
                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsConfirming(false)} disabled={isSubmittingRequest}>Back</Button>
                  <Button onClick={handleFinalSubmit} disabled={isSubmittingRequest}>
                    {isSubmittingRequest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : "Confirm Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInitialSubmit} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-heading font-bold capitalize">Request {requestFormType}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCustom ? "Customized Package" : "Standard Package"} &bull; Booking ID: {booking.id}
                  </p>
                </div>

                <div className="space-y-4">
                  {requestFormType === "reschedule" && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                        Current schedule: <strong>{booking.date}</strong> at <strong>{formatTime(booking.startTime)}</strong>. Pick a new date, then one of the start times the photographer is actually free. The photographer must approve the change.
                      </p>
                      <div className="space-y-2">
                                              {rescheduleKind !== "standard" && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold">Reason for postponement</label>
                          <select
                            value={rescheduleKind}
                            onChange={(e) => setRescheduleKind(e.target.value as "weather" | "venue" | "agreed")}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="weather">Bad weather</option>
                            <option value="venue">Venue problem</option>
                            <option value="agreed">Other (agreed with the photographer)</option>
                          </select>
                        </div>
                      )}
                        <label className="text-xs font-semibold">New date</label>
                        <input
                          required type="date" min={new Date().toISOString().slice(0, 10)} value={rescheduleDate}
                          onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(""); }}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                      {rescheduleDate && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold">New start time</label>
                          {rescheduleSlotsQuery.isLoading ? (
                            <p className="text-xs text-muted-foreground">Checking availability…</p>
                          ) : (rescheduleSlotsQuery.data?.length ?? 0) === 0 ? (
                            <p className="text-xs text-destructive">No available start times on this date. Try another date.</p>
                          ) : (
                            <select
                              required value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                              <option value="">Select a start time</option>
                              {rescheduleSlotsQuery.data!.map((t) => (
                                <option key={t} value={t}>{formatTime(t)}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {requestFormType === "modify" && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                        You can ask to update the <strong>venue address</strong>, <strong>guest count</strong> or <strong>special requests</strong>. Leave a field empty to keep it as it is.
                        To change the date or time use <strong>Reschedule</strong>; for extra hours use <strong>Request Additional Coverage</strong>;
                        to change the package, add-ons or location type, cancel and book again.
                      </p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Venue / event address</label>
                        <input
                          value={modAddress} onChange={(e) => setModAddress(e.target.value)} placeholder={booking.eventLocation || "New address"}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Guest count</label>
                        <input
                          type="number" min={1} value={modGuestCount} onChange={(e) => setModGuestCount(e.target.value)} placeholder={booking.guestCount || "New guest count"}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Special requests / notes</label>
                        <textarea
                          value={modNotes} onChange={(e) => setModNotes(e.target.value)} placeholder="Anything the photographer should know"
                          className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Reason / Notes</label>
                    <textarea required placeholder="Please explain your request in detail..." value={reason} onChange={(e) => setReason(e.target.value)} className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
                  </div>

                  {requestFormType === "cancel" && (
                    <p className="text-[10px] text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                      By submitting a cancellation request, you must provide a valid reason. You understand that your deposit may be non-refundable according to the studio's cancellation policy.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setRequestModalOpen(false); setRequestFormType(null); }}>Close</Button>
                  <Button type="submit" variant={requestFormType === 'cancel' ? 'destructive' : 'default'}>{requestFormType === 'cancel' ? (cancelsImmediately ? 'Cancel Booking' : 'Request Cancellation') : 'Submit Request'}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Request Additional Coverage (Extension) */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowExtensionModal(false); setExtensionHours(1); setExtensionScheduleId(undefined); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-heading font-semibold text-lg mb-1">Request Additional Coverage</h3>

            {booking.schedules && booking.schedules.length > 1 ? (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3">
                  This booking has more than one schedule. Which one would you like to extend?
                </p>
                <div className="space-y-2">
                  {booking.schedules.map((sch) => (
                    <button
                      key={sch.id ?? "primary"}
                      type="button"
                      onClick={() => setExtensionScheduleId(sch.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border text-sm transition-colors",
                        extensionScheduleId === sch.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <p className="font-medium">{sch.label} — {sch.eventDate}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(sch.startTime)} – {sch.endTime ? formatTime(sch.endTime) : "To be confirmed"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Your booked coverage ends at {formatTime(booking.endTime || "")}. If you need additional photography
                time, you can request an extension. Additional hours are subject to photographer approval and will
                be charged at the configured hourly rate if accepted.
              </p>
            )}

            <div className="space-y-2 mb-5">
              <label className="text-xs font-semibold text-muted-foreground">Additional hours</label>
              <input
                type="number"
                min={1}
                max={12}
                value={extensionHours}
                onChange={(e) => setExtensionHours(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              />
              {customBuild.hourlyRate != null && (
                <p className="text-xs text-muted-foreground">
                  Estimated additional charge: {formatPrice(customBuild.hourlyRate * extensionHours)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowExtensionModal(false); setExtensionHours(1); setExtensionScheduleId(undefined); }}>Close</Button>
              <Button
                type="button"
                onClick={handleRequestExtension}
                disabled={extensionMutation.isPending || (booking.schedules && booking.schedules.length > 1 && extensionScheduleId === undefined)}
              >
                {extensionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
            {/* MODAL: Report photographer no-show */}
      {showNoShowModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="text-destructive w-5 h-5" /> Report photographer no-show
            </h3>
            <p className="text-sm text-muted-foreground">
              This sends a no-show report for Booking #{booking.id} to an admin for review. Your booking will <strong>not</strong> be cancelled automatically.
              {" "}{fallbackName} will be notified and has 16 hours to dispute the report. The admin decides after reviewing both sides.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your statement</label>
              <textarea
                value={noShowStatement}
                onChange={(e) => setNoShowStatement(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="What happened? Include when you arrived, how long you waited, and any attempts to reach the photographer (messages, calls)."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-none"
              />
              <p className="text-[11px] text-muted-foreground flex justify-between">
                <span>{noShowStatement.trim().length < 20 ? "At least 20 characters required." : " "}</span>
                <span>{noShowStatement.length}/1000</span>
              </p>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={noShowConfirmed}
                onChange={(e) => setNoShowConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I confirm that this report is honest and accurate, and that the photographer did not attend the
                scheduled session. I understand that a false report can be reviewed by an admin and may lead to action on my account.
              </span>
            </label>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowNoShowModal(false); setNoShowStatement(""); setNoShowConfirmed(false); }}
                disabled={reportNonCompletion.isPending}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitNoShowReport}
                disabled={reportNonCompletion.isPending || !noShowConfirmed || noShowStatement.trim().length < 20}
              >
                {reportNonCompletion.isPending ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Review & Rate */}
      {showReviewModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Star className="text-primary w-5 h-5" /> Review {fallbackName}
              </h3>
              <p className="text-sm text-muted-foreground">
                Share how your {booking.eventType} session went. This will be visible to other clients.
              </p>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setReviewRating(n)} className="p-0.5" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                    <Star className={cn("w-7 h-7 transition-colors", n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your review</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="What stood out about your experience?"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowReviewModal(false); setReviewRating(0); setReviewComment(""); }} disabled={submitReviewMutation.isPending}>
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (reviewRating < 1) {
                      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" as never });
                      return;
                    }
                    try {
                      await submitReviewMutation.mutateAsync({ booking_id: Number(booking.id), rating: reviewRating, comment: reviewComment });
                      toast({ title: "Review submitted", description: "Thanks for sharing your experience!" });
                      setShowReviewModal(false);
                      setReviewRating(0);
                      setReviewComment("");
                    } catch (error) {
                      toast({ title: "Something went wrong", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" as never });
                    }
                  }}
                  disabled={submitReviewMutation.isPending}
                >
                  {submitReviewMutation.isPending ? "Submitting…" : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}