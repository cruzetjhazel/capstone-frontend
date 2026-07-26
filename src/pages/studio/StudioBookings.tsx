import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { 
  Check, DollarSign, AlertCircle
} from "lucide-react";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import { cn } from "@/lib/utils";
import { toast, Toaster } from "react-hot-toast";

const API_BASE = "http://127.0.0.1:8000/api";

function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem("app_token");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

// System status types conforming to business rules
type BookingStatus = "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed";
type PaymentStatus = "pending" | "partially_paid" | "fully_paid" | "failed" | "cancelled";

interface StudioBooking {
  id: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  event: string;
  date: string;
  startTime: string;
  location: string;
  guests?: number;
  package: string;
  isCustom: boolean;
  customDetails?: {
    baseFee: number;
    photos: { label: string; price: number };
    photographers: { label: string; price: number };
    delivery: { label: string; price: number };
    rawFiles: boolean;
    rawFilesPrice: number;
  };
  addOns?: { name: string; price: number }[];
  amount: number;
  paidAmount: number;
  paymentScheme: "Half Payment" | "Full Payment";
  specialRequests?: string;
  
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  serviceTrackerStatus: TrackingStage | "not_started";
  rejectionReason?: string;
}

/**
 * ⚠️ ASSUMPTION LAYER — the exact JSON shape of GET /photographer/bookings
 * was not available (PhotographerBookingController / Booking model / Resource
 * were not provided). This function is the ONLY place that guesses field
 * names. Once you share the real controller/resource, this is the one
 * function that needs updating — nothing else in this file should need to
 * change.
 */
function normalizeBooking(raw: any): StudioBooking {
  return {
    id: String(raw.id ?? raw.booking_id ?? ""),
    client: raw.client_name ?? raw.contact_name ?? raw.client?.name ?? "Client",
    clientEmail: raw.client_email ?? raw.contact_email ?? raw.client?.email ?? "",
    clientPhone: raw.client_phone ?? raw.contact_phone ?? raw.client?.phone ?? "",
    event: raw.event_type ?? raw.event ?? "",
    date: raw.date ?? "",
    startTime: raw.start_time ?? raw.time_range ?? "",
    location: raw.location ?? raw.event_location ?? "",
    guests: raw.guest_count ?? raw.guests ?? undefined,
    package: raw.package_name ?? raw.package?.name ?? (raw.is_custom ? "Build your own" : ""),
    isCustom: !!raw.is_custom,
    customDetails: raw.custom_details ?? undefined,
    addOns: raw.add_ons ?? raw.addOns ?? [],
    amount: Number(raw.subtotal ?? raw.amount ?? 0),
    paidAmount: Number(raw.paid_amount ?? raw.amount_paid ?? 0),
    paymentScheme: raw.payment_plan === "full" ? "Full Payment" : "Half Payment",
    specialRequests: raw.notes ?? raw.special_requests ?? "",
    bookingStatus: (raw.status ?? "pending") as BookingStatus,
    paymentStatus: (raw.payment_status ?? "pending") as PaymentStatus,
    serviceTrackerStatus: (raw.service_status ?? "not_started") as TrackingStage | "not_started",
    rejectionReason: raw.rejection_reason ?? undefined,
  };
}

type FilterTab = "All" | "Pending" | "Active" | "Completed" | "Archived";

export default function StudioBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("All");
  
  // Modal Overlays for Actions & Confirmations
  const [pendingAction, setPendingAction] = useState<{ type: "accept" | "decline"; booking: StudioBooking } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<StudioBooking | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings`, {
        headers: authHeaders(),
      });
      const data = await parseApiResponse(response);
      const list = Array.isArray(data.data) ? data.data : data.data?.data ?? [];
      setBookings(list.map(normalizeBooking));
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Unable to load bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtering Logic
  const filtered = bookings.filter((b) => {
    if (filter === "Archived") return b.bookingStatus === "rejected" || b.bookingStatus === "cancelled";
    if (b.bookingStatus === "rejected" || b.bookingStatus === "cancelled") return false;
    if (filter === "All") return true;
    if (filter === "Pending") return b.bookingStatus === "pending";
    if (filter === "Completed") return b.bookingStatus === "completed";
    return b.bookingStatus === "accepted" || b.bookingStatus === "confirmed";
  });

  // Action Handlers — now calling the real backend
  const confirmAccept = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${pendingAction.booking.id}/accept`, {
        method: "POST",
        headers: authHeaders(),
      });
      await parseApiResponse(response);
      setBookings((prev) => prev.map((b) => b.id === pendingAction.booking.id ? { ...b, bookingStatus: "accepted" } : b));
      toast.success(`Booking request accepted! Client notified to proceed with payment.`);
      setPendingAction(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to accept this booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReject = async () => {
    if (!pendingAction || !rejectionReason.trim()) {
      toast.error("A rejection reason is strictly required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${pendingAction.booking.id}/reject`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectionReason }),
      });
      await parseApiResponse(response);
      setBookings((prev) => prev.map((b) => b.id === pendingAction.booking.id ? { ...b, bookingStatus: "rejected", rejectionReason } : b));
      toast.error(`Booking declined. Reason logged and client notified.`);
      setPendingAction(null);
      setRejectionReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to reject this booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmOnsitePayment = async () => {
    if (!recordingPaymentFor || paymentAmountInput <= 0) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${recordingPaymentFor.id}/payments/onsite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: paymentAmountInput }),
      });
      await parseApiResponse(response);

      const newPaidAmount = recordingPaymentFor.paidAmount + paymentAmountInput;
      const isFullyPaid = newPaidAmount >= recordingPaymentFor.amount;

      setBookings((prev) => prev.map((b) => b.id === recordingPaymentFor.id ? { 
        ...b, 
        paidAmount: newPaidAmount,
        paymentStatus: isFullyPaid ? "fully_paid" : "partially_paid"
      } : b));
      
      toast.success(`Recorded onsite payment of ₱${paymentAmountInput.toLocaleString()}.`);
      setRecordingPaymentFor(null);
      setPaymentAmountInput(0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to record this payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // NOTE: no backend route for arbitrary "service tracker" stage updates was
  // found in api.php. This still updates local UI state only — flag this to
  // confirm whether such an endpoint exists or needs to be added.
  const handleTrackerChange = (id: string, stage: TrackingStage) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { 
      ...b, 
      serviceTrackerStatus: stage,
      bookingStatus: stage === "completed" ? "completed" : b.bookingStatus
    } : b));
    toast.success(`Service tracker updated to: ${stage.replace("_", " ")} (not yet saved to backend — no endpoint found).`);
  };

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative pb-12">
        
        {/* Header Block */}
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

        {!isLoading && loadError && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={fetchBookings}>Retry</Button>
          </div>
        )}

        {/* Bookings Collection Grid */}
        {!isLoading && !loadError && (
        <div className="space-y-4">
          {filtered.map((b) => (
            <div key={b.id} className={cn(
              "bg-card rounded-2xl card-shadow border p-5 transition-all",
              b.bookingStatus === "rejected" ? "border-border/40 opacity-80" : "border-border/50"
            )}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
                    b.bookingStatus === "rejected" ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary"
                  )}>
                    {b.client.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", b.bookingStatus === "rejected" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                      {b.client} <span className="text-xs text-muted-foreground font-mono ml-1 no-underline">{b.id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{b.event} · {b.package} · {b.date} {b.startTime}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Total / Paid</p>
                    <p className={cn("font-heading font-bold", b.bookingStatus === "rejected" ? "text-muted-foreground" : "text-primary")}>
                      ₱{b.amount.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">/ ₱{b.paidAmount.toLocaleString()}</span>
                    </p>
                  </div>

                  {/* Navigates directly to full detail page, matching Calendar page behavior */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/studio/bookings/${b.id}`)} 
                    className="text-xs font-medium"
                  >
                    View Details
                  </Button>
                </div>
              </div>

              {/* Status Indicator Bar */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                <div><span className="text-muted-foreground block">Booking:</span> <span className="font-semibold capitalize">{b.bookingStatus}</span></div>
                <div><span className="text-muted-foreground block">Payment:</span> <span className="font-semibold capitalize">{b.paymentStatus.replace('_', ' ')}</span></div>
                <div><span className="text-muted-foreground block">Service:</span> <span className="font-semibold capitalize">{b.serviceTrackerStatus.replace('_', ' ')}</span></div>
              </div>

              {b.bookingStatus === "pending" && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-900 dark:text-amber-400">Review details before responding to request.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setPendingAction({ type: "decline", booking: b })}>Decline</Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setPendingAction({ type: "accept", booking: b })}>Accept Request</Button>
                  </div>
                </div>
              )}

              {b.bookingStatus === "accepted" && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
                  Request accepted. Awaiting client online deposit payment to confirm booking.
                </div>
              )}

              {b.bookingStatus === "confirmed" && b.serviceTrackerStatus !== "not_started" && (
                <div className="space-y-4">
                  <BookingTracker currentStage={b.serviceTrackerStatus as TrackingStage} />
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Update status:</span>
                    <select
                      value={b.serviceTrackerStatus}
                      onChange={(e) => handleTrackerChange(b.id, e.target.value as TrackingStage)}
                      className="h-8 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 ring-primary"
                    >
                      {trackingStages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4 bg-card/50 rounded-2xl border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">No bookings found in the "{filter}" view.</p>
            </div>
          )}
        </div>
        )}

        {/* CONFIRMATION MODAL: Accept / Decline Action */}
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
                <Button variant="outline" onClick={() => setPendingAction(null)} disabled={isSubmitting}>Cancel</Button>
                <Button variant={pendingAction.type === 'accept' ? 'default' : 'destructive'} onClick={pendingAction.type === 'accept' ? confirmAccept : confirmReject} disabled={isSubmitting}>
                  {isSubmitting ? "Processing…" : pendingAction.type === 'accept' ? 'Confirm Acceptance' : 'Confirm Rejection'}
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
                <Button variant="outline" onClick={() => setRecordingPaymentFor(null)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={confirmOnsitePayment} disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Record Payment"}</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}