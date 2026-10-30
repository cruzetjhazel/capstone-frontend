import { useState } from "react";
import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { usePhotographers } from "@/hooks/usePhotographers";
import { useMyReviews, useSubmitReview } from "@/hooks/useReviews";
import { useClientPayments } from "@/hooks/useClientPayments";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon, Clock, MapPin, ChevronRight, CalendarX, History as HistoryIcon, Camera, CheckCircle2, XCircle, Clock3, type LucideIcon,
  CreditCard, Star, Search,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Pagination, PillTabs, usePagination } from "@/components/ListPagination";
import { ServiceProgressTracker } from "@/components/booking/ServiceProgressTracker";

const isToday = (dateString: string) => {
  try {
    return new Date().toDateString() === new Date(dateString).toDateString();
  } catch {
    return false;
  }
};

const TERMINAL_STATUSES = ["completed", "cancelled", "expired", "no_show"];

// Strip spaces, dashes and symbols so "1234 567 890123" matches "1234567890123".
const normalizeRef = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const getStatusBadge = (status: string, date?: string, nonCompletionReason?: string | null, isDeclined?: boolean, nonCompletionState?: string | null) => {
  if (status === "cancelled" && isDeclined) {
    return { label: "Declined", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
  }
  if (nonCompletionReason && (nonCompletionState === "open" || nonCompletionState === "awaiting_admin" || nonCompletionState === "disputed")) {
    return {
      label: nonCompletionState === "disputed" ? "No-Show Disputed — Admin Review" : "No-Show Reported — Admin Review",
      className: "bg-amber-500/10 text-amber-600",
      icon: Clock3,
    };
  }
  if (status === "confirmed" && date && isToday(date)) {
    return { label: "In Progress", className: "bg-blue-500/10 text-blue-600", icon: Clock3 };
  }
  if ((status === "no_show" || status === "cancelled") && nonCompletionReason === "photographer_no_show") {
    return { label: "Not Completed — No Photographer Show", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
  }
  if ((status === "no_show" || status === "cancelled") && nonCompletionReason === "client_no_show") {
    return { label: "Not Completed — Client No-Show", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
  }
  switch (status) {
    case "waitlisted": return { label: "Waitlisted", className: "bg-amber-500/10 text-amber-600", icon: Clock3 };
    case "pending": return { label: "Pending", className: "bg-amber-500/10 text-amber-600", icon: Clock3 };
    case "confirmed": return { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 };
    case "completed": return { label: "Completed", className: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 };
    case "cancelled": return { label: "Cancelled", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
    case "no_show": return { label: "Not Completed", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
    case "expired": return { label: "Expired", className: "bg-slate-500/10 text-slate-500", icon: Clock3 };
    default: return { label: status, className: "bg-muted text-muted-foreground", icon: Clock3 };
  }
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(timeStr?: string) {
  if (!timeStr) return "";
  if (/am|pm/i.test(timeStr)) return timeStr;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

function getSessionLabel(booking: any) {
  const eventType = typeof booking.eventType === "string" ? booking.eventType.trim() : "";
  if (eventType && eventType.toLowerCase() !== "untitled package draft") return eventType;
  const pkg = booking.packageName ?? booking.package?.name;
  if (typeof pkg === "string" && pkg.trim() && pkg.trim().toLowerCase() !== "untitled package draft") return pkg;
  return "Photo Session";
}

function getProviderRoleLabel(photographer?: any) {
  const type = photographer?.type ?? photographer?.role ?? photographer?.accountType;
  return typeof type === "string" && type.toLowerCase() === "studio" ? "Studio" : "Photographer";
}

function getPaymentSummary(booking: any) {
  const total = Math.max(0, Number(booking.totalPrice ?? booking.subtotal ?? 0));
  const remaining = booking.status === "completed" || booking.paymentStatus === "fully_paid"
    ? 0
    : Math.max(0, Number(booking.dueNow ?? booking.balance ?? 0));
  return { total, paid: Math.max(0, total - remaining), remaining };
}

function PaymentSummary({ booking }: { booking: any }) {
  const summary = getPaymentSummary(booking);
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      <span>Total <strong className="text-foreground">₱{summary.total.toLocaleString()}</strong></span>
      <span>Paid <strong className="text-emerald-600">₱{summary.paid.toLocaleString()}</strong></span>
      <span>Remaining <strong className={summary.remaining > 0 ? "text-amber-600" : "text-foreground"}>₱{summary.remaining.toLocaleString()}</strong></span>
    </div>
  );
}

function ClientPaymentAction({ booking, prominent = false }: { booking: any; prominent?: boolean }) {
  const { remaining } = getPaymentSummary(booking);
  const canPay = booking.status === "confirmed" && remaining > 0 && booking.paymentStatus === "pending" && !booking.awaitingOfferAcceptance;
  if (booking.status === "confirmed" && booking.awaitingOfferAcceptance) {
    return (
      <Link to={`/booking/${booking.id}/details`}>
        <Button size="sm" className={cn("gap-1.5 rounded-xl", prominent && "bg-amber-600 hover:bg-amber-700 text-white")}>
          Review Offer
        </Button>
      </Link>
    );
  }
  if (!canPay) return null;
  return (
    <Link to={`/booking/${booking.id}/pay`}>
      <Button size="sm" className={cn("gap-1.5 rounded-xl", prominent && "bg-amber-600 hover:bg-amber-700 text-white")}>
        <CreditCard className="w-3.5 h-3.5" />
        {booking.paymentStatus === "partially_paid" ? "Pay Remaining" : "Pay Now"}
      </Button>
    </Link>
  );
}

function isImageUrl(value?: string) {
  return typeof value === "string" && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));
}

function BookingThumb({
  photographer, fallbackAvatar, name, size = "sm",
}: { photographer?: any; fallbackAvatar?: string; name?: string; size?: "sm" | "md" | "lg" }) {
  // `avatarUrl` is the real field — confirmed against PhotographerProfile.tsx
  // and Photographers.tsx, which both render the photographer's actual photo
  // via `p.avatarUrl`. The other candidates below (coverImage, profilePhotoUrl,
  // photoUrl, logoUrl) don't exist on the photographer object at all, so this
  // was always falling through to `photographer?.avatar` — which is just the
  // two-letter initials string, not a URL — and landing on the initials box.
  const src = [photographer?.avatarUrl, photographer?.coverImage, photographer?.profilePhotoUrl, photographer?.photoUrl, photographer?.logoUrl, photographer?.avatar, fallbackAvatar]
    .find((v) => isImageUrl(v));
  const sizeClasses =
    size === "lg" ? "w-24 h-24 sm:w-28 sm:h-28 text-xl"
    : size === "md" ? "w-16 h-16 sm:w-20 sm:h-20 text-base"
    : "w-12 h-12 text-sm";

  if (src) {
    return <img src={src} alt={name || "Booking"} className={cn(sizeClasses, "rounded-xl object-cover shrink-0")} />;
  }
  const initialsText = fallbackAvatar && !isImageUrl(fallbackAvatar) ? fallbackAvatar : getInitials(name);
  return (
    <div className={cn(sizeClasses, "rounded-xl bg-primary/10 text-primary font-heading font-bold flex items-center justify-center shrink-0")}>
      {initialsText}
    </div>
  );
}

function StatusPill({ status, date, nonCompletionReason, isDeclined, nonCompletionState }: { status: string; date?: string; nonCompletionReason?: string | null; isDeclined?: boolean; nonCompletionState?: string | null }) {
  const badge = getStatusBadge(status, date, nonCompletionReason, isDeclined, nonCompletionState);
  const Icon = badge.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0", badge.className)}>
      <Icon className="w-3.5 h-3.5" /> {badge.label}
    </span>
  );
}

function CurrentBookingCard({ booking, photographer, matchedRef }: { booking: any; photographer?: any; matchedRef?: string }) {
  const sessionLabel = getSessionLabel(booking);
  const roleLabel = getProviderRoleLabel(photographer);
  const showTracker = !TERMINAL_STATUSES.filter((s) => s !== "completed").includes(booking.status) && booking.status !== "waitlisted";

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/[0.04] to-accent/5 border border-primary/10 hover:border-primary/30 transition-colors rounded-2xl p-4">
      <div className="flex gap-3 sm:gap-4">
        <BookingThumb photographer={photographer} fallbackAvatar={booking.photographerAvatar} name={booking.photographerName} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base sm:text-lg truncate capitalize">{sessionLabel}</h3>
              <p className="text-xs sm:text-sm text-foreground/80 truncate">
                {booking.photographerName}{" "}
                <span className="text-muted-foreground">&bull; {roleLabel} &bull; #{booking.id}</span>
              </p>
            </div>
            <StatusPill status={booking.status} date={booking.date} nonCompletionReason={booking.nonCompletionReason} isDeclined={booking.isDeclined} nonCompletionState={booking.nonCompletionState} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-primary/70" /> {formatDate(booking.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary/70" /> {formatTime(booking.startTime)}</span>
            <span className="flex items-center gap-1.5 min-w-0"><MapPin className="w-4 h-4 text-primary/70 shrink-0" /> <span className="truncate">{booking.eventLocation}</span></span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <PaymentSummary booking={booking} />
        <div className="flex items-center gap-2 ml-auto">
          <ClientPaymentAction booking={booking} prominent />
          <Link to={`/booking/${booking.id}/details`}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {matchedRef && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Matched GCash Ref: <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{matchedRef}</span>
        </p>
      )}
      {booking.paymentStatus === "pending_verification" && booking.status !== "waitlisted" && (
        <p className="mt-2 text-xs text-amber-700">Payment is under review.</p>
      )}
      {booking.statusNotice && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2">{booking.statusNotice}</p>
      )}

      {showTracker && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <ServiceProgressTracker booking={booking} />
        </div>
      )}
    </div>
  );
}

function HistoryBookingRow({
  booking, photographer, reviewed, onReview, matchedRef,
}: { booking: any; photographer?: any; reviewed: boolean; onReview: () => void; matchedRef?: string }) {
  const sessionLabel = getSessionLabel(booking);
  const roleLabel = getProviderRoleLabel(photographer);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3 hover:border-border transition-colors">
      <BookingThumb photographer={photographer} fallbackAvatar={booking.photographerAvatar} name={booking.photographerName} size="sm" />

      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-sm truncate">{sessionLabel}</h3>
        <p className="text-xs text-foreground/70 truncate">
          {booking.photographerName} <span className="text-[11px] text-muted-foreground">&bull; {roleLabel}</span>
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-primary/70" /> {formatDate(booking.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary/70" /> {formatTime(booking.startTime)}</span>
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" /> <span className="truncate">{booking.eventLocation}</span></span>
        </div>
        {matchedRef && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Matched GCash Ref: <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{matchedRef}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusPill status={booking.status} date={booking.date} nonCompletionReason={booking.nonCompletionReason} isDeclined={booking.isDeclined} nonCompletionState={booking.nonCompletionState} />
        <PaymentSummary booking={booking} />
        <ClientPaymentAction booking={booking} />
        {booking.isReviewable && !reviewed && !(booking.nonCompletionReason === "photographer_no_show" && booking.nonCompletionState !== "upheld") && (
          <Button size="sm" className="gap-1.5 text-xs h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white" onClick={onReview}>
            <Star className="w-3.5 h-3.5" /> Review & Rate
          </Button>
        )}
        <Link to={`/booking/${booking.id}/details`}>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7 rounded-lg">
            View Details <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

type HistoryFilter = "all" | "completed" | "not_completed" | "cancelled" | "declined" | "expired";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "not_completed", label: "Not completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
];

function matchesFilter(b: any, filter: HistoryFilter) {
  // A "not completed" service (e.g. a no-show) is stored as cancelled + a reason.
  const notCompleted = b.status === "no_show" || (b.status === "cancelled" && !!b.nonCompletionReason);
  if (filter === "all") return true;
  if (filter === "completed") return b.status === "completed";
  if (filter === "not_completed") return notCompleted;
  if (filter === "cancelled") return b.status === "cancelled" && !notCompleted && !b.isDeclined;
  if (filter === "declined") return b.status === "cancelled" && !!b.isDeclined;
  if (filter === "expired") return b.status === "expired";
  return true;
}

const CURRENT_PAGE_SIZE = 5;
const HISTORY_PAGE_SIZE = 6;

type BookingsTab = "current" | "history";

function BookingsSidebar({
  activeBookings, historyPool, reviewedBookingIds, onViewHistory,
}: {
  activeBookings: any[];
  historyPool: any[];
  reviewedBookingIds: Set<string>;
  onViewHistory: () => void;
}) {
  const awaitingPayment = activeBookings.filter((b) => {
    const { remaining } = getPaymentSummary(b);
    return b.status === "confirmed" && remaining > 0 && b.paymentStatus === "pending" && !b.awaitingOfferAcceptance;
  });
  const offersToReview = activeBookings.filter((b) => b.status === "confirmed" && b.awaitingOfferAcceptance);
  const toReview = historyPool.filter(
    (b) =>
      b.isReviewable &&
      !reviewedBookingIds.has(String(b.id)) &&
      !(b.nonCompletionReason === "photographer_no_show" && b.nonCompletionState !== "upheld")
  );

  const hasActions = awaitingPayment.length > 0 || offersToReview.length > 0 || toReview.length > 0;

  const steps = [
    { title: "Request a session", text: "Pick a photographer or studio and send your booking." },
    { title: "Get confirmed & pay", text: "Once they accept, pay to secure your date." },
    { title: "Track your session", text: "Follow progress from event day to delivery." },
  ];

  return (
    <>
      {hasActions && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Needs your attention</p>

          {awaitingPayment.map((b) => (
            <div key={`pay-${b.id}`} className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate capitalize">
                  {getSessionLabel(b)} <span className="font-normal text-muted-foreground">#{b.id}</span>
                </p>
                <p className="text-xs text-amber-700/80">₱{getPaymentSummary(b).remaining.toLocaleString()} remaining</p>
              </div>
              <Link to={`/booking/${b.id}/pay`}>
                <Button size="sm" className="h-7 rounded-lg text-xs bg-amber-600 hover:bg-amber-700 text-white">Pay</Button>
              </Link>
            </div>
          ))}

          {offersToReview.map((b) => (
            <div key={`offer-${b.id}`} className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  New offer <span className="font-normal text-muted-foreground">#{b.id}</span>
                </p>
                <p className="text-xs text-amber-700/80 truncate">{b.photographerName}</p>
              </div>
              <Link to={`/booking/${b.id}/details`}>
                <Button size="sm" className="h-7 rounded-lg text-xs bg-amber-600 hover:bg-amber-700 text-white">Review</Button>
              </Link>
            </div>
          ))}

          {toReview.length > 0 && (
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {toReview.length} session{toReview.length > 1 ? "s" : ""} to review
                </p>
                <p className="text-xs text-amber-700/80">Share how it went</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs border-amber-600/40 text-amber-700 hover:bg-amber-500/10" onClick={onViewHistory}>
                Rate
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/[0.04] to-accent/5 p-4 text-center">
        <Camera className="w-6 h-6 text-primary mx-auto" />
        <h3 className="mt-2 font-heading font-bold text-sm">Planning another shoot?</h3>
        <p className="mt-1 text-xs text-muted-foreground">Browse photographers and studios.</p>
        <Link to="/explore">
          <Button size="sm" className="mt-3 w-full rounded-xl h-8">Find a Photographer</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How booking works</p>
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

export default function MyBookings() {
  const { user } = useRole();
  const { data: bookings = [], isLoading } = useBookings(user?.email);
  const { data: allPhotographers = [] } = usePhotographers();
  const { data: myReviews = [] } = useMyReviews();
  const submitReviewMutation = useSubmitReview();
  const { toast } = useToast();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<BookingsTab>("current");
  const { data: clientPayments = [] } = useClientPayments();

  // Every reference we know for a booking: GCash refs from its payments, plus
  // any reference fields carried on the booking itself.
  const refsFor = (b: any): string[] => {
    const fromPayments = clientPayments
      .filter((p) => String(p.bookingId) === String(b.id))
      .flatMap((p: any) => [p.referenceNumber, p.reference, p.gcashReference, p.refNo]);
    const fromBooking = [b.referenceNumber, b.paymentReference, b.gcashReference, b.reference];
    return [...fromPayments, ...fromBooking].filter(Boolean).map(String);
  };

  // The reference that matched the search (shown as a chip on the card).
  const matchedRefFor = (b: any): string | undefined => {
    const compact = normalizeRef(search);
    if (compact.length < 3) return undefined;
    return refsFor(b).find((r) => normalizeRef(r).includes(compact));
  };

  const matchesSearch = (b: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(b.photographerName ?? "").toLowerCase().includes(q) ||
      getSessionLabel(b).toLowerCase().includes(q) ||
      String(b.eventLocation ?? "").toLowerCase().includes(q) ||
      String(b.id) === q.replace(/^#/, "") ||
      matchedRefFor(b) !== undefined
    );
  };
  const [reviewFor, setReviewFor] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const reviewedBookingIds = new Set(myReviews.map((r) => String(r.bookingId)));

  const handleSubmitReview = async () => {
    if (!reviewFor || reviewRating < 1) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" as never });
      return;
    }
    try {
      await submitReviewMutation.mutateAsync({
        booking_id: Number(reviewFor.id),
        rating: reviewRating,
        comment: reviewComment,
      });
      toast({ title: "Review submitted", description: "Thanks for sharing your experience!" });
      setReviewFor(null);
      setReviewRating(0);
      setReviewComment("");
    } catch (error) {
      toast({ title: "Something went wrong", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" as never });
    }
  };

  const safeBookings = bookings || [];
  const activeBookings = safeBookings
    .filter((b) => !TERMINAL_STATUSES.includes(b.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Every pending / confirmed / in-progress booking is "current".
  const currentBookings = activeBookings.filter(matchesSearch);

  // History = finished bookings only.
  const historyPool = safeBookings
    .filter((b) => TERMINAL_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredHistory = historyPool.filter((b) => matchesFilter(b, filter) && matchesSearch(b));

  // Only the visible slice is rendered; pages reset when search/filter change.
  const currentPager = usePagination(currentBookings, CURRENT_PAGE_SIZE, search);
  const historyPager = usePagination(filteredHistory, HISTORY_PAGE_SIZE, `${search}|${filter}`);

  const photographerFor = (b: any) => allPhotographers.find((p) => String(p.id) === String(b.photographerId));

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto space-y-5 animate-fade-up pb-8">

        {/* Hero banner — decorative gradient, matches the Home welcome banner language */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[16px] border-primary/5 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border-[10px] border-primary/10 sm:h-36 sm:w-36" />
          <div className="relative">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">My Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Keep track of your photography sessions and booking history.
            </p>
          </div>
        </div>

        {/* Two columns on large screens: helper rail on the left, bookings on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">

        {/* Main column (bookings) — right side */}
        <div className="min-w-0 space-y-5 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PillTabs<BookingsTab>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "current", label: "Current", count: isLoading ? undefined : currentBookings.length },
              { key: "history", label: "History", count: isLoading ? undefined : filteredHistory.length },
            ]}
            className="self-start"
          />
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photographer, session, or GCash reference no."
              className="w-full h-10 rounded-xl border border-input bg-card pl-9 pr-3 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {!isLoading && search.trim() && (() => {
          const otherCount = tab === "current" ? filteredHistory.length : currentBookings.length;
          const otherTab: BookingsTab = tab === "current" ? "history" : "current";
          return otherCount > 0 ? (
            <p className="text-xs text-muted-foreground -mt-2 px-1">
              {otherCount} more match{otherCount > 1 ? "es" : ""} in {otherTab === "history" ? "History" : "Current"}.{" "}
              <button onClick={() => setTab(otherTab)} className="text-primary font-semibold hover:underline">View</button>
            </p>
          ) : null;
        })()}

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Loading your bookings…</div>
        ) : (
          <>
            {tab === "current" && (
              currentBookings.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-xs text-muted-foreground px-1">
                    {currentBookings.length} current booking{currentBookings.length > 1 ? "s" : ""}, soonest first
                  </p>
                  {currentPager.pageItems.map((b) => (
                    <CurrentBookingCard key={b.id} booking={b} photographer={photographerFor(b)} matchedRef={matchedRefFor(b)} />
                  ))}
                  <Pagination pagination={currentPager} />
                </section>
              ) : (
                <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
                  <CalendarX className="w-9 h-9 text-muted-foreground/30 mx-auto" />
                  <div>
                    <h3 className="font-heading font-bold text-lg">No current booking</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Browse our photographers and book your next session.
                    </p>
                  </div>
                  <Link to="/explore"><Button className="rounded-xl">Find a Photographer</Button></Link>
                </div>
              )
            )}

            {/* Booking History */}
            {tab === "history" && (
              <section className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-base font-heading font-bold flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5 text-muted-foreground" /> Booking History
                  </h2>
                  <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1 flex-wrap">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                          "text-xs font-semibold px-3 py-1 rounded-full transition-colors",
                          filter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-6 text-center">No bookings match this filter.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {historyPager.pageItems.map((b) => (
                        <HistoryBookingRow
                          key={b.id}
                          booking={b}
                          photographer={photographerFor(b)}
                          reviewed={reviewedBookingIds.has(String(b.id))}
                          matchedRef={matchedRefFor(b)}
                          onReview={() => setReviewFor(b)}
                        />
                      ))}
                    </div>
                    <Pagination pagination={historyPager} />
                  </>
                )}
              </section>
            )}
          </>
        )}

        </div>

        {/* Helper rail — left side, hidden below lg */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:col-start-1 lg:row-start-1 space-y-4">
          <BookingsSidebar
            activeBookings={activeBookings}
            historyPool={historyPool}
            reviewedBookingIds={reviewedBookingIds}
            onViewHistory={() => setTab("history")}
          />
        </aside>
        </div>

        {/* MODAL: Review & Rate */}
        {reviewFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/60 p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Star className="text-primary w-5 h-5" /> Review {reviewFor.photographerName}
              </h3>
              <p className="text-sm text-muted-foreground">
                Share how your {reviewFor.eventType} session went. This will be visible to other clients.
              </p>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setReviewRating(n)} className="p-0.5" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                    <Star className={cn("w-7 h-7 transition-colors", n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your review</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="What stood out about your experience?"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => { setReviewFor(null); setReviewRating(0); setReviewComment(""); }} disabled={submitReviewMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
                  {submitReviewMutation.isPending ? "Submitting…" : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
