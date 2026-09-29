import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings, useRequestBookingCancellation, useReportBookingNonCompletion, useDisputeBookingNonCompletion, useRequestBookingReschedule, useRequestBookingModification, useRequestBookingExtension } from "@/hooks/useBookings";
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
  const [modificationOption, setModificationOption] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const booking: any = bookings.find((b) => String(b.id) === String(id));
  const { data: photographer } = usePhotographer(booking?.photographerId);
  const hasVerifiedPayment = payments.some((p) => !!p.verifiedAt);

  // Modification Timing Rule: Up to 7 days before event date, AND only
  // before the service has actually started (serviceStatus is still unset —
  // event_day/editing/delivered all mean the service has begun). Cancellation
  // eligibility is a separate, backend-enforced rule, below.
  const canModifyOrReschedule = useMemo(() => {
    if (!booking?.date) return false;
    if (booking?.serviceStatus && booking.serviceStatus !== "upcoming") return false;
    const eventDate = new Date(booking.date);
    const today = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [booking?.date, booking?.serviceStatus]);

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
  const hasActiveRequest = booking.hasActiveRequest;

  // Matches RequestBookingCancellationAction / Booking::isEligibleForCancellationRequest:
  // Pending is always cancellable; Confirmed only before the service has
  // started (serviceStatus unset or Upcoming — event_day/editing/delivered/
  // completed all mean the service has begun and cancellation is no longer
  // available).
  const canRequestCancellation =
    booking.status === "pending" ||
    (booking.status === "confirmed" && (!booking.serviceStatus || booking.serviceStatus === "upcoming"));

  const customBuild = booking.customBuild || {
    baseFee: 5000,
    editedPhotos: { label: "500 Edited Photos", price: 2000 },
    photographers: { label: "3 Photographers", price: 3000 },
    rawFiles: { price: 1000 },
    secondLocation: { price: 2000 },
    delivery: { label: "Express Delivery", price: 2000 }
  };

  const handleOpenForm = (type: RequestType) => {
    setRequestFormType(type);
    setIsConfirming(false);
    setReason("");
    setPreferredDate("");
    setModificationOption("");
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
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!requestFormType) return;

    try {
      if (requestFormType === "cancel") {
        await cancelMutation.mutateAsync({ id: booking.id, reason });
        toast({
          title: "Cancellation requested",
          description: "Your cancellation request has been sent to the studio for review.",
        });
      } else if (requestFormType === "reschedule") {
        const [datePart, timePart] = preferredDate.split("T");
        await rescheduleMutation.mutateAsync({ id: booking.id, eventDate: datePart, startTime: timePart, reason });
        toast({
          title: "Reschedule requested",
          description: "Your requested date and time has been sent to the studio for review.",
        });
      } else if (requestFormType === "modify") {
        await modifyMutation.mutateAsync({ id: booking.id, type: modificationOption, reason });
        toast({
          title: "Modification requested",
          description: "Your request has been sent to the studio for review.",
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
                {booking.status === "pending" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border bg-muted/50 rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5" /> Waiting for Approval
                  </span>
                )}
                {booking.status === "confirmed" && booking.paymentStatus === "pending" && (
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
                {(booking.status === "completed" || (booking.status === "cancelled" && !!booking.nonCompletionReason)) && !myReviews.some((r) => r.bookingId === String(booking.id)) && (
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

        {booking.status === "cancelled" && booking.nonCompletionReason && (
          <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/30 space-y-2">
            <p className="text-sm font-semibold text-destructive">
              {booking.nonCompletionReason === "photographer_no_show"
                ? "Not Completed — Photographer No-Show"
                : "Not Completed — Reported Client No-Show"}
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
                The studio can dispute this until {booking.nonCompletionDeadline ? new Date(booking.nonCompletionDeadline).toLocaleString() : "the deadline"}. If they don't, it stays Not Completed.
              </p>
            )}
            {booking.nonCompletionState === "disputed" && (
              <p className="text-xs text-muted-foreground">Disputed — an admin is reviewing this case.</p>
            )}
            {booking.nonCompletionState === "upheld" && (
              <p className="text-xs text-muted-foreground">
                An admin reviewed this and upheld the report.{booking.nonCompletionAdminNotes ? ` Note: ${booking.nonCompletionAdminNotes}` : ""}
              </p>
            )}
            {booking.nonCompletionState === "final" && (
              <p className="text-xs text-muted-foreground">The dispute period has ended. This booking is Not Completed.</p>
            )}
          </div>
        )}

        {/* Service Progress — existing six-stage tracker, refined presentation only */}
        {booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'expired' && (
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
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;
                    const StepIcon = step.icon;

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                        <div className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-card shrink-0",
                          isCompleted ? "border-primary bg-primary text-primary-foreground" :
                          isActive ? "border-primary text-primary ring-4 ring-primary/15" :
                          "border-muted text-muted-foreground/50"
                        )}>
                          {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          "text-[10px] sm:text-[11px] text-center leading-tight px-0.5",
                          isActive ? "text-foreground font-bold" : isCompleted ? "text-foreground/70 font-medium" : "text-muted-foreground/60"
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
            {booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'rejected' && booking.status !== 'expired' && (
              <div className="bg-card rounded-2xl border border-border/50 card-shadow p-5 sm:p-6">
                <h3 className="text-sm font-heading font-semibold mb-1">Booking Actions</h3>

                {!canRequestCancellation && (
                  <div className="mb-4 mt-3 p-3 bg-muted text-muted-foreground text-xs rounded-lg border border-border flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>
                      {booking.serviceStatus
                        ? "Cancellation is no longer available once the service has started."
                        : "Cancellation requests are only available before the studio confirms your booking."}
                    </p>
                  </div>
                )}

                {hasActiveRequest ? (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="w-full">
                        <p className="text-sm font-bold text-amber-800">Active Request</p>
                        <p className="text-xs text-amber-700/80 mt-1 mb-4">You cannot submit another request until this one has been resolved.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-4">Need to change something? Submit a request to the studio.</p>
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
                      <Button onClick={() => handleOpenForm("reschedule")} disabled={!RESCHEDULE_MODIFY_ENABLED || !canModifyOrReschedule} variant="outline" className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50">
                        <CalendarPlus className="w-3.5 h-3.5" /> Reschedule
                      </Button>
                      <Button onClick={() => handleOpenForm("modify")} disabled={!RESCHEDULE_MODIFY_ENABLED || !canModifyOrReschedule} variant="outline" className="w-full text-xs font-semibold h-10 gap-1.5 disabled:opacity-50">
                        <Edit3 className="w-3.5 h-3.5" /> Modify Booking
                      </Button>
                      <Button
                        onClick={() => handleOpenForm("cancel")}
                        disabled={!canRequestCancellation}
                        variant="outline"
                        className="w-full text-xs font-semibold h-10 gap-1.5 text-destructive/80 border-destructive/25 bg-destructive/5 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:text-muted-foreground disabled:border-border disabled:bg-transparent"
                      >
                        <FileX className="w-3.5 h-3.5" /> Cancellation
                      </Button>
                    </div>
                    {booking.status === "confirmed" &&
                      booking.serviceStatus !== "editing" && booking.serviceStatus !== "delivered" &&
                      new Date(`${booking.date}T${booking.startTime}`) < new Date() && (
                      <Button
                        onClick={() => reportNonCompletion.mutate({ id: booking.id, reason: "photographer_no_show" })}
                        disabled={reportNonCompletion.isPending}
                        variant="destructive"
                        className="w-full text-xs font-semibold h-10 gap-1.5 mt-3"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {reportNonCompletion.isPending ? "Reporting…" : "Report photographer no-show"}
                      </Button>
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
                  Are you sure you want to submit this {requestFormType} request?
                  The studio will be notified and this booking will be placed in a pending state until they review it.
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
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Preferred New Date & Time</label>
                      <input required type="datetime-local" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                  )}

                  {requestFormType === "modify" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">What would you like to modify?</label>
                      <select required value={modificationOption} onChange={(e) => setModificationOption(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Select an option</option>
                        <option value="venue">Venue</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                        <option value="addons">Add-ons</option>
                        <option value="contact">Contact Details</option>

                        {isCustom && (
                          <>
                            <option disabled>── Custom Adjustments ──</option>
                            <option value="photos">Change number of edited photos</option>
                            <option value="delivery">Change delivery speed</option>
                            <option value="raw">Add / Remove RAW files</option>
                            <option value="location">Add second location</option>
                            <option value="photographers">Increase photographers</option>
                          </>
                        )}

                        {!isCustom && (
                          <>
                            <option disabled>── Event Adjustments ──</option>
                            <option value="guests">Guest Count</option>
                          </>
                        )}
                      </select>
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
                  <Button type="button" variant="outline" onClick={() => { setRequestModalOpen(false); setRequestFormType(null); }}>Cancel</Button>
                  <Button type="submit" variant={requestFormType === 'cancel' ? 'destructive' : 'default'}>Submit Request</Button>
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
              <Button type="button" variant="outline" onClick={() => { setShowExtensionModal(false); setExtensionHours(1); setExtensionScheduleId(undefined); }}>Cancel</Button>
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
                  Cancel
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