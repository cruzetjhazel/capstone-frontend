import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, QrCode, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/data/photographers";
import { useToast } from "@/hooks/use-toast";
import { bookingService } from "@/services/bookingService";
import { useBooking } from "@/hooks/useBookings";
import type { BookingPaymentInfo } from "@/api/types/booking";

type PayState = "form" | "scanning" | "verified" | "mismatch";

export default function BookingPay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: b, isLoading } = useBooking(id);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);

  const [refCode, setRefCode] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [senderName, setSenderName] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [state, setState] = useState<PayState>("form");

  useEffect(() => {
    if (!b?.photographerId) return;
    bookingService.getStudioPaymentInfo(b.photographerId, b.dueNow)
      .then(setPaymentInfo)
      .catch(console.error);
  }, [b?.photographerId, b?.dueNow]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading payment…</p>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
        <div className="text-center max-w-md">
          <p className="text-sm text-muted-foreground mb-3">
            Payment is available after the studio approves your booking request.
          </p>
          <Link to={`/booking/${b.id}/details`}><Button>View Booking Details</Button></Link>
        </div>
      </div>
    );
  }

  const merchantName = paymentInfo?.merchant_name ?? b.photographerName;
  const merchantQR = paymentInfo?.merchant_qr ?? `GCASH-${b.photographerId}-${b.id}`;
  const expectedAmount = b.dueNow;

  const submitReceipt = async () => {
    if (!refCode.trim() || !amountPaid || !senderName.trim() || !paidAt || !receiptFile) {
      toast({ title: "Missing details", description: "Please fill all fields and upload the GCash receipt." });
      return;
    }
    setState("scanning");
    try {
      const amtOk = Number(amountPaid) >= expectedAmount;
      const refOk = /^[0-9]{10,14}$/.test(refCode.replace(/\s/g, ""));
      if (!amtOk || !refOk) {
        setState("mismatch");
        return;
      }
      await bookingService.submitPayment(b.id, {
        reference_code: refCode,
        amount_paid: Number(amountPaid),
        sender_name: senderName,
        paid_at: paidAt,
        receipt: receiptFile,
      });
      setState("verified");
      setTimeout(() => navigate(`/booking/${b.id}/receipt`), 1200);
    } catch {
      setState("mismatch");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-mono text-xs text-muted-foreground">{b.id}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Pay Balance via GCash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scan the QR below using your GCash app, then submit your reference details for auto-verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pay to</p>
            <p className="font-heading font-semibold mt-1">{merchantName}</p>
            <div className="my-4 mx-auto w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-dashed border-primary/30 flex items-center justify-center relative">
              <QrCode className="w-24 h-24 text-primary/70" />
              <span className="absolute bottom-2 text-[10px] font-mono text-muted-foreground">{merchantQR}</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Amount due</p>
              <p className="text-3xl font-heading font-bold text-primary">{formatPrice(expectedAmount)}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-4">
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Confirm Your Payment
            </h3>
            <div className="space-y-2">
              <Label htmlFor="ref">GCash Reference No. *</Label>
              <Input id="ref" placeholder="e.g. 1234567890123" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amt">Amount Paid (₱) *</Label>
              <Input id="amt" type="number" placeholder={String(expectedAmount)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Sender Name (as in GCash) *</Label>
              <Input id="sender" placeholder="Juan D." value={senderName} onChange={(e) => setSenderName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">Date Paid *</Label>
              <Input id="when" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Upload GCash receipt *</Label>
              <Input id="file" type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            </div>

            {state === "mismatch" && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>Verification failed — amount or reference doesn't match. Double-check and try again.</span>
              </div>
            )}
            {state === "verified" && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>Payment verified! Loading your receipt…</span>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={submitReceipt} disabled={state === "scanning" || state === "verified"}>
              {state === "scanning" ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>) : "Submit & Auto-Verify"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
