import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Camera, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { useBooking } from "@/hooks/useBookings";
import toast from "react-hot-toast";

export default function BookingReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b, isLoading } = useBooking(id);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (b?.receipt) {
      toast.success("Payment record loaded successfully.", { id: "receipt-load" });
    }
  }, [b]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading transaction record…</p>
      </div>
    );
  }

  if (!b || !b.receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Transaction record not available.</p>
          <Link to="/dashboard"><Button>Go to Bookings</Button></Link>
        </div>
      </div>
    );
  }

  const r = b.receipt;
  const receiptNo = r.receiptNo ?? r.receipt_no ?? "—";
  const refCode = r.refCode ?? r.ref_code ?? "—";
  const amountPaid = r.amountPaid ?? r.amount_paid ?? 0;
  const paidAt = r.paidAt ?? r.paid_at ?? "—";
  const verifiedAt = r.verifiedAt ?? r.verified_at ?? new Date().toISOString();
  const remainingBalance = Math.max(0, b.subtotal - amountPaid);

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Payment Confirmed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment was successfully processed and matched. Here is your transaction record from {b.photographerName}.
          </p>
        </div>

        <div ref={receiptRef} className="bg-card rounded-2xl shadow-sm border-2 border-dashed border-border p-8 font-mono text-sm space-y-3">
          <div className="text-center pb-4 border-b border-border">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-primary" />
              <p className="font-heading font-bold text-lg tracking-wider text-foreground">BULAN</p>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Official Booking Record</p>
          </div>

          <Line k="Record No." v={receiptNo} />
          <Line k="Booking ID" v={b.id} />
          <Line k="Studio/Pro" v={b.photographerName} />
          <Line k="Verified On" v={new Date(verifiedAt).toLocaleString()} />

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Customer" v={b.contactName} />
            <Line k="Email" v={b.contactEmail} />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Event Type" v={b.eventType} />
            <Line k="Date" v={b.date} />
            <Line k="Start Time" v={b.startTime} />
            <Line k="Location" v={b.eventLocation} />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k={b.packageName} v={formatPrice(b.packagePrice)} />
            {b.addOns.map((a) => <Line key={a.name} k={`+ ${a.name}`} v={formatPrice(a.price)} />)}
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Total Amount" v={formatPrice(b.subtotal)} bold />
            <div className="flex justify-between gap-3 text-primary font-bold bg-primary/5 p-1 rounded">
              <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4"/> Paid Online</span>
              <span>{formatPrice(amountPaid)}</span>
            </div>
            <Line k="Onsite Balance" v={formatPrice(remainingBalance)} bold={remainingBalance > 0} />
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
            <Line k="Reference ID" v={refCode} />
            <Line k="Paid At" v={paidAt} />
            <Line k="Payment Method" v="GCash (Direct)" />
          </div>
          
          {remainingBalance > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-xl text-[11px] text-muted-foreground text-center leading-relaxed">
              Note: A remaining balance of {formatPrice(remainingBalance)} is to be paid on-site directly to the professional.
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={() => navigate("/dashboard")} className="gap-1.5 w-full sm:w-auto" size="lg">
            Return to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string | number; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-0.5 ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span className="truncate pr-4">{k}</span>
      <span className="shrink-0 text-right text-foreground">{v}</span>
    </div>
  );
}