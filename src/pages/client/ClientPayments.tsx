import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { useClientPayments } from "@/hooks/useClientPayments";
import { Button } from "@/components/ui/button";
import { PaymentTrail } from "@/components/PaymentTrail";
import { Pagination, PillTabs, usePagination } from "@/components/ListPagination";
import {
  Wallet, CheckCircle2, AlertCircle, ArrowRight,
  Receipt, Clock
} from "lucide-react";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

const ACTIVE_PAGE_SIZE = 5;
const HISTORY_PAGE_SIZE = 6;

type PaymentsTab = "active" | "history";

export default function ClientPayments() {
  const { user } = useRole();
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email);
  const { data: payments = [], isLoading: loadingPayments } = useClientPayments();
  const [tab, setTab] = useState<PaymentsTab>("active");

  const isLoading = loadingBookings || loadingPayments;

  // booking.dueNow IS the remaining balance owed (confirmed against
  // bookingService.ts's mapping from raw.remaining_balance).
  const isActiveBooking = (b: any) => ["accepted", "confirmed"].includes(b.status);

  // Unpaid: the client can still pay online (BookingPay only opens for payment_status "pending").
  const pendingPayments = bookings.filter(
    (b: any) => isActiveBooking(b) && b.paymentStatus === "pending" && b.dueNow > 0
  );

  // Half paid online: the remainder is collected on-site, so no Pay Now button.
  const onsiteBalances = bookings.filter(
    (b: any) => isActiveBooking(b) && b.paymentStatus === "partially_paid" && b.dueNow > 0
  );

  // Only genuinely verified payments belong in History. Rejected payments also
  // carry a verifiedAt (an admin acted on them), so filter on matchingStatus.
  const verifiedPayments = payments.filter((p) =>
    ["matched", "manually_verified"].includes(p.matchingStatus)
  );

  // Submitted but not yet verified, plus rejected ones the client must resubmit.
  const awaitingPayments = payments.filter((p) =>
    ["pending_match", "not_matched", "rejected"].includes(p.matchingStatus)
  );

  // Each list is paginated independently; only the slice is rendered.
  const pendingPager = usePagination(pendingPayments, ACTIVE_PAGE_SIZE);
  const awaitingPager = usePagination(awaitingPayments, ACTIVE_PAGE_SIZE);
  const onsitePager = usePagination(onsiteBalances, ACTIVE_PAGE_SIZE);
  const historyPager = usePagination(verifiedPayments, HISTORY_PAGE_SIZE);

  const activeCount = pendingPayments.length + awaitingPayments.length + onsiteBalances.length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-up">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" /> My Payments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your outstanding balances and view your payment history.
            </p>
          </div>
          <PillTabs<PaymentsTab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "active", label: "Active", count: isLoading ? undefined : activeCount },
              { key: "history", label: "History", count: isLoading ? undefined : verifiedPayments.length },
            ]}
          />
        </div>

        {tab === "active" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-base font-heading font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
              </h2>

              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading pending payments...</p>
              ) : pendingPayments.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-5 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-sm">You have no pending payments right now.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingPager.pageItems.map((booking: any) => (
                    <div key={booking.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{booking.photographerName}</h3>
                        <p className="text-xs text-muted-foreground">Booking ID: {booking.id} &bull; {booking.packageName}</p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                          {booking.awaitingOfferAcceptance ? "Accept the Offer to Pay" : "Payment Required to Confirm"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount Due</p>
                          <p className="font-bold text-amber-600 dark:text-amber-400 text-base leading-tight">{formatPrice(booking.dueNow)}</p>
                        </div>
                        <Link to={booking.awaitingOfferAcceptance ? `/booking/${booking.id}/details` : `/booking/${booking.id}/pay`}>
                          <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                            {booking.awaitingOfferAcceptance ? "Review Offer" : "Pay Now"} <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  <Pagination pagination={pendingPager} />
                </div>
              )}
            </section>

            {!isLoading && awaitingPayments.length > 0 && (
              <section>
                <h2 className="text-base font-heading font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Pending & Rejected Submissions
                </h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
                  {awaitingPager.pageItems.map((payment) => {
                    const booking = bookings.find((b: any) => String(b.id) === payment.bookingId);
                    const rejected = payment.matchingStatus === "rejected";
                    return (
                      <div key={payment.id} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{booking?.photographerName ?? `Booking ${payment.bookingId}`}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            Booking ID: {payment.bookingId} &bull; {payment.paymentDate}
                          </p>
                          {payment.referenceNumber && (
                            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 inline-block px-1.5 py-0.5 rounded">
                              Ref: {payment.referenceNumber}
                            </p>
                          )}
                          <PaymentTrail payment={payment} />
                          {rejected && payment.verificationNotes && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{payment.verificationNotes}</p>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                          <div className="sm:text-right">
                            <p className="text-[10px] text-muted-foreground">Amount</p>
                            <p className="text-sm font-bold leading-tight">{formatPrice(payment.amount)}</p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                              rejected
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {rejected
                              ? "Rejected - Resubmit"
                              : payment.matchingStatus === "not_matched"
                              ? "Awaiting Photographer Confirmation"
                              : "Awaiting Verification"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination pagination={awaitingPager} className="mt-2" />
              </section>
            )}

            {!isLoading && onsiteBalances.length > 0 && (
              <section>
                <h2 className="text-base font-heading font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-500" /> Balance Due On-site
                </h2>
                <div className="space-y-2.5">
                  {onsitePager.pageItems.map((booking: any) => (
                    <div key={booking.id} className="bg-card border border-border rounded-xl p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{booking.photographerName}</h3>
                        <p className="text-xs text-muted-foreground">Booking ID: {booking.id} &bull; {booking.packageName}</p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                          Pay on event day
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining Balance</p>
                          <p className="font-bold text-base leading-tight">{formatPrice(booking.dueNow)}</p>
                        </div>
                        <Link to={`/booking/${booking.id}/details`}>
                          <Button variant="outline" size="sm">View Booking</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  <Pagination pagination={onsitePager} />
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "history" && (
          <section>
            <h2 className="text-base font-heading font-semibold mb-3 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-muted-foreground" /> Payment History
            </h2>

            {isLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
            ) : verifiedPayments.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
                <p className="text-sm">No completed payments yet.</p>
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
                  {historyPager.pageItems.map((payment) => {
                    const booking = bookings.find((b: any) => String(b.id) === payment.bookingId);
                    return (
                      <div key={payment.id} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{booking?.photographerName ?? `Booking ${payment.bookingId}`}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            Booking ID: {payment.bookingId} &bull; {payment.paymentDate}
                          </p>
                          {payment.referenceNumber && (
                            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 inline-block px-1.5 py-0.5 rounded">
                              Ref: {payment.referenceNumber}
                            </p>
                          )}
                          <PaymentTrail payment={payment} />
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                          <div className="sm:text-right">
                            <p className="text-[10px] text-muted-foreground">Amount</p>
                            <p className="text-sm font-bold text-green-600 leading-tight">{formatPrice(payment.amount)}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
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
                <Pagination pagination={historyPager} className="mt-2" />
              </>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
