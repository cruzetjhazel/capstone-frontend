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
import toast from "react-hot-toast";
import { bookingService } from "@/services/bookingService";
import { useBooking } from "@/hooks/useBookings";
import type { BookingPaymentInfo } from "@/api/types/booking";

type PayState = "form" | "verifying" | "verified" | "mismatch";

export default function BookingPay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b, isLoading } = useBooking(id);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);

  // Form Fields
  const [refCode, setRefCode] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [state, setState] = useState<PayState>("form");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!b?.photographerId) return;
    bookingService.getStudioPaymentInfo(b.photographerId, b.dueNow)
      .then(setPaymentInfo)
      .catch(console.error);
  }, [b?.photographerId, b?.dueNow]);

  // Sync default expected amount based on booking details
  useEffect(() => {
    if (!b) return;
    setAmountPaid(String(b.dueNow));
  }, [b]);

  if (isLoading) {
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

  if (b.status !== "approved" && b.status !== "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md bg-card p-8 rounded-2xl border border-border shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Payment Unavailable</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Payment becomes available after the photographer/studio approves your booking request.
          </p>
          <Link to={`/booking/${b.id}/details`}><Button className="w-full">View Booking Details</Button></Link>
        </div>
      </div>
    );
  }

  const merchantName = paymentInfo?.merchant_name ?? b.photographerName;
  const merchantQR = paymentInfo?.merchant_qr ?? `GCASH-${b.photographerId}-${b.id}`;

  const expectedAmount = b.dueNow;
  const remainingBalance = b.subtotal - expectedAmount;

  const handleOpenConfirmation = () => {
    setIsConfirmModalOpen(true);
  };

  const submitReceipt = async () => {
    setIsConfirmModalOpen(false);
    setState("verifying");

    try {
      await bookingService.submitPayment(b.id, {
        reference_code: refCode,
        amount_paid: Number(amountPaid),
        paid_at: paidAt || undefined,
        receipt: undefined, 
      });
      
      setState("verified");
      toast.success("Payment submitted for verification! Redirecting to receipt…");
      setTimeout(() => navigate(`/booking/${b.id}/receipt`), 1200);
    } catch {
      setState("mismatch");
      toast.error("Failed to process payment verification. Please double-check details.");
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Merchant QR Info */}
          <div className="space-y-6">
            
            {/* Merchant QR Code Card */}
            <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 text-center flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Merchant / Studio</p>
              <p className="font-heading font-semibold mt-0.5 text-base text-foreground">{merchantName}</p>
              
              <div className="my-5 mx-auto w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-dashed border-primary/30 flex items-center justify-center relative group">
                <QrCode className="w-20 h-20 text-primary/80 transition-transform group-hover:scale-105" />
                <span className="absolute bottom-2.5 text-[9px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
                  {merchantQR}
                </span>
              </div>

              <div className="space-y-1 text-sm border-t border-border/40 pt-4">
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
                  <Label htmlFor="amt" className="text-xs font-medium">Amount Paid (₱) *</Label>
                  <Input 
                    id="amt" 
                    type="number" 
                    placeholder={String(expectedAmount)} 
                    value={amountPaid} 
                    onChange={(e) => setAmountPaid(e.target.value)} 
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="when" className="text-xs font-medium">Date Paid (Optional)</Label>
                  <Input 
                    id="when" 
                    type="date" 
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
                    <span>Verification failed. Please check your reference details and try again.</span>
                  </div>
                )}
                {state === "verified" && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Payment successfully submitted for verification! Redirecting to booking receipt…</span>
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
                disabled={state === "verifying" || state === "verified"}
              >
                {state === "verifying" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> 
                    Verifying Transaction…
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
                  {remainingBalance > 0 ? "50% Downpayment" : "100% Full Payment"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Amount Submitted:</span>
                <span className="font-bold text-primary font-mono">{formatPrice(Number(amountPaid))}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">GCash Reference No.:</span>
                <span className="font-mono font-semibold text-foreground">{refCode}</span>
              </div>
              {paidAt && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-medium text-foreground">{paidAt}</span>
                </div>
              )}
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