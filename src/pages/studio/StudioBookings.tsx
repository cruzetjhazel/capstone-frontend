import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { Check, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
import { useState } from "react";

type FilterTab = "All" | "Pending" | "Active" | "Completed" | "Archived";

// A "pending" booking's 24h review window (set by CreateBookingAction) may
// have lapsed server-side before ExpireStaleBookingHoldsAction next runs and
// flips its status to "expired". AcceptBookingAction rejects these with a
// validation error, so we detect it client-side first and disable the
// Accept/Decline actions instead of letting the request fail confusingly.
function isPendingHoldExpired(b: StudioBookingRecord): boolean {
  return b.status === "pending" && !!b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now();
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
  const [pendingAction, setPendingAction] = useState<{ type: "accept" | "decline"; booking: StudioBookingRecord } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<StudioBookingRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [cancellationActionFor, setCancellationActionFor] = useState<{ type: "approve" | "reject"; booking: StudioBookingRecord } | null>(null);
  const [pendingTrackerChange, setPendingTrackerChange] = useState<{ booking: StudioBookingRecord; stage: TrackingStage } | null>(null);

  const filtered = bookings.filter((b) => {
    if (filter === "Archived") return b.status === "rejected" || b.status === "cancelled";
    if (b.status === "rejected" || b.status === "cancelled") return false;
    if (filter === "All") return true;
    if (filter === "Pending") return b.status === "pending";
    if (filter === "Completed") return b.status === "completed";
    return b.status === "accepted" || b.status === "confirmed";
  });

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
      await onsitePaymentMutation.mutateAsync({ id: recordingPaymentFor.id, amount: paymentAmountInput });
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
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative pb-12">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage requests, track service stages, and record payments.</p>
          </div>
          <div className="flex gap-2 bg-muted/50 p-1 rounded-full border border-border/50">
            {(["All", "Pending", "Active", "Completed", "Archived"] as FilterTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {f}
              </button>
            ))}
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
        <div className="space-y-4">
          {filtered.map((b) => (
            <div key={b.id} className={cn(
              "bg-card rounded-2xl card-shadow border p-5 transition-all",
              b.status === "rejected" ? "border-border/40 opacity-80" : "border-border/50"
            )}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
                    b.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary"
                  )}>
                    {b.clientName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", b.status === "rejected" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                      {b.clientName} <span className="text-xs text-muted-foreground font-mono ml-1 no-underline">{b.id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{b.eventType} · {b.packageName} · {b.date} {b.startTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Total / Paid</p>
                    <p className={cn("font-heading font-bold", b.status === "rejected" ? "text-muted-foreground" : "text-primary")}>
                      ₱{b.totalPrice.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/ ₱{b.amountPaid.toLocaleString()}</span>
                    </p>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => navigate(`/studio/bookings/${b.id}`)} className="text-xs font-medium">
                    View Details
                  </Button>
                </div>
              </div>

              {b.hasActiveCancellationRequest && (
                <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">Client has requested cancellation{b.cancellationReason ? `: "${b.cancellationReason}"` : "."}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCancellationActionFor({ type: "reject", booking: b })}>Keep Booking</Button>
                    <Button size="sm" variant="destructive" onClick={() => setCancellationActionFor({ type: "approve", booking: b })}>Approve Cancellation</Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                <div><span className="text-muted-foreground block">Booking:</span> <span className="font-semibold capitalize">{b.status}</span></div>
                <div><span className="text-muted-foreground block">Payment:</span> <span className="font-semibold capitalize">{(b.paymentStatus ?? "pending").replace('_', ' ')}</span></div>
                <div><span className="text-muted-foreground block">Service:</span> <span className="font-semibold capitalize">{(b.serviceStatus ?? "not started").replace(/_/g, ' ')}</span></div>
              </div>

              {b.status === "pending" && !b.hasActiveCancellationRequest && (
                isPendingHoldExpired(b) ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/60">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      This request's response window has expired and can no longer be accepted. It will be archived automatically.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-900 dark:text-amber-400">Review details before responding to request.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setPendingAction({ type: "decline", booking: b })} disabled={isMutating}>Decline</Button>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setPendingAction({ type: "accept", booking: b })} disabled={isMutating}>Accept Request</Button>
                    </div>
                  </div>
                )
              )}

              {b.status === "accepted" && !b.hasActiveCancellationRequest && (
                b.paymentStatus === "pending_verification" ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
                    <span>Client submitted a GCash reference — needs your review before the booking can confirm.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      onClick={() => navigate("/studio/earnings")}
                    >
                      Review Payment
                    </Button>
                  </div>
                ) : b.paymentStatus === "partially_paid" || b.paymentStatus === "fully_paid" ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-800 dark:text-emerald-300">
                    Payment received — booking is finalizing confirmation.
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
                    Request accepted. Awaiting client online deposit payment to confirm booking.
                  </div>
                )
              )}

              {(b.status === "confirmed" || b.status === "completed") && !b.hasActiveCancellationRequest && (() => {
                const displayStage = (b.serviceStatus ?? trackingStages[0].id) as TrackingStage;
                return (
                  <div className="space-y-4">
                    <BookingTracker currentStage={displayStage} />
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {b.remainingBalance > 0 && (
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setRecordingPaymentFor(b); setPaymentAmountInput(b.remainingBalance); }}>
                          <DollarSign className="w-3.5 h-3.5" /> Record Onsite Payment
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground font-medium">Update status:</span>
                      <select
                        value={displayStage}
                        onChange={(e) => setPendingTrackerChange({ booking: b, stage: e.target.value as TrackingStage })}
                        className="h-8 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 ring-primary"
                        disabled={trackerMutation.isPending}
                      >
                        {trackingStages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4 bg-card/50 rounded-2xl border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">No bookings found in the "{filter}" view.</p>
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
              <p className="text-sm text-muted-foreground">Record manual cash/onsite payment to clear the remaining balance.</p>

              <div className="space-y-2">
                 <label className="text-sm font-medium">Amount Received (₱)</label>
                 <input
                   type="number"
                   value={paymentAmountInput}
                   onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
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
