import {
  CalendarDays, DollarSign, Star, TrendingUp, Clock, Users, CheckCircle,
  Check, X, AlertCircle, FileText, Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import {
  usePhotographerBookings,
  useAcceptBooking,
  useRejectBooking,
} from "@/hooks/usePhotographerBookings";
import { useClients } from "@/hooks/useClients";
import { usePayments } from "@/hooks/usePayments";
import { useReviews } from "@/hooks/useReviews";
import type { StudioBookingRecord } from "@/services/photographerBookingService";
import { useState } from "react";

export default function StudioDashboard() {
  const { user } = useRole();
  const { toast } = useToast();

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError } = usePhotographerBookings();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const { data: reviews = [], isLoading: loadingReviews } = useReviews();
  const acceptMutation = useAcceptBooking();
  const rejectMutation = useRejectBooking();

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<StudioBookingRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isMutating = acceptMutation.isPending || rejectMutation.isPending;

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const activeClients = clients.filter((c) => c.status === "active");

  // Recent/active bookings feed — everything still relevant, most recent first.
  const recentBookings = bookings
    .filter((b) => b.status !== "rejected" && b.status !== "cancelled")
    .slice(0, 6);

  const now = new Date();
  const monthRevenue = payments
    .filter((p) => {
      const d = new Date(p.paymentDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const recentReviews = reviews.slice(0, 5);

  const stats = [
    { label: "Pending Bookings", value: String(pendingBookings.length), icon: Clock },
    { label: "This Month Revenue", value: `₱${monthRevenue.toLocaleString()}`, icon: DollarSign },
    { label: "Completed Sessions", value: String(completedBookings.length), icon: CheckCircle },
    { label: "Active Clients", value: String(activeClients.length), icon: Users },
  ];

  const isStatsLoading = loadingBookings || loadingClients || loadingPayments;

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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
          <p className="text-muted-foreground mt-1">Here's your business overview and active bookings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50 hover:card-shadow-hover transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">
                    {isStatsLoading ? "—" : stat.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent bookings */}
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Incoming & Active Bookings
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
                {pendingBookings.length} Pending
              </span>
            </div>

            {loadingBookings && (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground animate-pulse">Loading bookings...</div>
            )}

            {!loadingBookings && bookingsError && (
              <div className="px-6 py-8 text-center text-sm text-destructive">
                {getApiErrorMessage(bookingsError, "Unable to load bookings.")}
              </div>
            )}

            {!loadingBookings && !bookingsError && (
              <div className="divide-y divide-border">
                {recentBookings.length === 0 && (
                  <div className="px-6 py-16 text-center text-sm text-muted-foreground">No active bookings right now.</div>
                )}

                {recentBookings.map((b) => (
                  <div key={b.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm shrink-0 border border-secondary/20">
                        {b.clientName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-sm truncate">{b.clientName}</p>
                        <p className="text-xs text-muted-foreground truncate flex gap-1.5 items-center">
                          <span className="font-semibold text-foreground/80">{b.eventType}</span>
                          <span>•</span> {b.packageName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] mt-1">
                          <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10 capitalize">
                            Payment: {(b.paymentStatus ?? "pending").replace(/_/g, " ")}
                          </span>
                          <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border capitalize">
                            Service: {(b.serviceStatus ?? "not started").replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div className="text-xs text-muted-foreground text-left sm:text-right">
                        <p className="font-medium text-foreground">{b.date}</p>
                        <p>{b.startTime}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={b.status as any} />

                        {b.status === "pending" && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleOpenAccept(b)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md transition-colors border border-emerald-200/50"
                              title="Accept Booking"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(b)}
                              className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors border border-destructive/20"
                              title="Reject Booking"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" /> Recent Reviews
              </h3>
              {avgRating && (
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  <Star className="w-3 h-3 fill-accent text-accent" /> {avgRating}
                </span>
              )}
            </div>

            {loadingReviews && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground animate-pulse">Loading reviews...</div>
            )}

            {!loadingReviews && recentReviews.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">No reviews yet.</div>
            )}

            {!loadingReviews && recentReviews.length > 0 && (
              <div className="divide-y divide-border">
                {recentReviews.map((r) => (
                  <div key={r.id} className="px-6 py-4 hover:bg-muted/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{r.clientName}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="w-3 h-3 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">"{r.comment}"</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
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