import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Bell, 
  AlertCircle, 
  Wallet, 
  CalendarCheck,
  CheckCircle2,
  Star,
  Heart,
  Aperture,
  PartyPopper,
  Cake,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { useNotifications } from "@/hooks/useNotifications";
import { useRole } from "@/contexts/RoleContext";
import type { BookingStatus } from "@/services/bookingService";

// Client-facing booking journey — 4 stages only. This intentionally
// collapses backend statuses (pending/accepted/confirmed/completed) into
// a simpler view; it does not touch BookingStatus itself.
const ACTIVE_BOOKING_STAGES = ["Booked", "Confirmed", "Event", "Completed"] as const;

function getBookingProgress(status?: BookingStatus, eventDateStr?: string) {
  switch (status) {
    case "completed":
      return { stageIndex: 3, statusLabel: "Completed", message: "Your booking has been completed." };

    case "confirmed": {
      let isEventDay = false;
      if (eventDateStr) {
        const eventD = new Date(eventDateStr);
        const today = new Date();
        isEventDay = !isNaN(eventD.getTime()) && eventD.toDateString() === today.toDateString();
      }
      if (isEventDay) {
        return { stageIndex: 2, statusLabel: "Event Day", message: "Your event is today." };
      }
      return { stageIndex: 1, statusLabel: "Confirmed", message: "Your booking is confirmed. You're all set for your event." };
    }

    // Photographer accepted the request, but payment is still due before
    // the booking is locked in — a distinct state from "confirmed".
    case "accepted":
      return { stageIndex: 1, statusLabel: "Accepted — Payment Needed", message: "The photographer accepted your request. Complete payment to confirm your booking." };

    case "rejected":
      return { stageIndex: 0, statusLabel: "Request Declined", message: "This photographer wasn't able to accept your request." };

    case "expired":
      return { stageIndex: 0, statusLabel: "Request Expired", message: "The payment window closed before payment was completed. Please submit a new request." };

    case "cancelled":
      return { stageIndex: 0, statusLabel: "Cancelled", message: "This booking was cancelled." };

    case "pending":
    default:
      return { stageIndex: 0, statusLabel: "Pending Confirmation", message: "Your booking request has been sent. Waiting for confirmation." };
  }
}

function formatEventDate(dateStr?: string) {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatEventTime(timeStr?: string) {
  if (!timeStr) return "Time TBD";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour) || m === undefined) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}

// Static teaser categories for the "Explore Photographers" section.
// Purely presentational — every card routes to the existing /explore flow,
// so no new data source or backend contract is introduced here.
const exploreCategories = [
  {
    label: "Weddings",
    tagline: "Timeless moments, captured with heart",
    icon: Heart,
    image: "/images/wedding-card.jpg",
    from: "from-primary/90",
    to: "to-primary/60",
  },
  {
    label: "Portraits",
    tagline: "Studio & natural-light sessions",
    icon: Aperture,
    image: "/images/portrait-card.jpg",
    from: "from-accent/90",
    to: "to-accent/60",
  },
  {
    label: "Events",
    tagline: "Birthdays, reunions & celebrations",
    icon: PartyPopper,
    image: "/images/events-card.jpg",
    from: "from-amber-600/85",
    to: "to-amber-500/55",
  },
  {
    label: "Birthday",
    tagline: "Fun, festive celebrations captured",
    icon: Cake,
    image: "/images/birthday-card.jpg",
    from: "from-rose-600/80",
    to: "to-rose-400/55",
  },
];

export default function Dashboard() {
  const { user } = useRole();
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email) || {};
  const { data: notifications = [] } = useNotifications(user?.email) || {};

  // Safe Data Summaries with fallbacks
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const activeBookings = safeBookings.filter((b) => b && b.status !== "completed" && b.status !== "cancelled");
  const outstandingPayments = safeBookings.filter((b) => b && b.status === "accepted" && (b.dueNow || 0) > 0);
  const completedBookings = safeBookings.filter((b) => b && b.status === "completed");
  const nextBooking = activeBookings.length > 0 ? activeBookings[0] : null;

  const recentNotifications = safeNotifications.slice(0, 3);

  // Quick Stats — same four metrics as before, just tightened into one strip
  const stats = [
    { label: "Active Sessions", value: activeBookings.length, icon: CalendarCheck, color: "text-primary" },
    { label: "Pending Payments", value: outstandingPayments.length, icon: Wallet, color: "text-amber-500" },
    { label: "Completed", value: completedBookings.length, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Eligible Reviews", value: completedBookings.length, icon: Star, color: "text-indigo-500" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up pb-10">

        {/* 1. WELCOME HERO */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-6 sm:p-8">
          {/* Decorative aperture ring — subtle brand texture, no external assets */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[16px] border-primary/5 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border-[10px] border-primary/10 sm:h-36 sm:w-36" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-primary/70 mb-1">
                Client Portal • Bulan Sorsogon
              </p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                Welcome back, {user?.name ? user.name.split(" ")[0] : "Client"}!
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                You have <strong className="text-foreground">{activeBookings.length} active booking{activeBookings.length !== 1 ? "s" : ""}</strong> in progress.
              </p>
            </div>
            <Link to="/explore">
              <Button size="lg" className="shadow-sm rounded-xl">
                Explore & Book Session
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. ACTION REQUIRED: OUTSTANDING PAYMENT REMINDER */}
        {outstandingPayments.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Payment Required to Confirm Booking</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have {outstandingPayments.length} accepted request{outstandingPayments.length > 1 ? "s" : ""} awaiting initial payment.
                </p>
              </div>
            </div>
            <Link to="/payments">
              <Button size="sm" className="gap-1.5 shadow-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                <Wallet className="w-4 h-4" /> Complete Payment <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* 3. QUICK STATS — one compact strip instead of four separate cards */}
        <div className="bg-card/60 border border-border/50 rounded-xl divide-y divide-border/40 sm:divide-y-0 sm:divide-x grid grid-cols-2 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 p-4 justify-center sm:justify-start">
              <div className={`w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold font-heading leading-none ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-1 truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 4. ACTIVE BOOKING — simplified, client-facing summary */}
        {nextBooking && !loadingBookings && (() => {
          const { stageIndex, statusLabel, message } = getBookingProgress(nextBooking.status, nextBooking.date);
          return (
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Active Booking</h2>

              <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{nextBooking.eventType || "Photo Session"}</p>
                    <h3 className="font-heading font-bold text-xl text-foreground">{nextBooking.photographerName || "Photographer"}</h3>
                    <p className="text-sm font-semibold text-primary">Status: {statusLabel}</p>
                  </div>
                  <Link to={`/booking/${nextBooking.id}/details`} className="shrink-0">
                    <Button size="sm" className="rounded-xl">View Booking</Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-primary/70" /> {formatEventDate(nextBooking.date)}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary/70" /> {formatEventTime(nextBooking.startTime)}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary/70" /> {nextBooking.eventLocation || "Location TBD"}</span>
                </div>

                {/* 4-stage client journey */}
                <div className="pt-1">
                  <div className="flex items-center">
                    {ACTIVE_BOOKING_STAGES.map((stage, i) => (
                      <div key={stage} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${i <= stageIndex ? "bg-primary" : "bg-muted"}`} />
                          <span className={`text-[11px] font-medium whitespace-nowrap ${i === stageIndex ? "text-foreground" : "text-muted-foreground"}`}>
                            {stage}
                          </span>
                        </div>
                        {i < ACTIVE_BOOKING_STAGES.length - 1 && (
                          <div className={`flex-1 h-px mx-2 mb-4 ${i < stageIndex ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{message}</p>
                </div>

                {(nextBooking.dueNow || 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Remaining balance: <span className="font-medium text-foreground">₱{(nextBooking.dueNow || 0).toLocaleString()}</span>
                    {nextBooking.status === "accepted" && (
                      <>
                        {" "}&middot;{" "}
                        <Link to={`/booking/${nextBooking.id}/pay`} className="text-primary font-medium hover:underline">
                          Pay now
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </section>
          );
        })()}

        {/* 5. EXPLORE PHOTOGRAPHERS — replaces the old Quick Links grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Explore Photographers</h2>
              <p className="text-sm text-foreground font-medium mt-0.5">Find the right fit for your next session</p>
            </div>
            <Link to="/explore" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 shrink-0">
              Browse All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {exploreCategories.map((cat) => (
              <Link
                key={cat.label}
                to="/explore"
                className={`group relative overflow-hidden rounded-2xl aspect-[4/5] bg-gradient-to-br ${cat.from} ${cat.to} shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md`}
              >
                {/* Layer 1 (bottom): category photography */}
                <img
                  src={cat.image}
                  alt={cat.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Layer 2 (middle): colored brand tint + dark gradient so text stays readable */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.from} ${cat.to} opacity-55 mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/0" />

                {/* Layer 3 (top): existing decorative shapes, icon, title, description — unchanged */}
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <cat.icon className="absolute -right-3 -top-3 w-20 h-20 text-white/15 group-hover:text-white/25 transition-colors" />
                  <cat.icon className="w-5 h-5 text-white/90 mb-2" />
                  <p className="font-heading font-bold text-sm text-white leading-tight">{cat.label}</p>
                  <p className="text-[11px] text-white/75 leading-snug mt-0.5 line-clamp-2">{cat.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 6. RECENT UPDATES */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Recent Updates
            </h3>
            <Link to="/notifications" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            {recentNotifications.length > 0 ? (
              <div className="space-y-4">
                {recentNotifications.map((n, i) => (
                  <div key={n.id || i} className="flex gap-3 text-xs">
                    <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{n.title || "Notification"}</p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{n.description || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-muted-foreground py-1">
                <Bell className="w-4 h-4 opacity-30 shrink-0" />
                <p className="text-xs">No new notifications</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
