import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  DollarSign, TrendingUp, Clock, ArrowUpRight, Search, X, ExternalLink,
  User, Package as PackageIcon, Receipt, CheckCircle, Loader2, AlertTriangle,
  ShieldCheck, XCircle, MapPin, Users as UsersIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { paymentService, type PhotographerPayment } from "@/services/paymentService";
import { photographerBookingService, type StudioBookingRecord } from "@/services/photographerBookingService";
import { paymentReferenceService, type PaymentReference } from "@/services/paymentReferenceService";

type DisplayStatus = "confirmed" | "needs_review" | "rejected" | "processing";

function getDisplayStatus(p: PhotographerPayment): DisplayStatus {
  if (p.matchingStatus === "rejected") return "rejected";
  if (p.type === "onsite") return "confirmed";
  if (p.matchingStatus === "matched" || p.matchingStatus === "manually_verified") return "confirmed";
  if (p.matchingStatus === "not_matched") return "needs_review";
  return "processing"; // submitted / pending_match — not reachable via the current manual GCash flow
}

function getPlanLabel(p: PhotographerPayment): string {
  if (p.type === "onsite") return "Onsite Balance";
  return p.plan === "full" ? "Full Payment" : "50% Deposit";
}

function StatusPill({ status }: { status: DisplayStatus }) {
  const map: Record<DisplayStatus, { label: string; className: string }> = {
    confirmed: { label: "Confirmed", className: "bg-success/10 text-success border-success/20" },
    needs_review: { label: "Needs Review", className: "bg-warning/10 text-warning border-warning/20" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
    processing: { label: "Processing", className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = map[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border", className)}>
      {label}
    </span>
  );
}

function money(value: number): string {
  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StudioEarnings() {
  const [payments, setPayments] = useState<PhotographerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedPayment, setSelectedPayment] = useState<PhotographerPayment | null>(null);
  const [bookingDetail, setBookingDetail] = useState<StudioBookingRecord | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<"verify" | "reject" | null>(null);

  const [isOnsiteModalOpen, setIsOnsiteModalOpen] = useState(false);
  const [onsiteDate, setOnsiteDate] = useState(new Date().toISOString().split("T")[0]);
  const [onsiteNotes, setOnsiteNotes] = useState("");
  const [isRecordingOnsite, setIsRecordingOnsite] = useState(false);

  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [references, setReferences] = useState<PaymentReference[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [refAmount, setRefAmount] = useState("");
  const [refDate, setRefDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingRef, setIsSubmittingRef] = useState(false);
  const [isInvalidatingRefId, setIsInvalidatingRefId] = useState<string | null>(null);

  const loadReferences = async () => {
    setIsLoadingRefs(true);
    try {
      setReferences(await paymentReferenceService.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load payment references.");
    } finally {
      setIsLoadingRefs(false);
    }
  };

  const handleRegisterReference = async () => {
    if (!refNumber.trim() || !refAmount) {
      toast.error("Enter the reference number and amount received.");
      return;
    }
    setIsSubmittingRef(true);
    try {
      await paymentReferenceService.register({
        reference_number: refNumber.trim(),
        amount_received: Number(refAmount),
        payment_date: refDate,
      });
      toast.success("Payment reference recorded.");
      setRefNumber("");
      setRefAmount("");
      loadReferences();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record this reference.");
    } finally {
      setIsSubmittingRef(false);
    }
  };

  const handleInvalidateReference = async (id: string) => {
    setIsInvalidatingRefId(id);
    try {
      await paymentReferenceService.invalidate(id);
      toast.success("Reference invalidated.");
      loadReferences();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invalidate this reference.");
    } finally {
      setIsInvalidatingRefId(null);
    }
  };

  const loadPayments = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await paymentService.list();
      setPayments(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your payments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    loadReferences();
  }, []);

  // Dynamic Statistics
  const totalEarned = payments
    .filter((p) => getDisplayStatus(p) === "confirmed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter((p) => getDisplayStatus(p) === "needs_review")
    .reduce((sum, p) => sum + p.amount, 0);

  const currentMonthEarned = payments
    .filter((p) => {
      const d = new Date(p.paymentDate);
      const today = new Date();
      return (
        getDisplayStatus(p) === "confirmed" &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          q === "" ||
          p.clientName.toLowerCase().includes(q) ||
          p.id.includes(q) ||
          p.bookingId.includes(q) ||
          (p.referenceNumber ?? "").toLowerCase().includes(q);

        const matchesStatus = statusFilter === "all" || getDisplayStatus(p) === statusFilter;
        const matchesType = typeFilter === "all" || p.type === typeFilter;

        let matchesDate = true;
        if (dateFilter !== "all") {
          const d = new Date(p.paymentDate);
          const today = new Date();
          if (dateFilter === "this_month") {
            matchesDate = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          } else if (dateFilter === "last_month") {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            matchesDate = d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
          } else if (dateFilter === "this_year") {
            matchesDate = d.getFullYear() === today.getFullYear();
          }
        }

        return matchesSearch && matchesStatus && matchesType && matchesDate;
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, searchQuery, statusFilter, dateFilter, typeFilter]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || dateFilter !== "all" || typeFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
    setTypeFilter("all");
  };

  const openDetails = async (payment: PhotographerPayment) => {
    setSelectedPayment(payment);
    setBookingDetail(null);
    setBookingError(null);
    setReviewNotes("");
    setIsLoadingBooking(true);
    try {
      const detail = await photographerBookingService.getById(payment.bookingId);
      setBookingDetail(detail);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not load booking details.");
    } finally {
      setIsLoadingBooking(false);
    }
  };

  const closeDetails = () => {
    setSelectedPayment(null);
    setBookingDetail(null);
    setBookingError(null);
    setReviewNotes("");
    setIsOnsiteModalOpen(false);
  };

  const handleVerify = async () => {
    if (!selectedPayment) return;
    setIsSubmittingReview("verify");
    try {
      const updated = await paymentService.verify(selectedPayment.id, reviewNotes.trim() || undefined);
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPayment(updated);
      toast.success("Payment verified. Booking is now confirmed.");
      setReviewNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify this payment.");
    } finally {
      setIsSubmittingReview(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    if (reviewNotes.trim() === "") {
      toast.error("Please add a reason before rejecting.");
      return;
    }
    setIsSubmittingReview("reject");
    try {
      const updated = await paymentService.reject(selectedPayment.id, reviewNotes.trim());
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPayment(updated);
      toast.success("Payment rejected. The client can resubmit.");
      setReviewNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject this payment.");
    } finally {
      setIsSubmittingReview(null);
    }
  };

  const handleRecordOnsite = async () => {
    if (!bookingDetail) return;
    setIsRecordingOnsite(true);
    try {
      await photographerBookingService.recordOnsitePayment(bookingDetail.id, {
        amount: bookingDetail.remainingBalance,
        payment_date: onsiteDate,
        notes: onsiteNotes.trim() || undefined,
      });
      toast.success("Onsite payment recorded successfully!");
      setIsOnsiteModalOpen(false);
      closeDetails();
      loadPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record this payment.");
    } finally {
      setIsRecordingOnsite(false);
    }
  };

  // A booking is eligible for onsite recording once its confirmed half-payment
  // deposit has left a balance still owed (§8.9).
  const canRecordOnsite =
    selectedPayment?.plan === "half" &&
    selectedPayment?.bookingPaymentStatus === "partially_paid" &&
    getDisplayStatus(selectedPayment) === "confirmed";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Earnings</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your studio's revenue and pending payments.</p>
          </div>
          <Button variant="outline" onClick={() => setIsRefModalOpen(true)}>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Register Payment Reference
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your payments…
          </div>
        )}

        {!isLoading && loadError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={loadPayments}>Try again</Button>
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            {/* Global Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-success/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Earned</p>
                    <p className="text-2xl font-heading font-bold">{money(totalEarned)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-warning/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Needs Review</p>
                    <p className="text-2xl font-heading font-bold">{money(pendingAmount)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Earned This Month</p>
                    <p className="text-2xl font-heading font-bold flex items-center gap-2">
                      {money(currentMonthEarned)}
                      {currentMonthEarned > 0 && <ArrowUpRight className="w-5 h-5 text-success" />}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-3 bg-card p-2 rounded-lg border border-border/50 card-shadow">
              <div className="relative w-full xl:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by client, payment ID, booking ID, or reference…"
                  className="h-9 pl-9 border-none bg-muted/50 focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs border-none bg-muted/50">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="online">Online (GCash)</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs border-none bg-muted/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs border-none bg-muted/50">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Event</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount & Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((p) => {
                        const status = getDisplayStatus(p);
                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="px-6 py-4 text-sm font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              #{p.id}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium">{p.clientName}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5 md:hidden">{p.eventType}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs font-medium">
                                {p.eventType}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                              {new Date(p.paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-heading font-bold text-foreground">
                                  {money(p.amount)}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                                  {getPlanLabel(p)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusPill status={status} />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => openDetails(p)}
                              >
                                Details <ExternalLink className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium">No payments found.</p>
                            <p className="text-xs opacity-70">Try adjusting your search or filter settings.</p>
                            <Button variant="link" onClick={clearAllFilters}>Clear Filters</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* OVERLAY: Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-border/50 flex flex-col">

              <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-heading font-bold">Payment Details</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusPill status={getDisplayStatus(selectedPayment)} />
                    <span className="text-xs text-muted-foreground font-mono">Booking #{selectedPayment.bookingId}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeDetails} className="h-8 w-8 rounded-full bg-background/50 hover:bg-background">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-8">
                <div className="flex items-start sm:items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 sm:mt-0">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      Viewing Payment: <span className="font-mono">#{selectedPayment.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        {getPlanLabel(selectedPayment)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A <span className="font-bold text-foreground">{money(selectedPayment.amount)}</span> {selectedPayment.type === "onsite" ? "onsite" : "online GCash"} payment
                      {selectedPayment.referenceNumber && <> (ref. <span className="font-mono">{selectedPayment.referenceNumber}</span>)</>}
                      {selectedPayment.payerName && <> from <span className="font-medium text-foreground">{selectedPayment.payerName}</span></>}.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                    <User className="w-4 h-4 text-primary" />
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormInput label="Full Name" value={selectedPayment.clientName} icon={<User className="w-4 h-4" />} />
                    <FormInput label="Event Type" value={selectedPayment.eventType} />
                  </div>
                </div>

                {isLoadingBooking && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading booking details…
                  </div>
                )}

                {!isLoadingBooking && bookingError && (
                  <p className="text-sm text-destructive text-center py-4">{bookingError}</p>
                )}

                {!isLoadingBooking && bookingDetail && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                      <PackageIcon className="w-4 h-4 text-primary" />
                      Package & Finances
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <FormInput label="Selected Package" value={bookingDetail.packageName} />
                      </div>
                      <FormInput label="Total Event Cost" value={money(bookingDetail.totalPrice)} />
                      <FormInput label="Remaining Balance" value={money(bookingDetail.remainingBalance)} />
                      {bookingDetail.eventAddress && (
                        <div className="md:col-span-2">
                          <FormInput label="Location" value={bookingDetail.eventAddress} icon={<MapPin className="w-4 h-4" />} />
                        </div>
                      )}
                      {bookingDetail.guestCount != null && (
                        <FormInput label="Guest Count" value={String(bookingDetail.guestCount)} icon={<UsersIcon className="w-4 h-4" />} />
                      )}
                      {bookingDetail.specialRequests && (
                        <div className="md:col-span-2">
                          <FormInput label="Special Requests" value={bookingDetail.specialRequests} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual review actions — only for online GCash payments that failed auto-matching */}
                {getDisplayStatus(selectedPayment) === "needs_review" && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Manual Review Required
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This GCash reference couldn't be automatically matched. Confirm you received the payment, or reject it so the client can resubmit.
                    </p>
                    <Textarea
                      placeholder="Notes (required to reject, optional to verify)…"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={handleReject}
                        disabled={isSubmittingReview !== null}
                      >
                        {isSubmittingReview === "reject" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Reject
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleVerify}
                        disabled={isSubmittingReview !== null}
                      >
                        {isSubmittingReview === "verify" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Verify Payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
                {canRecordOnsite && (
                  <Button
                    variant="default"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setIsOnsiteModalOpen(true)}
                    disabled={!bookingDetail}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Onsite Payment
                  </Button>
                )}
                <Button variant="outline" onClick={closeDetails}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* OVERLAY: Record Onsite Payment Modal */}
        {isOnsiteModalOpen && bookingDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-heading">Confirm Onsite Payment</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Record a <span className="font-bold text-foreground">{money(bookingDetail.remainingBalance)}</span> onsite payment from{" "}
                <span className="font-medium text-foreground">{bookingDetail.clientName}</span>. This will mark the booking as fully paid.
              </p>

              <div className="text-left space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date Paid</label>
                  <Input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={onsiteDate}
                    onChange={(e) => setOnsiteDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
                  <Textarea
                    value={onsiteNotes}
                    onChange={(e) => setOnsiteNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsOnsiteModalOpen(false)} disabled={isRecordingOnsite}>
                  Cancel
                </Button>
                <Button variant="default" className="flex-1" onClick={handleRecordOnsite} disabled={isRecordingOnsite}>
                  {isRecordingOnsite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* OVERLAY: Register Payment Reference Modal */}
        {isRefModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-heading">Register Payment Reference</h3>
                <button onClick={() => setIsRefModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter the GCash reference number and amount you actually received. When a client submits a
                payment with a matching reference number and amount, their booking confirms automatically.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">GCash Reference Number</label>
                  <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="e.g. 1234567890123" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount Received</label>
                    <Input type="number" min="0.01" step="0.01" value={refAmount} onChange={(e) => setRefAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date Received</label>
                    <Input type="date" max={new Date().toISOString().split("T")[0]} value={refDate} onChange={(e) => setRefDate(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleRegisterReference} disabled={isSubmittingRef}>
                  {isSubmittingRef ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Record Reference
                </Button>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Registered References</p>
                {isLoadingRefs && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                )}
                {!isLoadingRefs && references.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No references recorded yet.</p>
                )}
                {!isLoadingRefs && references.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ref.referenceNumber}</p>
                      <p className="text-xs text-muted-foreground">{money(ref.amountReceived)} · {ref.paymentDate}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        ref.status === "available" && "bg-success/10 text-success border-success/20",
                        ref.status === "used" && "bg-muted text-muted-foreground border-border",
                        ref.status === "matched" && "bg-primary/10 text-primary border-primary/20",
                        ref.status === "invalidated" && "bg-destructive/10 text-destructive border-destructive/20",
                      )}>
                        {ref.status}
                      </span>
                      {ref.status === "available" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => handleInvalidateReference(ref.id)}
                          disabled={isInvalidatingRefId === ref.id}
                        >
                          {isInvalidatingRefId === ref.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invalidate"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// Reusable read-only input for the details modal layout
function FormInput({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            {icon}
          </div>
        )}
        <input
          readOnly
          value={value}
          className={cn(
            "w-full h-10 rounded-md border border-input bg-background/50 text-sm font-medium text-foreground focus:outline-none focus:border-primary/50 transition-colors",
            icon ? "pl-10 pr-3" : "px-3"
          )}
        />
      </div>
    </div>
  );
}
