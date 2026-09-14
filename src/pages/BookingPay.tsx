import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, QrCode, ShieldCheck, Loader2, AlertCircle,
  CheckCircle2, Info, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/data/photographers";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { bookingService, type BookingPaymentInfo } from "@/services/bookingService";
import { useBooking } from "@/hooks/useBookings";

type PayState = "form" | "verifying" | "verified" | "mismatch";
type Plan = "half" | "full";

export default function BookingPay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b, isLoading: isBookingLoading } = useBooking(id);
  const { toast } = useToast();

  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Form Fields
  const [plan, setPlan] = useState<Plan>("half");
  const [payerName, setPayerName] = useState("");
  const [refCode, setRefCode] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [state, setState] = useState<PayState>("form");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoadingInfo(true);
    setInfoError(null);
    bookingService
      .getStudioPaymentInfo(id)
      .then(setPaymentInfo)
      .catch((err) => setInfoError(err instanceof Error ? err.message : "Could not load payment details."))
      .finally(() => setIsLoadingInfo(false));
  }, [id]);

  if (isBookingLoading || isLoadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading booking payment information…</span>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Booking not found.</p>
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  if (infoError || !paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md bg-card p-8 rounded-2xl border border-border shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Payment Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {infoError ?? "This photographer hasn't set up their payment details yet."}
          </p>
          <Link to={`/booking/${b.id}/details`}><Button className="w-full">View Booking Details</Button></Link>
        </div>
      </div>
    );
  }

  // A payment can only be submitted once the photographer has accepted the
  // booking and no payment is already in progress or settled (mirrors
  // SubmitPaymentAction's own checks — this is a UX gate, not the real guard).
  const canPay = paymentInfo.booking_status === "confirmed" && paymentInfo.payment_status === "pending";

  if (!canPay) {
    const reason =
      paymentInfo.payment_status === "pending_verification"
        ? "Your payment was submitted and is awaiting the photographer's review."
        : paymentInfo.payment_status === "partially_paid" || paymentInfo.payment_status === "fully_paid"
        ? "A payment has already been recorded for this booking."
        : "Payment becomes available after the photographer/studio approves your booking request.";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md bg-card p-8 rounded-2xl border border-border shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Payment Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">{reason}</p>
          <Link to={`/booking/${b.id}/details`}><Button className="w-full">View Booking Details</Button></Link>
        </div>
      </div>
    );
  }

  const merchantName = paymentInfo.gcash.account_name || b.photographerName;
  const expectedAmount = plan === "full" ? paymentInfo.amounts.full_payment_amount : paymentInfo.amounts.half_payment_amount;
  const remainingBalance = paymentInfo.amounts.total_price - expectedAmount;

  const canSubmit = refCode.trim() !== "" && payerName.trim() !== "" && paidAt !== "";

  const handleOpenConfirmation = () => {
    if (!canSubmit) {
      toast({ title: "Missing information", description: "Please fill in the payer name and GCash reference number.", variant: "destructive" as never });
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const submitReceipt = async () => {
    setIsConfirmModalOpen(false);
    setState("verifying");

    try {
      const result = await bookingService.submitPayment(b.id, {
        plan,
        amount: expectedAmount,
        reference_number: refCode.trim(),
        payer_name: payerName.trim(),
        payment_date: paidAt,
      });

      setState("verified");
      toast({ title: "Payment submitted", description: result.message });
      setTimeout(() => navigate(`/booking/${b.id}/details`), 1200);
    } catch (err) {
      setState("mismatch");
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Failed to submit payment. Please double-check details.",
        variant: "destructive" as never,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Booking ID:</span>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-foreground border border-border">
              {b.id}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-up">
        {/* Page Title & Intro */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Complete Your Payment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scan the studio QR code using your GCash app and submit your reference details for verification.
          </p>
        </div>

        {/* Plan Selector */}
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setPlan("half")}
            disabled={state === "verifying" || state === "verified"}
            className={`flex-1 text-left rounded-xl border p-4 transition-colors ${
              plan === "half" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
            }`}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">50% Downpayment</p>
            <p className="text-xl font-heading font-bold text-foreground mt-1">
              {formatPrice(paymentInfo.amounts.half_payment_amount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Remaining {formatPrice(paymentInfo.amounts.total_price - paymentInfo.amounts.half_payment_amount)} due on-site.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPlan("full")}
            disabled={state === "verifying" || state === "verified"}
            className={`flex-1 text-left rounded-xl border p-4 transition-colors ${
              plan === "full" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
            }`}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Payment</p>
            <p className="text-xl font-heading font-bold text-foreground mt-1">
              {formatPrice(paymentInfo.amounts.full_payment_amount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Nothing left to pay on-site.</p>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* LEFT COLUMN: Merchant QR Info */}
          <div className="space-y-6">

            {/* Merchant QR Code Card */}
            <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 text-center flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Merchant / Studio</p>
              <p className="font-heading font-semibold mt-0.5 text-base text-foreground">{merchantName}</p>

              <div className="my-5 mx-auto w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-dashed border-primary/30 flex items-center justify-center relative overflow-hidden group">
                {paymentInfo.gcash.qr_url ? (
                  <img
                    src={paymentInfo.gcash.qr_url}
                    alt="GCash QR code"
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-primary/80 transition-transform group-hover:scale-105" />
                )}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-3">
                <p>GCash Account Name: <span className="font-medium text-foreground">{paymentInfo.gcash.account_name}</span></p>
                <p>GCash Number: <span className="font-medium text-foreground font-mono">{paymentInfo.gcash.account_number}</span></p>
              </div>

              <div className="space-y-1 text-sm border-t border-border/40 pt-4 mt-3">
                <p className="text-xs text-muted-foreground">Amount to pay now</p>
                <p className="text-3xl font-heading font-bold text-primary">{formatPrice(expectedAmount)}</p>

                {/* On-Site Balance Reminder */}
                {remainingBalance > 0 && (
                  <div className="mt-3 mx-auto px-3.5 py-2.5 bg-muted/60 border border-border/60 rounded-xl flex items-start gap-2 text-left">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Remaining balance of <strong className="text-foreground">{formatPrice(remainingBalance)}</strong> will be settled on-site during your event.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: GCash Payment Reference Form */}
          <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-heading font-semibold flex items-center gap-2 mb-5 text-base text-foreground">
                <ShieldCheck className="w-5 h-5 text-primary" /> Enter GCash Reference Details
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payer" className="text-xs font-medium">Payer's Full Name (as shown in GCash) *</Label>
                  <Input
                    id="payer"
                    placeholder="e.g. Juan Dela Cruz"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ref" className="text-xs font-medium">GCash Reference No. *</Label>
                  <Input
                    id="ref"
                    placeholder="e.g. 100293847592"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amt" className="text-xs font-medium">Amount Paid (₱)</Label>
                  <Input
                    id="amt"
                    type="text"
                    value={formatPrice(expectedAmount)}
                    readOnly
                    className="font-mono text-sm bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Fixed to your selected plan — this must match what you send in GCash exactly.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="when" className="text-xs font-medium">Date Paid *</Label>
                  <Input
                    id="when"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Alert Banner / Verification Result */}
              <div className="mt-5 space-y-2">
                {state === "mismatch" && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-2 text-xs text-destructive animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Submission failed. Please check your reference details and try again.</span>
                  </div>
                )}
                {state === "verified" && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Payment submitted! Redirecting to your booking…</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 space-y-4">
              {/* Security Warning Notice */}
              <div className="flex items-start gap-2.5 bg-muted/40 p-3.5 rounded-xl border border-border/40">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  By submitting this form, you confirm that the GCash payment reference information provided is accurate. False submissions may result in booking cancellation.
                </p>
              </div>

              {/* Auto-verification button */}
              <Button
                className="w-full h-11 text-sm font-semibold"
                size="lg"
                onClick={handleOpenConfirmation}
                disabled={state === "verifying" || state === "verified" || !canSubmit}
              >
                {state === "verifying" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting…
                  </>
                ) : (
                  "Submit Payment for Verification"
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-base">Submit Payment Details</h3>
                <p className="text-xs text-muted-foreground">Please review your transaction details before proceeding.</p>
              </div>
            </div>

            {/* Summary Details */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Payment Type:</span>
                <span className="font-medium text-foreground">
                  {plan === "half" ? "50% Downpayment" : "100% Full Payment"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Amount Submitted:</span>
                <span className="font-bold text-primary font-mono">{formatPrice(expectedAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Payer Name:</span>
                <span className="font-medium text-foreground">{payerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">GCash Reference No.:</span>
                <span className="font-mono font-semibold text-foreground">{refCode}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-medium text-foreground">{paidAt}</span>
              </div>
            </div>

            {remainingBalance > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Reminder: The remaining balance of <strong>{formatPrice(remainingBalance)}</strong> is to be paid on-site directly to the photographer/studio.
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={submitReceipt}
              >
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
