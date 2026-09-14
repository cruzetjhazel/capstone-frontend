import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Ban, Camera, Hourglass, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Check, AlertTriangle,
  Clock, ExternalLink, X, MapPin, User, FileText, Loader2,
  Search, Repeat, CalendarDays, Plus, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";
import { useBlockedDates, useCreateBlockedDate, useDeleteBlockedDate } from "@/hooks/useBlockedDates";
import { usePhotographerBookings } from "@/hooks/usePhotographerBookings";
import type { StudioBookingRecord } from "@/services/photographerBookingService";
import { useNavigate } from "react-router-dom";
import {
  useBookingHours, useCreateBookingHour, useDeleteBookingHour, useUpdateSlotInterval,
} from "@/hooks/useBookingHours";
import { useAvailabilityWindows } from "@/hooks/useAvailabilityWindows";

const BOOKING_HOUR_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_INTERVAL_OPTIONS = [15, 20, 30, 45, 60];

type DayStatus = "available" | "blocked" | "booked" | "pending" | "mixed" | "closed";
type FilterKey = DayStatus | "past";

const URGENT_HOLD_HOURS = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateStr(year: number, monthIndex0: number, day: number) {
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}
function hoursUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}
// Default "until" date for a fresh bulk-block: the end of the currently viewed month.
function endOfMonthStr(monthDate: Date): string {
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  return toDateStr(monthDate.getFullYear(), monthDate.getMonth(), lastDay);
}
// "14:30" -> "2:30 PM"
function formatTime12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${pad(m)} ${period}`;
}

// Reads a block's start/end time regardless of whether the API returns
// snake_case (start_time/end_time) or camelCase (startTime/endTime) —
// the two spots in this file that displayed this previously disagreed
// on which one to use, which is what made the grid always say "Full Day".
function getBlockTimes(block: any): { start: string | null; end: string | null } {
  if (!block) return { start: null, end: null };
  return {
    start: block.start_time ?? block.startTime ?? null,
    end: block.end_time ?? block.endTime ?? null,
  };
}
function formatBlockLabel(block: any): string {
  const { start, end } = getBlockTimes(block);
  return start && end ? `${formatTime12h(start)}\u2013${formatTime12h(end)}` : "Full Day";
}

// "2 pending, 1 confirmed" style summary for days with multiple bookings.
function summarizeBookings(dayBookings: StudioBookingRecord[]): string {
  const counts: Record<string, number> = {};
  dayBookings.forEach((b) => {
    const key = b.status;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");
}

export default function StudioCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: blockedDates = [], isLoading: loadingBlocks } = useBlockedDates();
  const { data: bookings = [], isLoading: loadingBookings } = usePhotographerBookings();
  const { data: availabilityWindows = [], isLoading: loadingWindows } = useAvailabilityWindows();
  const createBlock = useCreateBlockedDate();
  const deleteBlock = useDeleteBlockedDate();

  // Usual Booking Hours — same hooks/service as before, now used directly here.
  const { data: bookingHours = [] } = useBookingHours();
  const createBookingHour = useCreateBookingHour();
  const deleteBookingHour = useDeleteBookingHour();
  const updateSlotInterval = useUpdateSlotInterval();
  const [newBookingHourPeriod, setNewBookingHourPeriod] = useState<Record<number, { start: string; end: string }>>({});

  const bookingHoursForDay = (day: number) =>
    bookingHours.filter((h) => h.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));

  const addBookingHourPeriod = async (day: number) => {
    const draft = newBookingHourPeriod[day];
    if (!draft?.start || !draft?.end) return;
    try {
      await createBookingHour.mutateAsync({ day_of_week: day, start_time: draft.start, end_time: draft.end });
      setNewBookingHourPeriod((prev) => ({ ...prev, [day]: { start: "", end: "" } }));
    } catch (error) {
      toast({ title: "Couldn't add period", description: "Check for overlaps with an existing period.", variant: "destructive" as never });
    }
  };

  const [currentMonth, setCurrentMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr());

  const [isBlocking, setIsBlocking] = useState(false);
  const [isConfirmingBlock, setIsConfirmingBlock] = useState(false);
  const [isConfirmingUnblock, setIsConfirmingUnblock] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<{ id: string; day: number; start: string; end: string } | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState<StudioBookingRecord | null>(null);

  const [blockReason, setBlockReason] = useState("");
  const [blockMode, setBlockMode] = useState<"full" | "half" | "custom">("full");
  const [halfDayPeriod, setHalfDayPeriod] = useState<"morning" | "afternoon">("morning");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("17:00");

  const HALF_DAY_RANGES = {
    morning: { start: "08:00", end: "12:00" },
    afternoon: { start: "13:00", end: "17:00" },
  } as const;

  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [isBulkBlockOpen, setIsBulkBlockOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkFromDate, setBulkFromDate] = useState(() => todayStr());
  const [bulkUntilDate, setBulkUntilDate] = useState(() => endOfMonthStr(new Date()));
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = new Date(year, monthIndex, 1).getDay();

  const changeMonth = (delta: number) => {
    const next = new Date(year, monthIndex + delta, 1);
    setCurrentMonth(next);
    setSelectedDateStr(toDateStr(next.getFullYear(), next.getMonth(), 1));
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setIsConfirmingUnblock(false);
  };
  const goToPrevMonth = () => changeMonth(-1);
  const goToNextMonth = () => changeMonth(1);
  const goToToday = () => {
    const t = new Date();
    setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDateStr(todayStr());
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setIsConfirmingUnblock(false);
  };

  const statusConfig: Record<DayStatus, { bg: string; text: string; dot: string; icon: any }> = {
    available: { bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", icon: Check },
    blocked: { bg: "bg-red-500/10 hover:bg-red-500/15 border-red-500/20", text: "text-red-600 dark:text-red-400", dot: "bg-red-500", icon: Ban },
    booked: { bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", icon: Camera },
    pending: { bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20", text: "text-amber-600 dark:text-amber-500", dot: "bg-amber-500", icon: Hourglass },
    mixed: { bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", icon: Camera },
    closed: { bg: "bg-muted/40 hover:bg-muted/50 border-border/40", text: "text-muted-foreground", dot: "bg-muted-foreground/50", icon: Clock },
  };

  // Bookings that still meaningfully occupy a date — rejected/cancelled don't.
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired"),
    [bookings]
  );

  const bookingsByDate = useMemo(() => {
    const map: Record<string, StudioBookingRecord[]> = {};
    for (const b of activeBookings) {
      (map[b.date] ??= []).push(b);
    }
    return map;
  }, [activeBookings]);

  const blockedByDate = useMemo(() => {
    const map: Record<string, (typeof blockedDates)[number]> = {};
    for (const bd of blockedDates) map[bd.date] = bd;
    return map;
  }, [blockedDates]);

  // One-off AvailabilityWindow rows — mirrors AvailabilityService::resolvePeriods
  // on the backend: these ADD bookable time to an otherwise-closed weekday
  // (e.g. a photographer normally closed Wednesdays, opened for one specific
  // Wednesday). Without this, the studio calendar disagreed with the public
  // booking calendar on exactly these dates.
  const windowsByDate = useMemo(() => {
    const map: Record<string, (typeof availabilityWindows)[number][]> = {};
    for (const w of availabilityWindows) (map[w.date] ??= []).push(w);
    return map;
  }, [availabilityWindows]);

  // Mirrors AvailabilityService::resolvePeriods on the backend: once the
  // photographer has configured ANY usual hours, a weekday with none of its
  // own is closed (not "available") — this is what keeps this calendar in
  // sync with the public booking calendar, which already enforces this.
  const hasAnyBookingHours = bookingHours.length > 0;
  const dayOfWeekForDateStr = (dateStr: string) => new Date(`${dateStr}T00:00:00`).getDay();

  const getDayStatus = (dateStr: string): DayStatus => {
    if (blockedByDate[dateStr]) return "blocked";
    const dayBookings = bookingsByDate[dateStr] || [];
    if (dayBookings.length > 1) return "mixed";
    if (dayBookings.length === 1) {
      const s = dayBookings[0].status;
      return s === "confirmed" || s === "completed" ? "booked" : "pending";
    }
    const hasOneOffWindow = !!windowsByDate[dateStr]?.length;
    if (hasAnyBookingHours && bookingHoursForDay(dayOfWeekForDateStr(dateStr)).length === 0 && !hasOneOffWindow) {
      return "closed";
    }
    return "available";
  };

  const handleDayClick = (day: number) => {
    setSelectedDateStr(toDateStr(year, monthIndex, day));
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setIsConfirmingUnblock(false);
  };

  const resetBlockForm = () => {
    setBlockReason("");
    setBlockMode("full");
    setHalfDayPeriod("morning");
    setBlockStartTime("09:00");
    setBlockEndTime("17:00");
  };

  const handleSaveBlock = async () => {
    const { start_time, end_time } =
      blockMode === "full"
        ? { start_time: null, end_time: null }
        : blockMode === "half"
        ? { start_time: HALF_DAY_RANGES[halfDayPeriod].start, end_time: HALF_DAY_RANGES[halfDayPeriod].end }
        : { start_time: blockStartTime, end_time: blockEndTime };

    try {
      await createBlock.mutateAsync({
        date: selectedDateStr,
        reason: blockReason.trim() || null,
        start_time,
        end_time,
      });
      toast({ title: "Date blocked", description: blockReason.trim() ? `Successfully blocked out for: ${blockReason.trim()}` : "Date successfully blocked out." });
      setIsBlocking(false);
      setIsConfirmingBlock(false);
      resetBlockForm();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: getApiErrorMessage(error),
        variant: "destructive" as never,
      });
      setIsConfirmingBlock(false);
    }
  };

  const handleRemoveBlock = async () => {
    const block = blockedByDate[selectedDateStr];
    if (!block) return;
    try {
      await deleteBlock.mutateAsync(block.id);
      toast({ title: "Blockout removed", description: "Remaining time is now available." });
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: getApiErrorMessage(error),
        variant: "destructive" as never,
      });
    } finally {
      setIsConfirmingUnblock(false);
    }
  };

  const handleBulkBlock = async () => {
    const [sy, sm, sd] = bulkFromDate.split("-").map(Number);
    const [ey, em, ed] = bulkUntilDate.split("-").map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);

    const matches: string[] = [];
    for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const ds = toDateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (blockedByDate[ds]) continue;
      matches.push(ds);
    }

    if (matches.length === 0) {
      toast({ title: "Nothing to block", description: "Every date in that range is already blocked." });
      return;
    }

    setIsBulkProcessing(true);
    let successCount = 0;
    for (const ds of matches) {
      try {
        await createBlock.mutateAsync({ date: ds, reason: bulkReason.trim() || null, start_time: null, end_time: null });
        successCount++;
      } catch {
        // keep going — report the partial result at the end
      }
    }
    setIsBulkProcessing(false);

    toast({
      title: successCount === matches.length ? "Bulk block complete" : "Bulk block partially completed",
      description: `${successCount} of ${matches.length} date(s) blocked from ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} through ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      ...(successCount < matches.length ? { variant: "destructive" as never } : {}),
    });
    setIsBulkBlockOpen(false);
    setBulkReason("");
  };

  const scheduledEvents = bookingsByDate[selectedDateStr] || [];
  const blockEvent = blockedByDate[selectedDateStr];
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  // BlockedDateRequest.php requires date to be today or later — governs both
  // whether a NEW block can be created, and whether an EXISTING block/booking
  // on this date can still be modified.
  const isPastSelected = selectedDateStr < todayStr();

  const isCalendarLoading = loadingBlocks || loadingBookings || loadingWindows;

  // Search matches — client name or event type, current + future bookings first.
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return activeBookings
      .filter((b) => b.clientName.toLowerCase().includes(q) || b.eventType.toLowerCase().includes(q))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [activeBookings, searchQuery]);

  const jumpToBooking = (b: StudioBookingRecord) => {
    const [y, m] = b.date.split("-").map(Number);
    setCurrentMonth(new Date(y, m - 1, 1));
    setSelectedDateStr(b.date);
    setSearchQuery("");
    setIsBlocking(false);
    setIsConfirmingBlock(false);
    setIsConfirmingUnblock(false);
  };

  const legendItems: { key: FilterKey; label: string; icon: any; colorClass: string }[] = [
    { key: "available", label: "Available", icon: Check, colorClass: "text-emerald-600 dark:text-emerald-400" },
    { key: "blocked", label: "Blocked", icon: Ban, colorClass: "text-red-600 dark:text-red-400" },
    { key: "booked", label: "Booked", icon: Camera, colorClass: "text-blue-500" },
    { key: "pending", label: "Pending", icon: Hourglass, colorClass: "text-amber-500" },
    { key: "closed", label: "No Hours Set", icon: Clock, colorClass: "text-muted-foreground" },
    { key: "past", label: "Past", icon: CalendarIcon, colorClass: "text-muted-foreground/60" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">

        {/* Header Options */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Studio Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage availability, view non-conflicting schedules, and securely block dates.</p>
          </div>

          <div className="flex flex-wrap gap-4 bg-card px-4 py-2.5 rounded-md border border-border/60 text-xs font-medium shadow-sm">
            {legendItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveFilter(isActive ? null : item.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors",
                    item.colorClass,
                    isActive ? "bg-muted ring-1 ring-inset ring-current" : "hover:bg-muted/50"
                  )}
                  title={`Filter: ${item.label}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name or event type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-1 ring-primary"
          />
          {searchMatches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-md shadow-lg overflow-hidden">
              {searchMatches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => jumpToBooking(b)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between gap-2 border-b border-border/40 last:border-b-0"
                >
                  <span className="font-medium truncate">{b.clientName} — {b.eventType}</span>
                  <span className="text-muted-foreground shrink-0">{b.date}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar interface column */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border/50 p-5 card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h2 className="font-heading font-bold text-lg">{monthName}</h2>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={goToToday}>
                    <CalendarDays className="w-3.5 h-3.5" /> Today
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { setBulkFromDate(todayStr()); setBulkUntilDate(endOfMonthStr(currentMonth)); setIsBulkBlockOpen(true); }}>
                    <Repeat className="w-3.5 h-3.5" /> Bulk Block
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground mb-2">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              {isCalendarLoading ? (
                <div className="grid grid-cols-7 gap-2 auto-rows-[92px]">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="rounded-md bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2 auto-rows-[92px]">
                  {Array.from({ length: startOffset }).map((_, i) => (
                    <div key={`offset-${i}`} className="bg-muted/20 border border-transparent rounded-md" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(year, monthIndex, day);
                    const dayBookings = bookingsByDate[dateStr] || [];
                    const status = getDayStatus(dateStr);
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    const isSelected = selectedDateStr === dateStr;
                    const isPast = dateStr < todayStr();
                    const hasContent = !!blockedByDate[dateStr] || dayBookings.length > 0;
                    const isDisabled = isPast && !hasContent;

                    const hasUrgentHold = dayBookings.some(
                      (b) => b.status === "pending" && b.holdExpiresAt && hoursUntil(b.holdExpiresAt) <= URGENT_HOLD_HOURS
                    );

                    const overviewText =
                      status === "blocked"
                        ? (blockedByDate[dateStr]?.reason || "Blocked")
                        : status === "mixed"
                        ? summarizeBookings(dayBookings)
                        : status === "booked" || status === "pending"
                        ? dayBookings[0].eventType
                        : null;

                    const matchesFilter =
                      activeFilter === null
                        ? true
                        : activeFilter === "past"
                        ? isPast
                        : !isPast && status === activeFilter;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => !isDisabled && handleDayClick(day)}
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        title={overviewText ?? undefined}
                        className={cn(
                          "p-2 rounded-md border flex flex-col justify-between text-left transition-all relative group",
                          isPast && !hasContent
                            ? "bg-muted/30 border-transparent cursor-not-allowed"
                            : isPast && hasContent
                            ? cn(config.bg, "opacity-80")
                            : config.bg,
                          isSelected && !isDisabled ? "ring-2 ring-primary border-transparent" : !isDisabled && "border-border/40",
                          activeFilter !== null && !matchesFilter && "opacity-30"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={cn(
                            "text-xs font-semibold",
                            isDisabled ? "text-muted-foreground/40" : isSelected ? "text-primary font-bold" : "text-foreground"
                          )}>
                            {day}
                          </span>
                          {hasUrgentHold && !isDisabled && (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          )}
                        </div>

                        {status === "blocked" ? (() => {
                          const block = blockedByDate[dateStr];
                          return (
                          <div className="min-w-0">
                            <span className={cn(
                              "block text-[9px] leading-tight font-semibold px-0.5",
                              isDisabled ? "text-muted-foreground/40" : config.text
                            )}>
                              {formatBlockLabel(block)}
                            </span>
                            {block && block.reason && (
                              <span className={cn(
                                "block text-[9px] leading-tight truncate px-0.5",
                                isDisabled ? "text-muted-foreground/40" : config.text
                              )}>
                                {block.reason}
                              </span>
                            )}
                          </div>
                          );
                        })() : (
                          overviewText && (
                            <span className={cn(
                              "text-[9px] leading-tight truncate px-0.5",
                              isDisabled ? "text-muted-foreground/40" : config.text
                            )}>
                              {overviewText}
                            </span>
                          )
                        )}

                        <div className="flex items-center justify-between mt-auto w-full">
                          <StatusIcon className={cn("w-3.5 h-3.5", isDisabled ? "text-muted-foreground/30" : cn("opacity-80", config.text))} />
                          {!isDisabled && !isPast && (
                            <div className="flex gap-0.5">
                              {dayBookings.slice(0, 3).map((b) => {
                                const urgent = b.status === "pending" && b.holdExpiresAt && hoursUntil(b.holdExpiresAt) <= URGENT_HOLD_HOURS;
                                return (
                                  <span
                                    key={b.id}
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      urgent ? "bg-red-500" : b.status === "pending" ? "bg-amber-500" : "bg-blue-500"
                                    )}
                                  />
                                );
                              })}
                              {dayBookings.length > 3 && <span className="text-[8px] leading-none text-muted-foreground">+</span>}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions Panel Column */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border/50 p-5 card-shadow space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-heading font-bold text-sm">
                    {selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                {isPastSelected && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    Past · Read-only
                  </span>
                )}
              </div>

              {/* 1. SCHEDULED EVENTS */}
              {scheduledEvents.length > 0 && !isBlocking && (
                <div className="space-y-3 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scheduled Events</span>
                    <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{scheduledEvents.length}</span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {scheduledEvents.map((evt) => {
                      const urgentHours = evt.status === "pending" && evt.holdExpiresAt ? hoursUntil(evt.holdExpiresAt) : null;
                      return (
                        <div key={evt.id} className="bg-muted/40 rounded-md p-3 space-y-3 text-xs border border-border/40">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-foreground mb-0.5">{evt.eventType}</p>
                              <p className="text-muted-foreground">Client: <span className="font-medium text-foreground">{evt.clientName}</span></p>
                            </div>
                            {evt.status === "pending" && <Hourglass className="w-4 h-4 text-amber-500" />}
                            {(evt.status === "confirmed" || evt.status === "completed") && <Camera className="w-4 h-4 text-blue-500" />}
                          </div>

                          {urgentHours !== null && (
                            <div className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold",
                              urgentHours <= URGENT_HOLD_HOURS ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                            )}>
                              <AlertTriangle className="w-3 h-3" /> Hold expires in {urgentHours}h
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 bg-background border border-border/50 px-2 py-1.5 rounded text-[11px] text-foreground font-medium">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ""}</span>
                          </div>

                          <Button
                            variant="outline" size="sm"
                            className="w-full gap-1.5 bg-card hover:bg-muted font-medium border-border text-foreground transition-all h-8"
                            onClick={() => setShowBookingDetails(evt)}
                          >
                            View Details <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. BLOCKOUT STATUS */}
              {blockEvent && !isBlocking && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                    <div className="flex items-center gap-2 mt-1 font-medium capitalize text-sm">
                      <Ban className="w-4 h-4 text-red-500" /> Blocked ({formatBlockLabel(blockEvent)})
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reason for Lockout</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{blockEvent.reason || "No reason provided"}</p>
                  </div>

                  {isPastSelected ? (
                    <p className="text-[11px] text-muted-foreground bg-muted/50 p-2.5 rounded-md">
                      This blockout is in the past and can no longer be modified.
                    </p>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/5 border-destructive/20 mt-2" onClick={() => setIsConfirmingUnblock(true)}>
                      Remove Blockout
                    </Button>
                  )}
                </div>
              )}

              {/* 3. BLOCK ACTION BUTTON — hidden entirely for past dates, not just disabled */}
              {!blockEvent && !isBlocking && !isPastSelected && (
                <div className="pt-2">
                   <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setIsBlocking(true)}>
                    <Ban className="w-4 h-4" /> Block This Date
                  </Button>
                </div>
              )}

              {/* 4. EMPTY STATE */}
              {scheduledEvents.length === 0 && !blockEvent && !isBlocking && (
                <div className="text-center pb-2">
                  <p className="text-xs text-muted-foreground">
                    {isPastSelected ? "No activity recorded for this past date." : "This day is completely open and available for client matching."}
                  </p>
                </div>
              )}

              {/* 5. BLOCKING FORM */}
              {isBlocking && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason (Optional)</label>
                    <input
                      type="text"
                      maxLength={255}
                      placeholder="e.g., Vacation, equipment maintenance..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Block Duration</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["full", "half", "custom"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setBlockMode(mode)}
                          className={cn(
                            "h-9 rounded-md border text-xs font-medium transition-colors",
                            blockMode === mode
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input text-foreground hover:bg-muted"
                          )}
                        >
                          {mode === "full" ? "Full Day" : mode === "half" ? "Half Day" : "Specific Time"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {blockMode === "half" && (
                    <div className="grid grid-cols-2 gap-2">
                      {(["morning", "afternoon"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setHalfDayPeriod(period)}
                          className={cn(
                            "h-9 rounded-md border text-xs font-medium capitalize transition-colors",
                            halfDayPeriod === period
                              ? "bg-primary/10 text-primary border-primary/40"
                              : "bg-background border-input text-foreground hover:bg-muted"
                          )}
                        >
                          {period} ({formatTime12h(HALF_DAY_RANGES[period].start)}–{formatTime12h(HALF_DAY_RANGES[period].end)})
                        </button>
                      ))}
                    </div>
                  )}

                  {blockMode === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Time</label>
                        <input
                          type="time"
                          value={blockStartTime}
                          onChange={(e) => setBlockStartTime(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End Time</label>
                        <input
                          type="time"
                          value={blockEndTime}
                          onChange={(e) => setBlockEndTime(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setIsBlocking(false); resetBlockForm(); }}>Cancel</Button>
                    <Button size="sm" className="w-full gap-1.5" onClick={() => setIsConfirmingBlock(true)}>
                      <Ban className="w-3.5 h-3.5" /> Confirm Block
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usual Booking Hours — same section style as the rest of this page,
            using the existing useBookingHours hooks/service directly. */}
        <div className="bg-card rounded-lg border border-border/50 p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/60 pb-3">
            <div>
              <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Usual Booking Hours
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set the days and hours when clients can start a booking. Days left blank are unavailable by default.
                Use the calendar above to open or block specific one-off dates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Booking Interval</label>
                <p className="text-[11px] text-muted-foreground/80">Controls how frequently available start times appear to clients.</p>
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={60}
                onChange={(e) => updateSlotInterval.mutate(Number(e.target.value))}
              >
                {SLOT_INTERVAL_OPTIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BOOKING_HOUR_DAYS.map((label, day) => (
              <div key={day} className="p-3 rounded-md border border-border/40 bg-muted/20">
                <p className="font-medium text-sm mb-2">{label}</p>

                {bookingHoursForDay(day).length === 0 && (
                  <p className="text-xs text-muted-foreground mb-2">Unavailable — no hours set.</p>
                )}

                <div className="space-y-1.5">
                  {bookingHoursForDay(day).map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs bg-background border border-border/40 rounded px-2 py-1.5">
                      <span>{h.start_time}–{h.end_time}</span>
                      <button onClick={() => setPeriodToDelete({ id: h.id, day, start: h.start_time, end: h.end_time })} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <input type="time" className="h-8 rounded border border-input px-1.5 text-xs w-[6.5rem]"
                    value={newBookingHourPeriod[day]?.start || ""}
                    onChange={(e) => setNewBookingHourPeriod((p) => ({ ...p, [day]: { ...p[day], start: e.target.value } }))} />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="time" className="h-8 rounded border border-input px-1.5 text-xs w-[6.5rem]"
                    value={newBookingHourPeriod[day]?.end || ""}
                    onChange={(e) => setNewBookingHourPeriod((p) => ({ ...p, [day]: { ...p[day], end: e.target.value } }))} />
                  <Button size="sm" variant="outline" className="h-8 gap-1 px-2" onClick={() => addBookingHourPeriod(day)} disabled={createBookingHour.isPending}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Delete Booking Hour Period */}
      {periodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-heading font-bold text-md uppercase tracking-wide">Remove Period</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPeriodToDelete(null)} className="h-8 w-8 rounded-full" disabled={deleteBookingHour.isPending}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Remove <span className="font-bold">{BOOKING_HOUR_DAYS[periodToDelete.day]} {periodToDelete.start}–{periodToDelete.end}</span> from your Usual Booking Hours?
              </p>
              <p className="text-xs text-muted-foreground">
                Clients will no longer be able to start new bookings in this window. Any bookings already confirmed within it are not affected.
              </p>
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setPeriodToDelete(null)} disabled={deleteBookingHour.isPending}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteBookingHour.isPending}
                onClick={() => {
                  deleteBookingHour.mutate(periodToDelete.id, { onSuccess: () => setPeriodToDelete(null) });
                }}
              >
                {deleteBookingHour.isPending ? "Removing..." : "Remove Period"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Block Out Date */}
      {isConfirmingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-heading font-bold text-md uppercase tracking-wide">Confirm Blockout</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsConfirmingBlock(false)} className="h-8 w-8 rounded-full" disabled={createBlock.isPending}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Are you sure you want to block out <span className="font-bold">{selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>?
              </p>
              {scheduledEvents.length > 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {scheduledEvents.length} existing booking{scheduledEvents.length > 1 ? "s" : ""} on this date
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-400/70">
                    Blocking this date won't cancel or affect {scheduledEvents.length > 1 ? "them" : "it"} — it only stops new client requests from coming in.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This action will restrict clients from matching or requesting reservations on this date.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmingBlock(false)} disabled={createBlock.isPending}>Review Form</Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSaveBlock} disabled={createBlock.isPending}>
                {createBlock.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> Blocking</> : "Confirm Block"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Remove Blockout */}
      {isConfirmingUnblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-heading font-bold text-md uppercase tracking-wide">Confirm Unblock</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsConfirmingUnblock(false)} className="h-8 w-8 rounded-full" disabled={deleteBlock.isPending}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Open up <span className="font-bold">{selectedDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                This will lift the restriction, making this date visible and available for incoming client bookings.
              </p>
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmingUnblock(false)} disabled={deleteBlock.isPending}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleRemoveBlock} disabled={deleteBlock.isPending}>
                {deleteBlock.isPending ? "Removing..." : "Confirm Unblock"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Block Date Range */}
      {isBulkBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-md">Bulk Block Date Range</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsBulkBlockOpen(false)} className="h-8 w-8 rounded-full" disabled={isBulkProcessing}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Blocks every open date within the range below. Dates already blocked are skipped.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From</label>
                  <input
                    type="date"
                    min={todayStr()}
                    value={bulkFromDate}
                    onChange={(e) => setBulkFromDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Until</label>
                  <input
                    type="date"
                    min={bulkFromDate || todayStr()}
                    value={bulkUntilDate}
                    onChange={(e) => setBulkUntilDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 ring-primary"
                  />
                </div>
              </div>
              {bulkFromDate < todayStr() && (
                <p className="text-xs text-destructive">Start date can't be in the past.</p>
              )}
              {bulkUntilDate < bulkFromDate && (
                <p className="text-xs text-destructive">End date can't be before the start date.</p>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason (Optional)</label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="e.g., Weekly day off"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 ring-primary"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsBulkBlockOpen(false)} disabled={isBulkProcessing}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleBulkBlock}
                disabled={isBulkProcessing || bulkFromDate < todayStr() || bulkUntilDate < bulkFromDate}
                className="gap-1.5"
              >
                {isBulkProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Blocking</> : <><Ban className="w-3.5 h-3.5" /> Block Date Range</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Overlay Modal */}
      {showBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Booking #{showBookingDetails.id}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowBookingDetails(null)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{showBookingDetails.eventType}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                  (showBookingDetails.status === 'confirmed' || showBookingDetails.status === 'completed')
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                )}>
                  {showBookingDetails.status}
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                 <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timing</h4>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-foreground font-medium">
                      <span>Starting Time</span>
                      <span>{showBookingDetails.startTime}</span>
                    </div>
                    <div className="flex justify-between items-center font-medium text-foreground border-t border-border/60 pt-2">
                      <span>Expected End Time <span className="text-[10px] font-normal text-muted-foreground align-middle">(optional)</span></span>
                      <span className={cn(!showBookingDetails.endTime && "text-muted-foreground font-normal italic")}>
                        {showBookingDetails.endTime ?? "Not set — duration wasn't fixed at booking"}
                      </span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Client</span>
                  <p className="font-medium">{showBookingDetails.clientName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</span>
                  <p className="font-medium text-sm">{showBookingDetails.eventAddress || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBookingDetails(null)}>Close</Button>
              <Button onClick={() => navigate(`/studio/bookings/${showBookingDetails.id}`)}>View Full Booking Details</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}