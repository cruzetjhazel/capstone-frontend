import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Download, ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { useBooking } from "@/hooks/useBookings";

export default function BookingReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b, isLoading } = useBooking(id);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading receipt…</p>
      </div>
    );
  }

  if (!b || !b.receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Receipt not available.</p>
          <Link to="/dashboard"><Button>Go to Bookings</Button></Link>
        </div>
      </div>
    );
  }

  const r = b.receipt;
  const receiptNo = r.receiptNo ?? r.receipt_no ?? "—";
  const refCode = r.refCode ?? r.ref_code ?? "—";
  const amountPaid = r.amountPaid ?? r.amount_paid ?? 0;
  const senderName = r.senderName ?? r.sender_name ?? "—";
  const paidAt = r.paidAt ?? r.paid_at ?? "—";
  const verifiedAt = r.verifiedAt ?? r.verified_at ?? new Date().toISOString();

  const downloadReceipt = () => {
    const txt = `BULAN OFFICIAL RECEIPT
=============================
Receipt No: ${receiptNo}
Booking ID: ${b.id}
Issued by : ${b.photographerName}
Verified  : ${new Date(verifiedAt).toLocaleString()}

Customer  : ${b.contactName}
Email     : ${b.contactEmail}

Event     : ${b.eventType}
Date      : ${b.date}
Start time: ${b.startTime}
Location  : ${b.eventLocation}

Package   : ${b.packageName} — ${formatPrice(b.packagePrice)}
${b.addOns.map((a) => `+ ${a.name} — ${formatPrice(a.price)}`).join("\n")}

Total     : ${formatPrice(b.subtotal)}
Paid Now  : ${formatPrice(amountPaid)}
Balance   : ${formatPrice(Math.max(0, b.subtotal - amountPaid))}

GCash Ref : ${refCode}
Sender    : ${senderName}
Paid At   : ${paidAt}
=============================
Thank you for booking with Bulan!`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${receiptNo}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Payment Verified</h1>
          <p className="text-sm text-muted-foreground mt-1">Your payment matched the GCash QR — here is your official receipt from {b.photographerName}.</p>
        </div>

        <div ref={receiptRef} className="bg-card rounded-2xl card-shadow border-2 border-dashed border-border p-8 font-mono text-sm space-y-3">
          <div className="text-center pb-4 border-b border-border">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-primary" />
              <p className="font-heading font-bold text-lg tracking-wider">BULAN</p>
            </div>
            <p className="text-xs text-muted-foreground">Official Booking Receipt</p>
          </div>

          <Line k="Receipt No." v={receiptNo} />
          <Line k="Booking ID" v={b.id} />
          <Line k="Issued by" v={b.photographerName} />
          <Line k="Verified" v={new Date(verifiedAt).toLocaleString()} />

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Customer" v={b.contactName} />
            <Line k="Email" v={b.contactEmail} />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Event" v={b.eventType} />
            <Line k="Date" v={b.date} />
            <Line k="Start" v={b.startTime} />
            <Line k="Location" v={b.eventLocation} />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k={b.packageName} v={formatPrice(b.packagePrice)} />
            {b.addOns.map((a) => <Line key={a.name} k={`+ ${a.name}`} v={formatPrice(a.price)} />)}
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <Line k="Total" v={formatPrice(b.subtotal)} bold />
            <Line k="Paid (GCash)" v={formatPrice(amountPaid)} bold />
            <Line k="Balance" v={formatPrice(Math.max(0, b.subtotal - amountPaid))} />
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
            <Line k="GCash Ref" v={refCode} />
            <Line k="Sender" v={senderName} />
            <Line k="Paid At" v={paidAt} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={downloadReceipt} className="gap-1.5">
            <Download className="w-4 h-4" /> Download Receipt
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="gap-1.5">
            Go to Bookings <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-semibold text-foreground" : ""}`}>
      <span>{k}</span><span>{v}</span>
    </div>
  );
}
