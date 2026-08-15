import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Camera, CreditCard, Download, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/useBookings";
import { usePaymentsForBooking } from "@/hooks/useClientPayments";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function BookingReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading: loadingBooking } = useBooking(id);
  const { data: payments = [], isLoading: loadingPayments } = usePaymentsForBooking(id);
  const receiptRef = useRef<HTMLDivElement>(null);

  const isLoading = loadingBooking || loadingPayments;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading transaction record…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Booking not found.</p>
          <Link to="/dashboard"><Button>Go to Bookings</Button></Link>
        </div>
      </div>
    );
  }

  // Only payments the backend has actually verified/matched count as "paid"
  // for receipt purposes — a submitted-but-unverified GCash reference isn't
  // a completed transaction yet.
  const verifiedPayments = payments.filter((p) => !!p.verifiedAt);

  if (verifiedPayments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No verified payment on record yet for this booking.</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            A receipt appears here automatically once your payment reference has been matched and verified.
          </p>
          <Link to={`/booking/${booking.id}/details`}><Button variant="outline">Back to Booking</Button></Link>
        </div>
      </div>
    );
  }

  const onlinePayment = verifiedPayments.find((p) => p.type !== "onsite") ?? verifiedPayments[0];
  const onsitePayment = verifiedPayments.find((p) => p.type === "onsite") ?? null;

  const totalPrice = (booking as any).totalPrice ?? booking.subtotal;
  const isHalfPlan = onlinePayment.plan === "half";
  const totalPaidSoFar = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingOnsiteBalance = Math.max(0, totalPrice - totalPaidSoFar);
  const isFullySettled = remainingOnsiteBalance <= 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const lines = [
      "BULAN PHOTOGRAPHY BOOKING — OFFICIAL RECEIPT",
      "----------------------------------------------",
      `Booking ID: ${booking.id}`,
      `Photographer: ${booking.photographerName}`,
      `Event: ${booking.eventType}`,
      `Date: ${booking.date}`,
      `Time: ${booking.startTime}`,
      `Location: ${booking.eventLocation}`,
      "",
      `Package: ${booking.packageName} — ${formatPrice(booking.subtotal)}`,
      ...booking.addOns.map((a: any) => `  + ${a.name} — ${formatPrice(a.price)}`),
      `Total Booking Amount: ${formatPrice(totalPrice)}`,
      "",
      `Payment Plan: ${isHalfPlan ? "Half Payment" : "Full Payment"}`,
      `Online Payment: ${formatPrice(onlinePayment.amount)} (Ref: ${onlinePayment.referenceNumber ?? "—"}, verified ${onlinePayment.verifiedAt ? new Date(onlinePayment.verifiedAt).toLocaleString() : "—"})`,
      ...(onsitePayment ? [`Onsite Payment: ${formatPrice(onsitePayment.amount)} (recorded ${new Date(onsitePayment.createdAt).toLocaleString()})`] : []),
      "",
      isFullySettled
        ? "Status: FULLY PAID"
        : `Status: HALF PAID — Remaining balance of ${formatPrice(remainingOnsiteBalance)} due onsite`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${booking.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        <div className="text-center no-print">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Payment Confirmed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here is your transaction record from {booking.photographerName}.
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

          <Line k="Booking ID" v={booking.id} />
          <Line k="Studio/Pro" v={booking.photographerName} />
          <Line k="Verified On" v={onlinePayment.verifiedAt ? new Date(onlinePayment.verifiedAt).toLocaleString() : "—"} />

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Event Type" v={booking.eventType} />
            <Line k="Date" v={booking.date} />
            <Line k="Start Time" v={booking.startTime} />
            <Line k="Location" v={booking.eventLocation} />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k={booking.packageName} v={formatPrice(booking.subtotal)} />
            {(booking.addOns ?? []).map((a: any) => <Line key={a.name} k={`+ ${a.name}`} v={formatPrice(a.price)} />)}
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Total Booking Amount" v={formatPrice(totalPrice)} bold />
            <div className="flex justify-between gap-3 text-primary font-bold bg-primary/5 p-1 rounded">
              <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4"/> Paid Online</span>
              <span>{formatPrice(onlinePayment.amount)}</span>
            </div>
            {onsitePayment && (
              <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/5 p-1 rounded">
                <span>Paid Onsite</span>
                <span>{formatPrice(onsitePayment.amount)}</span>
              </div>
            )}
            <Line
              k={isFullySettled ? "Balance" : "Remaining Balance (Due Onsite)"}
              v={formatPrice(remainingOnsiteBalance)}
              bold={!isFullySettled}
            />
          </div>

          <div className="border-t border-border pt-3">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
              isFullySettled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            }`}>
              {isHalfPlan ? "Half Payment Plan" : "Full Payment Plan"} — {isFullySettled ? "Fully Paid" : "Balance Due Onsite"}
            </span>
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
            <Line k="Reference No." v={onlinePayment.referenceNumber ?? "—"} />
            <Line k="Payment Date" v={onlinePayment.paymentDate} />
            <Line k="Payment Method" v={onlinePayment.method || "GCash"} />
          </div>

          {!isFullySettled && (
            <div className="mt-4 p-3 bg-muted rounded-xl text-[11px] text-muted-foreground text-center leading-relaxed">
              Note: A remaining balance of {formatPrice(remainingOnsiteBalance)} is to be paid on-site directly to the professional.
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2 no-print">
          <Button variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadText} className="gap-1.5">
            <Download className="w-4 h-4" /> Download (.txt)
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="gap-1.5">
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