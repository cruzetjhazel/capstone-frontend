import {
  CalendarDays, DollarSign, Clock, CheckCircle,
  Check, X, AlertCircle, Loader2, Activity, Wallet, Package as PackageIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import {
  usePhotographerBookings,
  useAcceptBooking,
  useRejectBooking,
} from "@/hooks/usePhotographerBookings";
import { usePayments } from "@/hooks/usePayments";
import type { StudioBookingRecord } from "@/services/photographerBookingService";
import { photographerProfileService, type ProfileCompleteness } from "@/services/photographerProfileService";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// A "pending" booking's 24h review window (set by CreateBookingAction) may
// have lapsed server-side before ExpireStaleBookingHoldsAction next runs and
// flips its status to "expired". AcceptBookingAction rejects these with a
// validation error, so we detect it client-side first and disable the
// Accept/Decline actions instead of letting the request fail confusingly.
function isPendingHoldExpired(b: StudioBookingRecord): boolean {
  return b.status === "pending" && !!b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now();
}

export default function StudioDashboard() {
  const { user } = useRole();
  const { toast } = useToast();

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError } = usePhotographerBookings();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const acceptMutation = useAcceptBooking();
  const rejectMutation = useRejectBooking();

  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [completenessLoaded, setCompletenessLoaded] = useState(false);

  useEffect(() => {
    photographerProfileService.getCompleteness()
      .then(setCompleteness)
      .catch(() => setCompleteness(null))
      .finally(() => setCompletenessLoaded(true));
  }, []);

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<StudioBookingRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isMutating = acceptMutation.isPending || rejectMutation.isPending;

    const pendingBookings = bookings.filter((b) => b.status === "pending");
  // Dashboard's Pending Requests is meant for things that need action right
  // now — a hold-expired pending booking can't be accepted or declined
  // anymore (see isPendingHoldExpired below), so it's excluded here. It's
  // still visible on the full Bookings page, which already shows it with
  // the "Response window expired" note.
  const actionablePendingBookings = pendingBookings.filter((b) => !isPendingHoldExpired(b));
  const confirmedBookings = bookings.filter(
    (b): b is StudioBookingRecord & { status: "confirmed" } => b.status === "confirmed"
  );
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Primary "what's coming up" list — confirmed, scheduled bookings only.
  const upcomingBookings = confirmedBookings.slice(0, 5);

  // Lightweight activity feed — most recent relevant bookings, one line each.
  const recentActivity = bookings
    .filter((b) => b.status !== "rejected" && b.status !== "cancelled")
    .slice(0, 4);

  const now = new Date();
  const monthRevenue = payments
    .filter((p) => {
      const d = new Date(p.paymentDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const stats = [
        { label: "Pending Requests", value: String(actionablePendingBookings.length), icon: Clock, highlight: actionablePendingBookings.length > 0 },
    { label: "Upcoming Bookings", value: String(confirmedBookings.length), icon: CalendarDays, highlight: false },
    { label: "Completed", value: String(completedBookings.length), icon: CheckCircle, highlight: false },
    { label: "Revenue This Month", value: `₱${monthRevenue.toLocaleString()}`, icon: DollarSign, highlight: false },
  ];

  const isStatsLoading = loadingBookings || loadingPayments;

  // Only show the setup banner once we've actually heard back, and only
  // when something is genuinely missing — avoids a flash of "incomplete"
  // before the request resolves, and never nags a fully-set-up photographer.
  const showSetupBanner = completenessLoaded && completeness !== null && !completeness.fullyBookable;

  const handleOpenAccept = (booking: StudioBookingRecord) => {
    setSelectedBooking(booking);
    setIsAcceptModalOpen(true);
  };

  const handleOpenReject = (booking: StudioBookingRecord) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const executeAcceptBooking = async () => {
    if (!selectedBooking) return;
    try {
      await acceptMutation.mutateAsync(selectedBooking.id);
      toast({ title: "Booking accepted", description: "Client notified that payment is required." });
      setIsAcceptModalOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const executeRejectBooking = async () => {
    if (!selectedBooking || !rejectionReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: selectedBooking.id, reason: rejectionReason });
      toast({ title: "Booking rejected", description: "Client has been notified." });
      setIsRejectModalOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error), variant: "destructive" as never });
    }
  };

  const activityLabel = (b: StudioBookingRecord) => {
    if (b.status === "completed") return "Session completed";
    if (b.status === "confirmed") return "Booking confirmed";
    if (b.status === "pending") return "New booking request";
    return "Booking updated";
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold">{user?.name || "Your Studio"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your studio at a glance.</p>
        </div>

        {/* Setup reminder — clients can't see or book this photographer until
            these are done, so it's surfaced prominently until resolved. */}
        {showSetupBanner && completeness && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Finish setting up your studio to start receiving bookings
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                You won't appear in Explore and clients can't book you until this is complete:
              </p>
              <ul className="mt-2 space-y-1">
                {!completeness.hasActivePackage && (
                  <li className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <PackageIcon className="w-3.5 h-3.5 shrink-0" /> Publish at least one service package
                  </li>
                )}
                {!completeness.gcashConfigured && (
                  <li className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 shrink-0" /> Add your GCash account details for payments
                  </li>
                )}
                {!completeness.profileComplete && (
                  <li className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Complete your public profile (bio, style, socials)
                  </li>
                )}
                {!completeness.portfolioMinimumMet && (
                  <li className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Upload at least {completeness.portfolioMinimumRequired} portfolio photos
                  </li>
                )}
              </ul>
            </div>
            <div className="flex gap-2 shrink-0">
              {!completeness.hasActivePackage && (
                <Button asChild size="sm" variant="outline" className="text-xs border-amber-300 dark:border-amber-800">
                  <Link to="/studio/packages">Set Up Packages</Link>
                </Button>
              )}
              {!completeness.gcashConfigured && (
                <Button asChild size="sm" variant="outline" className="text-xs border-amber-300 dark:border-amber-800">
                  <Link to="/studio/settings">Add GCash Info</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-xl p-4 card-shadow border",
                stat.highlight ? "bg-primary/5 border-primary/40" : "bg-card border-border/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={cn("text-xs truncate", stat.highlight ? "text-primary font-medium" : "text-muted-foreground")}>
                    {stat.label}
                  </p>
                  <p className="text-xl font-heading font-bold mt-0.5">
                    {isStatsLoading ? "—" : stat.value}
                  </p>
                </div>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", stat.highlight ? "bg-primary/15" : "bg-primary/10")}>
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Requests — full-width, gets top priority whenever action is needed */}
        {loadingBookings ? (
          <div className="bg-card rounded-xl card-shadow border border-border/50 px-5 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : actionablePendingBookings.length > 0 ? (
          <div className="bg-card rounded-xl card-shadow border-2 border-primary/30 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-primary/20 bg-primary/5">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2 text-primary">
                <AlertCircle className="w-4 h-4" /> Pending Requests · {actionablePendingBookings.length}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {actionablePendingBookings.map((b) => (
                <div key={b.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{b.clientName}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.eventType} • {b.packageName}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold">{b.date}</p>
                      <Link
                        to={`/studio/bookings/${b.id}`}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        View details
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenAccept(b)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleOpenReject(b)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl card-shadow border border-border/50 px-5 py-4 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" /> No booking requests waiting for your response.
          </div>
        )}

        {/* Upcoming Bookings — confirmed, scheduled bookings only */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Upcoming Bookings · {confirmedBookings.length}
            </h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
              View all
            </Button>
          </div>

          {loadingBookings && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {!loadingBookings && bookingsError && (
            <div className="px-5 py-8 text-center text-sm text-destructive">
              {getApiErrorMessage(bookingsError, "Unable to load bookings.")}
            </div>
          )}

          {!loadingBookings && !bookingsError && (
            <div className="divide-y divide-border">
              {upcomingBookings.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No confirmed upcoming bookings.</div>
              )}

              {upcomingBookings.map((b) => (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {b.eventType} • {b.packageName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{b.date}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <h3 className="font-heading font-medium text-sm flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" /> Recent Activity
            </h3>
          </div>

          {loadingBookings && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {!loadingBookings && recentActivity.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No recent activity.</div>
          )}

          {!loadingBookings && recentActivity.length > 0 && (
            <div className="divide-y divide-border">
              {recentActivity.map((b) => (
                <div key={b.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm truncate">
                    {activityLabel(b)} <span className="text-muted-foreground">— {b.clientName}</span>
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">{b.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACCEPT BOOKING MODAL */}
        {isAcceptModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-scale-up">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Accept Booking Request</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Are you sure you want to accept the booking for <strong>{selectedBooking.clientName}</strong>?
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg mt-4 text-left">
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    <strong>Next Step:</strong> The client will be notified to make a payment. The booking will officially become "Confirmed" once the online payment is successfully processed.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => setIsAcceptModalOpen(false)} className="w-full" disabled={isMutating}>
                  Cancel
                </Button>
                <Button onClick={executeAcceptBooking} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isMutating}>
                  {acceptMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accepting</> : "Confirm Accept"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT BOOKING MODAL */}
        {isRejectModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-destructive/5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <h3 className="font-heading font-bold text-base text-destructive">Reject Booking</h3>
                </div>
                <button onClick={() => setIsRejectModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md" disabled={isMutating}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are declining the booking request from <strong>{selectedBooking.clientName}</strong> for {selectedBooking.date}.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="text-xs font-semibold">
                    Reason for Rejection <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="e.g., Schedule conflict, out of coverage area, etc."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="resize-none h-24"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Providing a reason is required and will be shared with the client.
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={isMutating}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={executeRejectBooking} disabled={!rejectionReason.trim() || isMutating}>
                  {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
