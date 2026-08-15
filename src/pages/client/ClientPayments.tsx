import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { useClientPayments } from "@/hooks/useClientPayments";
import { Button } from "@/components/ui/button";
import {
  Wallet, CheckCircle2, AlertCircle, ArrowRight,
  Receipt
} from "lucide-react";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function ClientPayments() {
  const { user } = useRole();
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email);
  const { data: payments = [], isLoading: loadingPayments } = useClientPayments();

  const isLoading = loadingBookings || loadingPayments;

  // booking.dueNow IS the remaining balance owed (confirmed against
  // bookingService.ts's mapping from raw.remaining_balance).
  const pendingPayments = bookings.filter(
    (b: any) => b.status === "accepted" && b.dueNow > 0
  );

  const verifiedPayments = payments.filter((p) => !!p.verifiedAt);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">

        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> My Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your outstanding balances and view your payment history.
          </p>
        </div>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
          </h2>

          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading pending payments...</p>
          ) : pendingPayments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
              <p>You have no pending payments right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingPayments.map((booking: any) => (
                <div key={booking.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{booking.photographerName}</h3>
                    <p className="text-sm text-muted-foreground">Booking ID: {booking.id} &bull; {booking.packageName}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                      Payment Required to Confirm
                    </span>
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 text-left sm:text-right">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount Due</p>
                      <p className="font-bold text-amber-600 dark:text-amber-400 text-lg">{formatPrice(booking.dueNow)}</p>
                    </div>
                    <Link to={`/booking/${booking.id}/pay`}>
                      <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">
                        Pay Now <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" /> Payment History
          </h2>

          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
          ) : verifiedPayments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <p>No completed payments yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
              {verifiedPayments.map((payment) => {
                const booking = bookings.find((b: any) => String(b.id) === payment.bookingId);
                return (
                  <div key={payment.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <h3 className="font-semibold text-sm">{booking?.photographerName ?? `Booking ${payment.bookingId}`}</h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        Booking ID: {payment.bookingId} &bull; {payment.paymentDate}
                      </p>
                      {payment.referenceNumber && (
                        <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 inline-block px-1.5 py-0.5 rounded">
                          Ref: {payment.referenceNumber}
                        </p>
                      )}
                    </div>

                    <div className="text-left sm:text-right flex flex-col sm:items-end gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-sm font-bold text-green-600">{formatPrice(payment.amount)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase">
                          {payment.plan === "half" ? "Half Payment" : payment.plan === "full" ? "Full Payment" : payment.type}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 uppercase">
                          Verified
                        </span>
                      </div>

                      <Link to={`/booking/${payment.bookingId}/receipt`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7">
                          <Receipt className="w-3 h-3" /> View Receipt
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}