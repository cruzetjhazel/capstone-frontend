import { useState } from "react";
import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { usePhotographers } from "@/hooks/usePhotographers";
import {
  Calendar as CalendarIcon, Clock, MapPin, ChevronRight, CalendarX, History as HistoryIcon,
  Check, Camera, Wand2, PackageCheck, CheckCircle2, XCircle, Clock3, type LucideIcon,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

// Client-facing Service Progress — 3 stages only, matching the backend
// ServiceTrackerStatus enum exactly (event_day/editing/delivered), identical
// to ClientBookingDetails.tsx's SERVICE_PROGRESS_STEPS. Booking status
// (pending/confirmed/completed/cancelled/expired) is shown separately via
// the badge, not as a tracker stage.
const TRACKING_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Event Day", icon: Camera },
  { label: "Editing", icon: Wand2 },
  { label: "Delivered", icon: PackageCheck },
];

const isToday = (dateString: string) => {
  try {
    return new Date().toDateString() === new Date(dateString).toDateString();
  } catch {
    return false;
  }
};

// Identical to ClientBookingDetails.tsx's getCurrentStepIndex — do not diverge.
function getCurrentStepIndex(b: any) {
  if (b.status === "completed" || b.serviceStatus === "delivered") return 2;
  if (b.serviceStatus === "editing") return 1;
  if (b.serviceStatus === "event_day") return 0;
  return -1;
}

const TERMINAL_STATUSES = ["completed", "cancelled", "expired"];

const getStatusBadge = (status: string, date?: string) => {
  if (status === "confirmed" && date && isToday(date)) {
    return { label: "In Progress", className: "bg-blue-500/10 text-blue-600", icon: Clock3 };
  }
  switch (status) {
    case "pending": return { label: "Pending", className: "bg-amber-500/10 text-amber-600", icon: Clock3 };
    case "confirmed": return { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 };
    case "completed": return { label: "Completed", className: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 };
    case "cancelled": return { label: "Cancelled", className: "bg-rose-500/10 text-rose-600", icon: XCircle };
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

function isImageUrl(value?: string) {
  return typeof value === "string" && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));
}

function BookingThumb({
  photographer, fallbackAvatar, name, size = "sm",
}: { photographer?: any; fallbackAvatar?: string; name?: string; size?: "sm" | "lg" }) {
  // `avatarUrl` is the real field — confirmed against PhotographerProfile.tsx
  // and Photographers.tsx, which both render the photographer's actual photo
  // via `p.avatarUrl`. The other candidates below (coverImage, profilePhotoUrl,
  // photoUrl, logoUrl) don't exist on the photographer object at all, so this
  // was always falling through to `photographer?.avatar` — which is just the
  // two-letter initials string, not a URL — and landing on the initials box.
  const src = [photographer?.avatarUrl, photographer?.coverImage, photographer?.profilePhotoUrl, photographer?.photoUrl, photographer?.logoUrl, photographer?.avatar, fallbackAvatar]
    .find((v) => isImageUrl(v));
  const sizeClasses = size === "lg" ? "w-24 h-24 sm:w-28 sm:h-28 text-xl" : "w-14 h-14 text-sm";

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

function StatusPill({ status, date }: { status: string; date?: string }) {
  const badge = getStatusBadge(status, date);
  const Icon = badge.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shrink-0", badge.className)}>
      <Icon className="w-3.5 h-3.5" /> {badge.label}
    </span>
  );
}

function ServiceProgressTracker({ booking }: { booking: any }) {
  const currentStep = getCurrentStepIndex(booking);
  return (
    <div className="relative w-full overflow-x-auto pt-2">
      <div className="relative min-w-[520px] sm:min-w-0">
        <div className="absolute top-4 left-4 right-4 sm:left-[18px] sm:right-[18px]">
          <div className="h-[2px] w-full bg-border rounded-full" />
          <div
            className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-700 rounded-full"
            style={{ width: `${(Math.max(currentStep, 0) / (TRACKING_STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="relative z-10 flex items-start justify-between w-full">
          {TRACKING_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            const StepIcon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-card shrink-0",
                  isCompleted ? "border-primary bg-primary text-primary-foreground" :
                  isActive ? "border-primary text-primary ring-4 ring-primary/15" :
                  "border-border text-muted-foreground/40"
                )}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                <span className={cn(
                  "text-[10px] text-center leading-tight px-0.5",
                  isActive ? "text-foreground font-bold" : isCompleted ? "text-foreground/70 font-medium" : "text-muted-foreground/50"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentBookingCard({ booking, photographer }: { booking: any; photographer?: any }) {
  const sessionLabel = getSessionLabel(booking);
  const roleLabel = getProviderRoleLabel(photographer);
  const showTracker = !TERMINAL_STATUSES.filter((s) => s !== "completed").includes(booking.status);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/[0.04] to-accent/5 border border-primary/10 rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -bottom-14 h-40 w-40 rounded-full border-[14px] border-primary/5" />

      <div className="relative flex items-center gap-2 mb-5">
        <CalendarIcon className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Current Booking</h2>
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
        <BookingThumb photographer={photographer} fallbackAvatar={booking.photographerAvatar} name={booking.photographerName} size="lg" />

        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-xl truncate">{sessionLabel}</h3>
          <p className="text-sm text-foreground/80 mt-0.5">{booking.photographerName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-primary/70" /> {formatDate(booking.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary/70" /> {formatTime(booking.startTime)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary/70" /> {booking.eventLocation}</span>
          </div>
        </div>

        <div className="flex sm:flex-col items-start sm:items-end gap-3 shrink-0">
          <StatusPill status={booking.status} date={booking.date} />
          <Link to={`/booking/${booking.id}/details`}>
            <Button size="sm" className="gap-1.5 rounded-xl">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {showTracker && (
        <div className="relative mt-6 pt-5 border-t border-primary/10">
          <ServiceProgressTracker booking={booking} />
        </div>
      )}
    </div>
  );
}

function HistoryBookingRow({ booking, photographer }: { booking: any; photographer?: any }) {
  const sessionLabel = getSessionLabel(booking);
  const roleLabel = getProviderRoleLabel(photographer);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4 hover:border-border transition-colors">
      <BookingThumb photographer={photographer} fallbackAvatar={booking.photographerAvatar} name={booking.photographerName} size="sm" />

      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-sm truncate">{sessionLabel}</h3>
        <p className="text-xs text-foreground/70">{booking.photographerName}</p>
        <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-primary/70" /> {formatDate(booking.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary/70" /> {formatTime(booking.startTime)}</span>
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" /> <span className="truncate">{booking.eventLocation}</span></span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <StatusPill status={booking.status} date={booking.date} />
        <Link to={`/booking/${booking.id}/details`}>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7 rounded-lg">
            View Details <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

type HistoryFilter = "all" | "upcoming" | "completed" | "cancelled" | "expired";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "expired", label: "Expired" },
];

function matchesFilter(status: string, filter: HistoryFilter) {
  if (filter === "all") return true;
  if (filter === "upcoming") return ["pending", "confirmed"].includes(status);
  if (filter === "completed") return status === "completed";
  if (filter === "cancelled") return status === "cancelled";
  if (filter === "expired") return status === "expired";
  return true;
}

export default function MyBookings() {
  const { user } = useRole();
  const { data: bookings = [], isLoading } = useBookings(user?.email);
  const { data: allPhotographers = [] } = usePhotographers();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const safeBookings = bookings || [];
  const activeBookings = safeBookings
    .filter((b) => !TERMINAL_STATUSES.includes(b.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Clients have at most one booking in flight — the soonest active one is "current".
  const currentBooking = activeBookings[0];

  const historyPool = safeBookings
    .filter((b) => !currentBooking || String(b.id) !== String(currentBooking.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredHistory = historyPool.filter((b) => matchesFilter(b.status, filter));

  const photographerFor = (b: any) => allPhotographers.find((p) => String(p.id) === String(b.photographerId));

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-10">

        {/* Hero banner — decorative gradient, matches the Home welcome banner language */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[16px] border-primary/5 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border-[10px] border-primary/10 sm:h-36 sm:w-36" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              Keep track of your photography sessions and booking history.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Loading your bookings…</div>
        ) : (
          <>
            {currentBooking ? (
              <CurrentBookingCard booking={currentBooking} photographer={photographerFor(currentBooking)} />
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center space-y-4">
                <CalendarX className="w-9 h-9 text-muted-foreground/30 mx-auto" />
                <div>
                  <h3 className="font-heading font-bold text-lg">No current booking</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse our photographers and book your next session.
                  </p>
                </div>
                <Link to="/explore"><Button className="rounded-xl">Find a Photographer</Button></Link>
              </div>
            )}

            {/* Booking History */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-muted-foreground" /> Booking History
                </h2>
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-full p-1 flex-wrap">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        "text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors",
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
                <div className="space-y-3">
                  {filteredHistory.map((b) => (
                    <HistoryBookingRow key={b.id} booking={b} photographer={photographerFor(b)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
