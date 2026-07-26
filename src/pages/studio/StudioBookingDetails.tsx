import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import { 
  ArrowLeft, Calendar, User, Package, Mail, 
  FileText, AlertTriangle, Loader2, Phone, 
  Wand2, Check, Camera, MapPin, Zap, Users, 
  CreditCard, X, DollarSign, Clock, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRole } from "@/contexts/RoleContext";

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

// System status types
type BookingStatus = "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed";
type PaymentStatus = "pending" | "partially_paid" | "fully_paid" | "failed" | "cancelled";

interface BookingRecord {
  id: string;
  client: string;
  phone: string;
  email: string;
  event: string;
  location: string;
  address: string;
  guests: number;
  specialRequests: string;
  date: string;
  time: string;
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
  addOns: Array<{ name: string; price: number }>;
  amount: number;
  paidAmount: number;
  paymentScheme: "Half Payment" | "Full Payment";
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  serviceTrackerStage: TrackingStage;
}

/**
 * ⚠️ ASSUMPTION LAYER — PhotographerBookingController / Booking model / its
 * Resource were not provided, so these field-name mappings are a best guess,
 * not confirmed. This is the ONLY function that needs correcting once you
 * share those backend files — nothing else in this component should need
 * to change.
 */
function normalizeBooking(raw: any): BookingRecord {
  return {
    id: String(raw.id ?? raw.booking_id ?? ""),
    client: raw.client_name ?? raw.contact_name ?? raw.client?.name ?? "Client",
    phone: raw.client_phone ?? raw.contact_phone ?? raw.client?.phone ?? "",
    email: raw.client_email ?? raw.contact_email ?? raw.client?.email ?? "",
    event: raw.event_type ?? raw.event ?? "",
    location: raw.location ?? raw.event_location ?? "",
    address: raw.address ?? raw.full_address ?? raw.event_location ?? "",
    guests: Number(raw.guest_count ?? raw.guests ?? 0),
    specialRequests: raw.notes ?? raw.special_requests ?? "",
    date: raw.date ?? "",
    time: raw.time_range ?? raw.start_time ?? "",
    package: raw.package_name ?? raw.package?.name ?? (raw.is_custom ? "Build your own" : ""),
    isCustom: !!raw.is_custom,
    customDetails: raw.custom_details ?? undefined,
    addOns: raw.add_ons ?? raw.addOns ?? [],
    amount: Number(raw.subtotal ?? raw.amount ?? 0),
    paidAmount: Number(raw.paid_amount ?? raw.amount_paid ?? 0),
    paymentScheme: raw.payment_plan === "full" ? "Full Payment" : "Half Payment",
    bookingStatus: (raw.status ?? "pending") as BookingStatus,
    paymentStatus: (raw.payment_status ?? "pending") as PaymentStatus,
    serviceTrackerStage: (raw.service_status ?? trackingStages[0]?.id ?? "booking_confirmed") as TrackingStage,
  };
}

export default function StudioBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useRole();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal control state
  const [activeModal, setActiveModal] = useState<"accept" | "reject" | "record_onsite" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [onsitePaymentInput, setOnsitePaymentInput] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBooking = async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${id}`, {
        headers: authHeaders(),
      });
      const data = await parseApiResponse(response);
      setBooking(normalizeBooking(data.data ?? data));
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Unable to load this booking.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  if (loadError || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Unable to load booking</h2>
        <p className="text-muted-foreground text-sm">{loadError || "This booking could not be found."}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <Button onClick={fetchBooking}>Retry</Button>
        </div>
      </div>
    );
  }

  // Calculations
  const remainingBalance = booking.amount - booking.paidAmount;

  // Handler: Accept Booking Request
  const handleConfirmAccept = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${booking.id}/accept`, {
        method: "POST",
        headers: authHeaders(),
      });
      await parseApiResponse(response);
      setBooking((prev) => prev && ({ ...prev, bookingStatus: "accepted" }));
      setActiveModal(null);
      toast.success("Booking request accepted! Client has been notified to proceed with payment.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to accept this booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Reject Booking Request
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting the booking request.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${booking.id}/reject`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: rejectionReason }),
      });
      await parseApiResponse(response);
      setBooking((prev) => prev && ({ ...prev, bookingStatus: "rejected" }));
      setActiveModal(null);
      toast.error(`Booking request rejected. Reason logged.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to reject this booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Record Onsite Balance Payment
  const handleConfirmOnsitePayment = async () => {
    const amountToRecord = onsitePaymentInput > 0 ? onsitePaymentInput : remainingBalance;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/photographer/bookings/${booking.id}/payments/onsite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: amountToRecord }),
      });
      await parseApiResponse(response);

      const newPaidAmount = booking.paidAmount + amountToRecord;
      const isFullyPaid = newPaidAmount >= booking.amount;

      setBooking((prev) => prev && ({
        ...prev,
        paidAmount: newPaidAmount,
        paymentStatus: isFullyPaid ? "fully_paid" : "partially_paid"
      }));
      setActiveModal(null);
      toast.success(`Recorded onsite payment of ₱${amountToRecord.toLocaleString()}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to record this payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Advance Service Tracker Stage
  // ⚠️ No matching route was found in api.php for updating a booking's
  // service-tracker stage. Left as local-only UI state, same as
  // StudioBookings.tsx — confirm whether this endpoint exists or needs adding.
  const handleTrackerStageChange = (newStage: TrackingStage) => {
    setBooking((prev) => prev && ({
      ...prev,
      serviceTrackerStage: newStage,
      bookingStatus: newStage === "completed" ? "completed" : prev.bookingStatus
    }));
    toast.success(`Service tracker updated to: ${newStage.replace("_", " ")} (not yet saved to backend — no endpoint found).`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-12">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back to Calendar
          </Button>
          <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded border border-border">
            Booking ID: {booking.id}
          </span>
        </div>

        {/* Main Booking Content Card */}
        <div className="bg-card rounded-xl border border-border/60 p-6 sm:p-8 card-shadow space-y-8">
          
          {/* Header Title & Pricing Overview */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-heading font-bold">{booking.event}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Client: <strong>{booking.client}</strong></p>
            </div>
            
            <div className="text-right bg-muted/40 px-4 py-2.5 rounded-xl border border-border/50">
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">Total Contract Price</span>
              <span className="text-2xl font-heading font-bold text-primary">₱{booking.amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Core System Status Overview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Booking Status</span>
              <span className={`font-bold capitalize inline-flex items-center gap-1 ${
                booking.bookingStatus === 'confirmed' ? 'text-emerald-600 dark:text-emerald-400' :
                booking.bookingStatus === 'pending' ? 'text-amber-600 dark:text-amber-400' :
                booking.bookingStatus === 'rejected' ? 'text-destructive' : 'text-blue-600'
              }`}>
                ● {booking.bookingStatus}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Payment Status</span>
              <span className={`font-bold capitalize inline-flex items-center gap-1 ${
                booking.paymentStatus === 'fully_paid' ? 'text-emerald-600 dark:text-emerald-400' :
                booking.paymentStatus === 'partially_paid' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                ● {booking.paymentStatus.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-0.5">Payment Plan</span>
              <span className="font-bold text-foreground">{booking.paymentScheme}</span>
            </div>
          </div>

          {/* Dynamic Workflow Actions Bar */}
          {booking.bookingStatus === "pending" && (
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
          )}

          {booking.bookingStatus === "accepted" && (
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3 text-blue-800 dark:text-blue-300 text-sm">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Request accepted. Awaiting client online deposit payment to confirm booking.</span>
            </div>
          )}

          {(booking.bookingStatus === "confirmed" || booking.bookingStatus === "completed") && (
            <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                  <Check className="w-5 h-5" /> Booking Confirmed & Active
                </div>
                {remainingBalance > 0 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-background gap-1.5" onClick={() => {
                    setOnsitePaymentInput(remainingBalance);
                    setActiveModal("record_onsite");
                  }}>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Record Onsite Payment
                  </Button>
                )}
              </div>

              {/* Service Tracker Progress Integration */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800/80 dark:text-emerald-400/80 uppercase tracking-wider">Update Service Tracker Stage</span>
                  <select
                    value={booking.serviceTrackerStage}
                    onChange={(e) => handleTrackerStageChange(e.target.value as TrackingStage)}
                    className="h-8 rounded-md border border-emerald-500/30 bg-background px-3 text-xs font-medium focus:ring-1 ring-primary cursor-pointer shadow-sm"
                  >
                    {trackingStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <BookingTracker currentStage={booking.serviceTrackerStage} />
              </div>
            </div>
          )}

          {/* SECTION 1: Event & Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
              Event & Client Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Event Details */}
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
                  <span className="col-span-2 font-medium">{booking.time}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="col-span-2 font-medium">{booking.location}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="col-span-2 font-medium flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" /> {booking.address}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Est. Guests:</span>
                  <span className="col-span-2 font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-primary" /> {booking.guests} Guests
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 p-4 bg-muted/20 border border-border/30 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-primary"/> Client Contact
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="col-span-2 font-medium">{booking.client}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="col-span-2 font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {booking.phone}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="col-span-2 font-medium flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-primary" /> {booking.email}
                  </span>
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
              {/* Dynamic / Fixed Package Details */}
              {booking.isCustom && booking.customDetails ? (
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="flex items-center gap-2 text-primary">
                      <Wand2 className="w-4 h-4" /> Customized Package Breakdown
                    </span>
                  </div>
                  <div className="pl-6 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Base Service Fee</span>
                      <span className="font-medium">₱{booking.customDetails.baseFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" /> {booking.customDetails.photos.label}
                      </span>
                      <span className="font-medium">+ ₱{booking.customDetails.photos.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" /> {booking.customDetails.photographers.label}
                      </span>
                      <span className="font-medium">+ ₱{booking.customDetails.photographers.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Delivery: {booking.customDetails.delivery.label}
                      </span>
                      <span className="font-medium">+ ₱{booking.customDetails.delivery.price.toLocaleString()}</span>
                    </div>
                    {booking.customDetails.rawFiles && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Raw Files Included
                        </span>
                        <span className="font-medium">+ ₱{booking.customDetails.rawFilesPrice.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm pb-4 border-b border-border/50">
                  <span className="text-foreground font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> {booking.package} (Fixed Package)
                  </span>
                  <span className="font-bold">₱{booking.amount.toLocaleString()}</span>
                </div>
              )}

              {/* Selected Add-ons List */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" /> Selected Add-ons
                </p>
                {booking.addOns && booking.addOns.length > 0 ? (
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

          {/* SECTION 3: Payment Summary & Onsite Balance */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" /> Payment Summary & Balance
            </h3>
            
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-sm font-semibold text-foreground">Selected Plan: {booking.paymentScheme}</span>
                  <p className="text-xs text-muted-foreground">
                    {booking.paymentScheme === "Half Payment" 
                      ? "50% paid online upfront, remaining balance to be settled on-site." 
                      : "100% full payment collected online."}
                  </p>
                </div>
                <span className="px-3 py-1 bg-background border border-border rounded-full text-xs font-bold text-primary self-start sm:self-auto">
                  Total: ₱{booking.amount.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-primary/10 pt-4">
                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Total Booking Amount</span>
                  <span className="font-bold text-sm text-foreground">₱{booking.amount.toLocaleString()}</span>
                </div>

                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Total Paid To Date</span>
                  <span className="font-bold text-sm text-emerald-600">₱{booking.paidAmount.toLocaleString()}</span>
                </div>

                <div className="bg-background/80 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block mb-1">Remaining Balance</span>
                  <span className={`font-bold text-sm ${remainingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    ₱{remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CONFIRMATION MODAL 1: Accept Booking Request */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Accepting this request will notify <strong>{booking.client}</strong> to proceed with their deposit payment. The time slot will be reserved.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmAccept} disabled={isSubmitting}>
                {isSubmitting ? "Processing…" : "Yes, Accept Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 2: Reject Booking Request */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
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
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmReject} disabled={isSubmitting}>
                {isSubmitting ? "Processing…" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 3: Record Onsite Payment */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1 border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Balance Due:</span>
                  <span className="font-bold text-amber-600">₱{remainingBalance.toLocaleString()}</span>
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
              <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isSubmitting}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleConfirmOnsitePayment} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}