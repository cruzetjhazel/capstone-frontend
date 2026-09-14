import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Camera, Download, Printer, AlertCircle } from "lucide-react";
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading transaction record…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4 font-medium">Booking not found.</p>
          <Link to="/dashboard">
            <Button variant="outline">Go to Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const verifiedPayments = payments.filter((p) => !!p.verifiedAt);

  if (verifiedPayments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md bg-card p-8 rounded-2xl shadow-sm border border-border">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-base font-semibold text-foreground mb-2">No verified payment on record yet.</p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            A receipt appears here automatically once your payment reference has been matched and verified by the studio.
          </p>
          <Link to={`/booking/${booking.id}/details`}>
            <Button variant="secondary">Back to Booking</Button>
          </Link>
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

  const handlePrint = () => window.print();

  const handleDownloadText = () => {
    const lines = [
      "BULAN PHOTOGRAPHY BOOKING — OFFICIAL INVOICE",
      "----------------------------------------------",
      `Invoice ID: ${booking.id}`,
      `Provided by: ${booking.photographerName}`,
      `Verified On: ${onlinePayment.verifiedAt ? formatDate(onlinePayment.verifiedAt) : "—"}`,
      "",
      `Event Details: ${booking.eventType} | ${booking.date} at ${booking.startTime}`,
      `Location: ${booking.eventLocation}`,
      "",
      "LINE ITEMS:",
      `${booking.packageName} — ${formatPrice(booking.subtotal)}`,
      ...booking.addOns.map((a: any) => `+ ${a.name} — ${formatPrice(a.price)}`),
      "",
      `Total Amount: ${formatPrice(totalPrice)}`,
      `Paid Online: ${formatPrice(onlinePayment.amount)}`,
      ...(onsitePayment ? [`Paid Onsite: ${formatPrice(onsitePayment.amount)}`] : []),
      `Balance Due (Onsite): ${formatPrice(remainingOnsiteBalance)}`,
      "",
      `Reference No: ${onlinePayment.referenceNumber ?? "—"}`,
      `Payment Method: ${onlinePayment.method || "GCash"}`,
      `Payment Plan: ${isHalfPlan ? "Half Payment Plan" : "Full Payment"}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${booking.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Invoice Document */}
        <div className="lg:col-span-7 flex justify-center w-full">
          <div
            ref={receiptRef}
            className="w-full max-w-[500px] bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-10 font-sans"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/40 border border-border flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">BULAN</h2>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Official Invoice</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Invoice #</p>
                <p className="text-sm font-bold text-foreground">{booking.id}</p>
              </div>
            </div>

            <hr className="border-border/50 mb-6" />

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Provided by</p>
                <p className="font-semibold text-foreground">{booking.photographerName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Verified On</p>
                <p className="font-semibold text-foreground">
                  {onlinePayment.verifiedAt ? formatDate(onlinePayment.verifiedAt) : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Event Details</p>
                <p className="text-foreground capitalize font-medium">{booking.eventType}</p>
                <p className="text-muted-foreground mt-0.5">{booking.date} • {booking.startTime}</p>
                <p className="text-muted-foreground mt-0.5">{booking.eventLocation}</p>
              </div>
            </div>

            {/* Line Items Table Header */}
            <div className="flex justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              <span>Description</span>
              <span>Amount</span>
            </div>

            {/* Line Items */}
            <div className="px-3 space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">{booking.packageName}</span>
                <span className="font-medium text-foreground">{formatPrice(booking.subtotal)}</span>
              </div>
              {(booking.addOns ?? []).map((a: any) => (
                <div key={a.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">+ {a.name}</span>
                  <span className="text-muted-foreground">{formatPrice(a.price)}</span>
                </div>
              ))}
            </div>

            <hr className="border-border/50 mb-6" />

            {/* Totals Section */}
            <div className="ml-auto w-full sm:w-2/3 space-y-3 px-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Booking Amount</span>
                <span className="font-semibold text-foreground">{formatPrice(totalPrice)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Amount Paid (Online)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">- {formatPrice(onlinePayment.amount)}</span>
              </div>

              {onsitePayment && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Amount Paid (Onsite)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">- {formatPrice(onsitePayment.amount)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Balance Due (Onsite)</span>
                <span className="text-lg font-bold text-foreground">{formatPrice(remainingOnsiteBalance)}</span>
              </div>
            </div>

            {/* Footer Details Box */}
            <div className="mt-8 p-4 rounded-xl bg-muted/40 border border-border grid grid-cols-2 gap-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">Ref No: </span>
                <span className="font-medium text-foreground">{onlinePayment.referenceNumber ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Method: </span>
                <span className="font-medium text-foreground">{onlinePayment.method || "GCash"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Plan: </span>
                <span className={isFullySettled ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-amber-600 dark:text-amber-400"}>
                  {isHalfPlan ? "Half Payment — Balance Due Onsite" : "Full Payment — Fully Settled"}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Status & Action Panel */}
        <div className="lg:col-span-5 space-y-6 no-print">

          {/* Status Card */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground mb-1">Payment Confirmed</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your transaction has been securely processed and attached to this booking.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-5 border border-border/50 flex divide-x divide-border/50">
              <div className="flex-1 pr-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Amount Verified</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(onlinePayment.amount)}</p>
              </div>
              <div className="flex-1 pl-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Remaining Due</p>
                <p className="text-xl font-bold text-foreground">{formatPrice(remainingOnsiteBalance)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="w-full h-12 text-sm font-semibold justify-center gap-2 rounded-xl shadow-sm"
            >
              <Printer className="w-4 h-4 text-muted-foreground" /> Print / Save as PDF
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadText}
              className="w-full h-12 text-sm font-semibold justify-center gap-2 rounded-xl shadow-sm"
            >
              <Download className="w-4 h-4 text-muted-foreground" /> Download Receipt (.txt)
            </Button>

            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 text-sm font-semibold justify-center gap-2 rounded-xl mt-2 shadow-sm"
            >
              Return to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}