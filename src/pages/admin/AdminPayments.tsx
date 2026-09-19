import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  DollarSign, Clock, Search, Filter,
  Eye, X, AlertTriangle, CheckCircle2,
  CreditCard, FileText, Ban, ShieldCheck, Loader2, ReceiptText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import {
  useAdminPayments,
  useAdminForceCancelBooking,
  useAdminRecordRefund,
} from "@/hooks/useAdminPayments";
import {
  getApiErrorMessage,
  type AdminPayment,
  type PaymentMatchingStatus,
  type RefundStatus,
} from "@/services/adminPaymentService";

const MATCHING_STATUS_LABELS: Record<PaymentMatchingStatus, string> = {
  submitted: "Submitted",
  pending_match: "Pending Match",
  matched: "Matched",
  not_matched: "Not Matched",
  manually_verified: "Manually Verified",
  rejected: "Rejected",
};

const MATCHING_STATUS_STYLES: Record<PaymentMatchingStatus, { color: string; icon: any }> = {
  submitted: { color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50", icon: Clock },
  pending_match: { color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50", icon: Loader2 },
  matched: { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50", icon: CheckCircle2 },
  not_matched: { color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50", icon: AlertTriangle },
  manually_verified: { color: "text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-900/50", icon: ShieldCheck },
  rejected: { color: "text-muted-foreground bg-muted border-border", icon: X },
};

const NON_CANCELLABLE_BOOKING_STATUSES = ["cancelled", "completed", "rejected"];

const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  none: "No refund",
  pending: "Refund pending",
  partial: "Partially refunded",
  full: "Fully refunded",
  denied: "Refund denied",
};

function paymentDisplayId(id: number) {
  return `PAY-${String(id).padStart(4, "0")}`;
}
function bookingDisplayId(id: number) {
  return `BK-${String(id).padStart(4, "0")}`;
}

export default function AdminPayments() {
  const { toast } = useToast();
  const { data: payments = [], isLoading, isError, error } = useAdminPayments();
  const forceCancelMutation = useAdminForceCancelBooking();
  const recordRefundMutation = useAdminRecordRefund();

  const [isRefunding, setIsRefunding] = useState(false);
  const [refundStatus, setRefundStatus] = useState<"pending" | "partial" | "full" | "denied">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PaymentMatchingStatus>("All");

  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { verifiedRevenue, pendingReviewAmount } = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        if (p.matchingStatus === "matched" || p.matchingStatus === "manually_verified") {
          acc.verifiedRevenue += p.amount;
        }
        if (p.matchingStatus === "submitted" || p.matchingStatus === "pending_match" || p.matchingStatus === "not_matched") {
          acc.pendingReviewAmount += p.amount;
        }
        return acc;
      },
      { verifiedRevenue: 0, pendingReviewAmount: 0 },
    );
  }, [payments]);

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      paymentDisplayId(p.id).toLowerCase().includes(q) ||
      p.referenceNumber.toLowerCase().includes(q) ||
      p.client.name.toLowerCase().includes(q) ||
      p.payerName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "All" || p.matchingStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCancelConfirm = () => {
    setCancelReason("");
    setIsConfirmingCancel(true);
  };

  const handleForceCancel = () => {
    if (!selectedPayment) return;
    forceCancelMutation.mutate(
      { bookingId: selectedPayment.bookingId, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          setIsConfirmingCancel(false);
          setSelectedPayment(null);
          toast({
            title: "Booking cancelled",
            description: `${bookingDisplayId(selectedPayment.bookingId)} has been force-cancelled. No automatic refund was processed — handle it manually.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Couldn't cancel booking",
            description: getApiErrorMessage(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  const cancelDisabled =
    !!selectedPayment && NON_CANCELLABLE_BOOKING_STATUSES.includes(selectedPayment.booking.status);

  const openRefundForm = () => {
    setRefundStatus("full");
    setRefundAmount(String(selectedPayment?.amount ?? ""));
    setRefundNotes("");
    setIsRefunding(true);
  };

  const handleRecordRefund = () => {
    if (!selectedPayment) return;
    const needsAmount = refundStatus === "partial" || refundStatus === "full";
    const amountNum = Number(refundAmount);

    if (needsAmount && (!refundAmount || Number.isNaN(amountNum) || amountNum <= 0)) {
      toast({ title: "Enter a valid refund amount", variant: "destructive" });
      return;
    }
    if (needsAmount && amountNum > selectedPayment.amount) {
      toast({ title: "Refund amount can't exceed the amount paid", variant: "destructive" });
      return;
    }

    recordRefundMutation.mutate(
      {
        paymentId: selectedPayment.id,
        input: {
          refund_status: refundStatus,
          ...(needsAmount ? { refund_amount: amountNum } : {}),
          ...(refundNotes.trim() ? { refund_notes: refundNotes.trim() } : {}),
        },
      },
      {
        onSuccess: (updated) => {
          setIsRefunding(false);
          setSelectedPayment(updated);
          toast({
            title: "Refund status recorded",
            description: `${bookingDisplayId(selectedPayment.bookingId)} marked as "${REFUND_STATUS_LABELS[refundStatus]}". Remember: this only records the decision — actually sending the money back still happens manually.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Couldn't record refund",
            description: getApiErrorMessage(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              Payments Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor platform payment submissions and their reference-matching status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verified Revenue</p>
              <p className="text-2xl font-heading font-bold">₱{verifiedRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Awaiting Match / Review</p>
              <p className="text-2xl font-heading font-bold">₱{pendingReviewAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Payment ID, Reference, Client, or Payer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background"
            />
          </div>
          <div className="w-full md:w-56 shrink-0 flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {Object.entries(MATCHING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Payment ID / Date</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Client</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs hidden md:table-cell">Plan & Method</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Amount</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Matching Status</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading payments...
                    </td>
                  </tr>
                )}

                {isError && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-destructive">
                      {getApiErrorMessage(error, "Couldn't load payments.")}
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && filteredPayments.map((p) => {
                  const style = MATCHING_STATUS_STYLES[p.matchingStatus];
                  const StatusIcon = style.icon;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary">{paymentDisplayId(p.id)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.paymentDate}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{p.client.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {bookingDisplayId(p.bookingId)}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="font-medium">{p.plan === "full" ? "Full Payment" : "Half Payment"}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 border border-border/60 bg-muted px-1.5 py-0.5 rounded w-max">
                          {p.type === "online" ? (p.method || "Online") : "Onsite"}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-base">₱{p.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${style.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {MATCHING_STATUS_LABELS[p.matchingStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(p)}
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && !isError && filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CreditCard className="w-8 h-8 opacity-20" />
                        <p>No payment records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative">

            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
              <div>
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  Payment Details
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${MATCHING_STATUS_STYLES[selectedPayment.matchingStatus].color}`}>
                    {MATCHING_STATUS_LABELS[selectedPayment.matchingStatus]}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-mono">Record ID: {paymentDisplayId(selectedPayment.id)}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 bg-muted/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Reference Number</p>
                  <p className="font-mono text-lg font-bold">{selectedPayment.referenceNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPayment.type === "online" ? (selectedPayment.method || "Online") : "Onsite"} payment
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                  <p className="text-2xl font-heading font-bold text-foreground">₱{selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Client</p>
                    <p className="font-semibold text-sm">{selectedPayment.client.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Payer Name</p>
                    <p className="font-semibold text-sm">{selectedPayment.payerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Payment Date</p>
                    <p className="font-semibold text-sm">{selectedPayment.paymentDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Payment Plan</p>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {selectedPayment.plan === "full" ? "Full Payment" : "Half Payment"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Associated Booking</p>
                    <p className="font-mono font-semibold text-sm text-primary">{bookingDisplayId(selectedPayment.bookingId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Booking Status</p>
                    <p className="font-semibold text-sm capitalize">{selectedPayment.booking.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Booking Payment Status</p>
                    <p className="font-semibold text-sm capitalize">{selectedPayment.booking.paymentStatus.replace("_", " ")}</p>
                  </div>
                  {selectedPayment.verificationNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Verification Notes</p>
                      <p className="text-sm">{selectedPayment.verificationNotes}</p>
                    </div>
                  )}
                  {selectedPayment.refundStatus !== "none" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Refund</p>
                      <p className="text-sm font-semibold">
                        {REFUND_STATUS_LABELS[selectedPayment.refundStatus]}
                        {selectedPayment.refundAmount != null && ` — ₱${selectedPayment.refundAmount.toLocaleString()}`}
                      </p>
                      {selectedPayment.refundNotes && <p className="text-xs text-muted-foreground mt-0.5">{selectedPayment.refundNotes}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border/50 bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-xs text-muted-foreground max-w-[60%]">
                {cancelDisabled
                  ? "This booking cannot be cancelled from its current status."
                  : "Force-cancelling sets the booking and payment status to cancelled. No automatic GCash refund is processed — handle it manually."}
              </p>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={openRefundForm}
                  variant="outline"
                  className="gap-2 bg-background"
                >
                  <ReceiptText className="w-4 h-4" />
                  Record Refund
                </Button>
                <Button
                  onClick={openCancelConfirm}
                  variant="outline"
                  className="gap-2 bg-background text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={cancelDisabled}
                >
                  <Ban className="w-4 h-4" />
                  Force Cancel Booking
                </Button>
              </div>
            </div>

            {isConfirmingCancel && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-in fade-in duration-200 rounded-2xl p-4">
                <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-1">
                    <Ban className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-heading">Force Cancel Booking</h3>
                  <p className="text-sm text-muted-foreground">
                    This will cancel <span className="font-mono font-bold text-foreground">{bookingDisplayId(selectedPayment.bookingId)}</span> regardless of its current state. No refund is processed automatically.
                  </p>
                  <Textarea
                    placeholder="Reason (optional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-sm"
                    rows={3}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsConfirmingCancel(false)}
                      disabled={forceCancelMutation.isPending}
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={handleForceCancel}
                      disabled={forceCancelMutation.isPending}
                    >
                      {forceCancelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                      Confirm Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isRefunding && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-in fade-in duration-200 rounded-2xl p-4">
                <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-1">
                    <ReceiptText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-heading text-center">Record Refund</h3>
                  <p className="text-xs text-muted-foreground text-center">
                    This only records a decision for <span className="font-mono font-bold text-foreground">{bookingDisplayId(selectedPayment.bookingId)}</span> —
                    it does not send money. Actually refunding the client (e.g. a GCash send) still happens manually.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Status</label>
                    <select
                      value={refundStatus}
                      onChange={(e) => setRefundStatus(e.target.value as typeof refundStatus)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="pending">Pending review</option>
                      <option value="partial">Partial refund</option>
                      <option value="full">Full refund</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>

                  {(refundStatus === "partial" || refundStatus === "full") && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Amount (max ₱{selectedPayment.amount.toLocaleString()})
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={selectedPayment.amount}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <Textarea
                    placeholder="Notes (optional) — e.g. reason, evidence reviewed, who approved this"
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="text-sm"
                    rows={3}
                  />

                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsRefunding(false)}
                      disabled={recordRefundMutation.isPending}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleRecordRefund}
                      disabled={recordRefundMutation.isPending}
                    >
                      {recordRefundMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ReceiptText className="w-4 h-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}