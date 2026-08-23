import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Calendar as CalendarIcon,
  ChevronLeft, Sparkles, Wand2, Package as PackageIcon, Info, Clock, MapPin,
  LogIn, Lock, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  formatPrice, defaultCustomRates, type Photographer, type CustomRates,
} from "@/data/photographers";
import { usePhotographer, usePhotographers } from "@/hooks/usePhotographers";
import { useMonthAvailability, useAvailableStartTimes } from "@/hooks/usePhotographerAvailability";
import { useToast } from "@/hooks/use-toast"; // 
import { useRole } from "@/contexts/RoleContext";
import { bookingService, type CreateBookingPayload } from "@/services/bookingService";

const steps = ["Date & Time", "Event Info", "Package", "Add-ons", "Review"];

// Strictly mapped to SRS Section 7.11
const systemEventTypes = [
  "Wedding", "Birthday", "Prenup", "Graduation", 
  "Portrait", "Corporate Event", "Product Photography", 
  "Family Event", "Other"
];

// Strictly mapped to SRS Section 7.12
const locationTypes = [
  "Studio", "Client Location", "Outdoor Location", "Other"
];

interface CustomBuild {
  selectedExtraIds: string[];
}

function makeDefaultBuild(): CustomBuild {
  return { selectedExtraIds: [] };
}

function calculateCustomPrice(b: CustomBuild, r: CustomRates): number {
  const extrasPrice = (r.extras ?? [])
    .filter((e) => b.selectedExtraIds.includes(e.id))
    .reduce((sum, e) => sum + e.price, 0);
  return r.baseFee + extrasPrice;
}

export default function Booking() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useRole();
  const { toast } = useToast();

  const { data: photographer, isLoading: loadingPhotographer } = usePhotographer(id);
  const { data: allPhotographers = [] } = usePhotographers();
  const rates = photographer?.customRates ?? defaultCustomRates;

  const initialPkgParam = searchParams.get("package");
  const initialPkg = initialPkgParam !== null ? parseInt(initialPkgParam) : -1;

  const [step, setStep] = useState(0);
  const [packageMode, setPackageMode] = useState<"fixed" | "custom">("fixed");
  const [selectedPkg, setSelectedPkg] = useState<number>(initialPkg);
  const [customBuild, setCustomBuild] = useState<CustomBuild>(makeDefaultBuild());
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([]);

  // Date & event details
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState(""); // optional — client rarely knows the exact end in advance
  
  const [eventType, setEventType] = useState("");
  const [specificEventType, setSpecificEventType] = useState(""); 
  
  // Refined Location State (Section 7.12)
  const [locationType, setLocationType] = useState(locationTypes[0]);
  const [eventAddress, setEventAddress] = useState("");
  
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");

  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");

  // Modal & Submission States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const p = photographer;
  // Real, per-photographer add-ons from the backend (via photographerService's
  // normalizeAddOn) — NOT the generic mock addOns list from data/photographers.ts,
  // which isn't tied to any actual photographer or backend row.
  const photographerAddOns = (p as any)?.addOns ?? [];
  const pkg = p && selectedPkg >= 0 ? p.packages[selectedPkg] ?? null : null;

  const dateStr = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

  // The availability calendar needs a package_id (slot length depends on
  // duration + buffer), but date is picked in Step 0, before Package (Step
  // 2). Prefer the package the client has actually selected (selectedPkg,
  // set once Step 2 runs) so availability reflects their real choice; before
  // that, fall back to whichever package they arrived with via ?package=,
  // else the photographer's first listed package, as a best-effort stand-in
  // — the exact slot is re-validated for real once a package is confirmed
  // and again by the backend at submission.
  //
  // NOTE: this depends on Package objects carrying a real numeric `id` —
  // see the `id?: number` field added to the Package interface in
  // photographers.ts. If photographerService.ts doesn't populate that id
  // from the backend response, this will stay undefined and the calendar
  // below will silently stop reflecting real availability.
  const candidatePkg =
    selectedPkg >= 0 ? p?.packages[selectedPkg]
    : initialPkg >= 0 ? p?.packages[initialPkg]
    : p?.packages[0];
  const calendarPackageId: number | undefined = candidatePkg?.id;

  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const viewMonthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;

  const { data: monthAvailability, isLoading: loadingAvailability } = useMonthAvailability(
    p?.id,
    viewMonthStr,
    calendarPackageId
  );

  // Real bookable start times for the selected date + the package currently
  // in play (see calendarPackageId's fallback logic above). This is what
  // CreateBookingAction.php actually checks at submission — the old hardcoded
  // hourly button list + free-type time input were never validated against
  // this at all, which is why a day could show "available" while the exact
  // time picked wasn't.
  const { data: availableStartTimes = [], isLoading: loadingStartTimes } = useAvailableStartTimes(
    p?.id,
    dateStr,
    calendarPackageId
  );

  // Sorted so they render in order as tappable pills.
  const sortedStartTimes = useMemo(
    () => [...availableStartTimes].sort(),
    [availableStartTimes]
  );
  const isStartTimeAvailable = startTime !== "" && availableStartTimes.some((t) => t.slice(0, 5) === startTime);

  const isDateUnavailable = (d: Date) => {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const status = monthAvailability?.[ds];
    return status === "unavailable" || status === "past";
  };

  const bookedDates = useMemo(() => {
    if (!p) return [];
    return p.bookedSlots.map((s) => {
      const [y, m, d] = s.date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [p]);

  const dayConflict = p?.bookedSlots.find((s) => s.date === dateStr);

  // Calendar color-coding (red/yellow/gray). "booked" here means the whole
  // day has no open slots left — bookedSlots already covers that; monthAvailability
  // status strings "unavailable"/"booked"/"fully_booked" are treated the same way.
  // "partial" (yellow) depends on the backend/useMonthAvailability actually
  // returning a "partially_booked" status per date — if it never sends that
  // value, every open day will just render as plain "available" instead of
  // ever going yellow, since there's no other client-side signal for partial
  // availability.
  const getDateStatus = (d: Date): "past" | "booked" | "partial" | "available" | "unknown" => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  if (d < today) return "past";
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const status = monthAvailability?.[ds];
  if (bookedDates.some((bd) => bd.toDateString() === d.toDateString())) return "booked";
  if (status === "unavailable" || status === "booked" || status === "fully_booked") return "booked";
  if (status === "partially_booked" || status === "partial") return "partial";
  if (status === "available") return "available";
  // No answer yet for this date — the query hasn't resolved, or it's
  // disabled because calendarPackageId is undefined. Fail closed instead
  // of defaulting to "available": this is what let blocked/unverified
  // dates through un-marked and clickable.
  return "unknown";
};

  // Package selection (Step 2) can change the required slot duration, which
  // can invalidate a start time picked back in Step 0 against a placeholder
  // package. Re-check whenever the effective package changes and clear the
  // stale time rather than letting the user reach Review with a time that
  // will fail at final submission.
  useEffect(() => {
    if (!date || !startTime || loadingStartTimes) return;
    if (!availableStartTimes.includes(startTime)) {
      setStartTime("");
      toast({
        title: "Start time no longer available",
        description: "Your package selection changed the required time slot — please choose a new start time.",
        variant: "destructive",
      });
    }
    // Only re-run when the package (and thus required duration) changes —
    // not on every availableStartTimes refetch, which would fight the user
    // while they're actively picking a time in Step 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarPackageId]);

  const alternativeProviders = useMemo<Photographer[]>(() => {
    if (!p || !date) return [];
    return allPhotographers
      .filter((other) => other.id !== p.id)
      .filter((other) => !other.bookedSlots.some((s) => s.date === dateStr))
      .slice(0, 3);
  }, [p, date, dateStr, allPhotographers]);

  if (loadingPhotographer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading booking…</p>
      </div>
    );
  }

  if (!photographer || !p) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading font-bold text-xl mb-2">Photographer not found</h2>
          <Link to="/explore"><Button>Back to Explore</Button></Link>
        </div>
      </div>
    );
  }

  const toggleAddOn = (i: number) => {
    setSelectedAddOns((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const customPrice = calculateCustomPrice(customBuild, rates);
    // Group custom-package extras that share a tierName into single-select
  // "pill" groups (e.g. Edited Photos: 50/100/200/300/Unlimited). Extras
  // with no tierName stay as independent on/off toggles (e.g. RAW Files).
  const tierGroups = useMemo(() => {
    const groups = new Map<string, typeof rates.extras>();
    for (const extra of rates.extras ?? []) {
      const key = (extra as any).tierName as string | undefined;
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(extra);
    }
    return Array.from(groups.entries());
  }, [rates.extras]);

  const flatExtras = (rates.extras ?? []).filter((e) => !(e as any).tierName);

  // A group's "baseline" option (price 0) is the one shown as active when
  // nothing in that group has been explicitly picked yet.
  const isTierOptionActive = (groupExtras: typeof rates.extras, extra: (typeof rates.extras)[number]) => {
    const groupIds = groupExtras!.map((e) => e.id);
    const explicit = customBuild.selectedExtraIds.find((id) => groupIds.includes(id));
    return explicit ? explicit === extra.id : extra.price === 0;
  };

  const selectTierOption = (groupExtras: typeof rates.extras, chosen: (typeof rates.extras)[number]) => {
    const groupIds = groupExtras!.map((e) => e.id);
    setCustomBuild((prev) => {
      const withoutGroup = prev.selectedExtraIds.filter((id) => !groupIds.includes(id));
      return {
        ...prev,
        selectedExtraIds: chosen.price === 0 ? withoutGroup : [...withoutGroup, chosen.id],
      };
    });
  };
  const packagePrice = packageMode === "fixed" ? (pkg?.price ?? 0) : customPrice;
  const packageName  = packageMode === "fixed" ? (pkg?.name ?? "—") : "Custom Package";
  const packagePhotos = packageMode === "fixed" ? (pkg?.photos ?? 0) : 0;

  const subtotal = packagePrice + (packageMode === "fixed" ? selectedAddOns.reduce((sum, i) => sum + photographerAddOns[i].price, 0) : 0);

  type StepValidation = { ok: boolean; reason?: string };
  const validateStep = (s: number): StepValidation => {
    switch (s) {
      case 0:
        if (!date) return { ok: false, reason: "Please pick an event date to continue." };
        if (dayConflict) return { ok: false, reason: "This date is fully booked — choose another date or try an alternative provider below." };
        if (!startTime) return { ok: false, reason: "Please choose a start time for your event." };
        if (!isStartTimeAvailable) return { ok: false, reason: "That start time isn't open — please pick a time the photographer is available." };
        if (endTime && endTime <= startTime) return { ok: false, reason: "End time should be after the start time." };
        return { ok: true };
      case 1:
        if (!eventType) return { ok: false, reason: "Please choose an event type." };
        if (eventType === "Other" && !specificEventType.trim()) return { ok: false, reason: "Please specify the event type." };
        
        // Location Validation per SRS Section 7.12
        if (!locationType) return { ok: false, reason: "Please select a location type." };
        if ((locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other") && !eventAddress.trim()) {
          return { ok: false, reason: "Please provide the full event address for your selected location type." };
        }
        
        if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim())
          return { ok: false, reason: "Please complete your contact details (name, phone, email)." };
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail.trim()))
          return { ok: false, reason: "Please enter a valid email address." };
        
        return { ok: true };
      case 2:
        if (packageMode === "fixed" && !pkg) return { ok: false, reason: "Please select a package to continue." };
        return { ok: true };
      case 3: return { ok: true };
      case 4: return { ok: true };
      default: return { ok: true };
    }
  };
  
  const currentValidation = validateStep(step);

  const handleNext = () => {
    const v = validateStep(step);
    if (!v.ok) { 
      toast({ title: "Missing information", description: v.reason || "Please complete the required fields.", variant: "destructive" });
      return; 
    }
    
    if (step === 1) {
      setEventAddress(eventAddress.trim());
      setContactName(contactName.trim());
      setContactPhone(contactPhone.trim());
      setContactEmail(contactEmail.trim());
      if (eventType === "Other") setSpecificEventType(specificEventType.trim());
    }
    
    setStep(step + 1);
  };

  const handleOpenConfirm = () => {
    for (let i = 0; i <= 4; i++) {
      const v = validateStep(i);
      if (!v.ok) { 
        toast({ title: "Missing information", description: v.reason || "Please complete the required fields.", variant: "destructive" });
        setStep(i); 
        return; 
      }
    }
    setIsConfirmModalOpen(true);
  };

  // Converts UI labels ("Corporate Event", "Client Location") into the
  // snake_case enum values CreateBookingRequest.php validates against
  // ("corporate_event", "client_location").
  const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "_");

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO(backend): CreateBookingPayload doesn't declare end_time yet — cast
      // here until bookingService.ts adds `end_time?: string` to the type.
      const payload: CreateBookingPayload & { end_time?: string } = {
        photographer_id: Number(p.id),
        event_type: toSlug(eventType) as CreateBookingPayload["event_type"],
        ...(eventType === "Other" ? { custom_event_type: specificEventType.trim() } : {}),
        event_date: dateStr,
        start_time: startTime,
        // Optional — only sent when the client actually filled it in. Requires
        // CreateBookingPayload (bookingService.ts) to have end_time?: string,
        // and CreateBookingRequest.php to validate it as nullable.
        ...(endTime ? { end_time: endTime } : {}),
        location_type: toSlug(locationType) as CreateBookingPayload["location_type"],
        ...(locationType !== "Studio" ? { event_address: eventAddress.trim() } : {}),
        ...(guestCount.trim() ? { guest_count: parseInt(guestCount, 10) } : {}),
        ...(notes.trim() ? { special_requests: notes.trim() } : {}),
        ...(packageMode === "fixed"
          ? {
              package_id: (pkg as any)?.id,
              ...(selectedAddOns.length
                ? { add_on_ids: selectedAddOns.map((i) => Number(photographerAddOns[i].id)) }
                : {}),
            }
          : {
              is_custom_package: true,
              custom_component_ids: customBuild.selectedExtraIds.map(Number),
            }),
      };

      const booking = await bookingService.create(payload);
      toast({ title: "Booking request submitted successfully!" });
      setIsConfirmModalOpen(false);
      navigate(`/booking-sent/${booking.id}`);
    } catch (error) {
      console.error("Submission failed", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const prettyTime = (t: string) => {
    if (!t) return "";
    const [hh, mm] = t.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
  };

  return (
    <div className="min-h-screen bg-background relative">
      {!user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-md bg-background/60 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-heading font-bold text-xl mb-2">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You need an account to book {p.name}. Browse freely — sign in only when you're ready.
            </p>
            <div className="flex flex-col gap-2">
              <Link to={`/login?redirect=/booking/${p.id}`}>
                <Button className="w-full gap-2"><LogIn className="w-4 h-4" /> Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="w-full">Create an account</Button>
              </Link>
              <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground mt-2">
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
      {user && role !== "client" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-md bg-background/60 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Info className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="font-heading font-bold text-xl mb-2">Client accounts only</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You're signed in as a {role === "studio" ? "studio/photographer" : role} account. Only client accounts can submit booking requests — sign in with a client account to book {p.name}.
            </p>
            <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">
              Go back
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>{step > 0 ? "Back" : "Cancel"}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-heading text-xs font-bold">{p.avatar}</div>
            <span className="font-heading font-semibold text-sm">{p.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i === step ? "bg-primary text-primary-foreground" :
                  i < step ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < steps.length - 1 && <div className={cn("w-6 h-px", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {!currentValidation.ok && (
          <div className="mb-5 p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-start gap-2 animate-fade-in">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs">{currentValidation.reason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* ===== Step 0: Date ===== */}
            {step === 0 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Pick Your Event Date</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Let's check if the date is open, then pick your start time. If you're not sure yet when the event will wrap up, that's fine — end time is optional and the photographer will confirm it based on your package and buffer time.
                </p>

                <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary/20 border border-primary/40" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400/30 border border-amber-500/50" /> Partially booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive/40" /> Fully booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted border border-border" /> Past date</span>
                  {loadingAvailability && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
                    </span>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  <div className="flex justify-center shrink-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      month={viewMonth}
                      onMonthChange={setViewMonth}
                      onSelect={setDate}
                      disabled={(d) => {
                          const s = getDateStatus(d);
                          return s === "past" || s === "booked" || s === "unknown" || isDateUnavailable(d);
                        }}
                        modifiers={{
                          past: (d) => getDateStatus(d) === "past",
                          booked: (d) => getDateStatus(d) === "booked",
                          partial: (d) => getDateStatus(d) === "partial",
                          unknown: (d) => getDateStatus(d) === "unknown",
                        }}
                        modifiersClassNames={{
                          past: "!text-muted-foreground/40 !bg-transparent cursor-not-allowed",
                          booked: "!text-destructive !opacity-100 !bg-transparent line-through cursor-not-allowed",
                          partial: "!text-amber-600 dark:!text-amber-400 !bg-transparent font-semibold",
                          unknown: "!text-muted-foreground/40 !bg-transparent cursor-not-allowed",
                        }}
                      className="rounded-xl border pointer-events-auto"
                      showOutsideDays
                    />
                  </div>

                  {/* Right side of the box, next to the calendar — availability
                      result + start/end time pickers, or the booked-date
                      conflict panel, depending on what's selected. */}
                  <div className="flex-1 min-w-0 w-full space-y-4">
                    {!date && (
                      <div className="h-full min-h-[280px] flex items-center justify-center p-6 rounded-xl border border-dashed border-border text-center">
                        <p className="text-sm text-muted-foreground">Pick a date on the calendar to choose your start time.</p>
                      </div>
                    )}

                    {date && !dayConflict && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                          <Check className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} is available!</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Now pick your event start time below.</p>
                          </div>
                        </div>

                        <div className="p-5 rounded-xl border border-border">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary" />
                              <p className="font-medium text-sm">Start Time *</p>
                            </div>
                            {!loadingStartTimes && availableStartTimes.length > 0 && (
                              <span className="text-[11px] text-muted-foreground">{availableStartTimes.length} open</span>
                            )}
                          </div>

                          {loadingStartTimes ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking available times…
                            </p>
                          ) : availableStartTimes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No start times are open on this date for the selected package. Try another date.
                            </p>
                          ) : (
                            <>
                              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                {sortedStartTimes.map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setStartTime(t)}
                                    className={cn(
                                      "shrink-0 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors",
                                      startTime === t
                                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                        : "border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10"
                                    )}
                                  >
                                    {prettyTime(t)}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-3">
                                Every time shown here is open — tap one to select it. Scroll for more.
                              </p>
                            </>
                          )}
                        </div>

                        <div className="p-5 rounded-xl border border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              End Time <span className="text-muted-foreground font-normal">(optional)</span>
                            </p>
                          </div>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={cn(
                              "h-11 w-full rounded-lg border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary",
                              endTime && startTime && endTime <= startTime ? "border-destructive" : "border-border"
                            )}
                          />
                          {endTime && startTime && endTime <= startTime ? (
                            <p className="text-[11px] text-destructive mt-2">End time should be after the start time.</p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              Leave this blank if you're not sure yet — the photographer will confirm the expected end time based on your package and buffer time.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {date && dayConflict && (
                      <div className="p-4 rounded-xl border border-accent/30 bg-accent/5">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">This date is already booked</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {p.name} has a {dayConflict.eventType} at {dayConflict.startTime} on this day. Try a different date — or check these available providers:
                            </p>
                            {alternativeProviders.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {alternativeProviders.map((alt) => (
                                  <Link key={alt.id} to={`/booking/${alt.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-heading text-xs font-bold">{alt.avatar}</div>
                                      <div>
                                        <p className="font-medium text-sm">{alt.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{alt.type} · {alt.specialty} · from {formatPrice(alt.priceMin)}</p>
                                      </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-2">No alternative providers available — please choose a different date.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== Step 1: Event Info ===== */}
            {step === 1 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up space-y-5">
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-1">Event & Contact Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your event and how the photographer can reach you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <select
                    id="eventType"
                    value={eventType}
                    onChange={(e) => {
                      setEventType(e.target.value);
                      if (e.target.value !== "Other") setSpecificEventType("");
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select event type…</option>
                    {systemEventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  
                  {eventType === "Other" && (
                    <div className="mt-3 animate-fade-in space-y-2">
                      <Label htmlFor="specificEventType" className="text-xs text-muted-foreground">Please specify your event *</Label>
                      <Input 
                        id="specificEventType" 
                        placeholder="e.g. Sweet 16, Reunion..."
                        value={specificEventType} 
                        onChange={(e) => setSpecificEventType(e.target.value)} 
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationType">Location Type *</Label>
                  <select
                    id="locationType"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="" disabled hidden>Select location setting…</option>
                    {locationTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {(locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other") && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="address">Event Address *</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="address" className="pl-9" placeholder="Enter complete venue or location address"
                        value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="guestCount">Estimated Guests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="guestCount" type="number" placeholder="e.g. 80"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Full Name *</Label>
                      <Input id="contactName" placeholder="Juan Dela Cruz"
                        value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone Number *</Label>
                      <Input id="contactPhone" placeholder="09XX XXX XXXX"
                        value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="contactEmail">Email Address *</Label>
                    <Input id="contactEmail" type="email" placeholder="juan@email.com"
                      value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Requests / Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea id="notes" rows={3} placeholder="Themes, must-have shots, accessibility, etc."
                    value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            )}

            {/* ===== Step 2: Package ===== */}
            {step === 2 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Choose Your Package</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Pick one of {p.name}'s ready-made packages — or build a custom one using their rates.
                </p>

                <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
                  <button onClick={() => setPackageMode("fixed")}
                    className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                      packageMode === "fixed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <PackageIcon className="w-4 h-4" /> Fixed Packages
                  </button>
                  <button onClick={() => setPackageMode("custom")}
                    className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                      packageMode === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Wand2 className="w-4 h-4" /> Build Your Own
                  </button>
                </div>

                {packageMode === "fixed" && (
                  <div className="space-y-3">
                    {p.packages.map((pk, i) => (
                      <button key={pk.name} onClick={() => setSelectedPkg(i)}
                        className={cn("w-full text-left p-5 rounded-xl border-2 transition-all duration-200",
                          selectedPkg === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-heading font-semibold">{pk.name}</p>
                              {i === 1 && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Popular</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{pk.description}</p>
                          </div>
                          <p className="text-xl font-heading font-bold text-primary shrink-0">{formatPrice(pk.price)}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What's Included</p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {pk.inclusions.map((inc) => (
                              <li key={inc} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {inc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {packageMode === "custom" && (
                  <div className="space-y-6">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>These rates are set by <strong>{p.name}</strong>. Base fee starts at {formatPrice(rates.baseFee)}.</span>
                    </div>

                    {tierGroups.map(([tierName, groupExtras]) => (
                      <div key={tierName} className="space-y-2">
                        <p className="text-sm font-heading font-semibold">{tierName}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {groupExtras!.map((extra) => {
                            const active = isTierOptionActive(groupExtras, extra);
                            return (
                              <button
                                key={extra.id}
                                type="button"
                                onClick={() => selectTierOption(groupExtras, extra)}
                                className={cn(
                                  "text-center p-3 rounded-xl border-2 transition-all duration-200",
                                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                                )}
                              >
                                <p className="text-sm font-medium">{extra.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {extra.price === 0 ? "Included" : `+${formatPrice(extra.price)}`}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {flatExtras.length > 0 && (
                      <div className="space-y-2">
                        {flatExtras.map((extra) => (
                          <div key={extra.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                            <div>
                              <p className="text-sm font-medium">{extra.label}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">+{formatPrice(extra.price)}</span>
                              <Switch
                                checked={customBuild.selectedExtraIds.includes(extra.id)}
                                onCheckedChange={(v) =>
                                  setCustomBuild({
                                    ...customBuild,
                                    selectedExtraIds: v
                                      ? [...customBuild.selectedExtraIds, extra.id]
                                      : customBuild.selectedExtraIds.filter((id) => id !== extra.id),
                                  })
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="w-4 h-4 text-primary" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Price Breakdown</p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Base fee</span><span>{formatPrice(rates.baseFee)}</span></div>
                      
                        {(rates.extras ?? [])
                          .filter((e) => customBuild.selectedExtraIds.includes(e.id))
                          .map((e) => (
                            <div key={e.id} className="flex justify-between"><span className="text-muted-foreground">{e.label}</span><span>+{formatPrice(e.price)}</span></div>
                          ))}
                            </div>
                      <div className="border-t border-primary/20 mt-3 pt-3 flex items-center justify-between">
                        <span className="font-heading font-semibold">Custom Package Total</span>
                        <span className="text-2xl font-heading font-bold text-primary">{formatPrice(customPrice)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== Step 3: Add-ons ===== */}
            {step === 3 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Optional Add-ons</h3>
                {packageMode === "custom" ? (
                  <p className="text-sm text-muted-foreground">
                    Your custom package already includes the extras you selected in the Package step — nothing more to add here.
                  </p>
                ) : (
                <>
                <p className="text-sm text-muted-foreground mb-5">Enhance your booking — feel free to skip this step.</p>
                {photographerAddOns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This photographer hasn't listed any optional add-ons.</p>
                ) : (
                <div className="space-y-3">
                  {photographerAddOns.map((addon: any, i: number) => (
                    <button key={addon.id} onClick={() => toggleAddOn(i)}
                      className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                        selectedAddOns.includes(i) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          selectedAddOns.includes(i) ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                          {selectedAddOns.includes(i) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="text-left">
                          <span className="font-medium text-sm">{addon.name}</span>
                          <p className="text-xs text-muted-foreground">{addon.description}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary">+{formatPrice(addon.price)}</span>
                    </button>
                  ))}
                </div>
                )}
                </>
                )}
              </div>
            )}

            {/* ===== Step 4: Review ===== */}
            {step === 4 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Review Your Booking</h3>
                <p className="text-sm text-muted-foreground mb-5">Double-check everything before sending the request.</p>
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold">{p.avatar}</div>
                    <div>
                      <p className="font-heading font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.type} · {p.specialty}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border space-y-1">
                    <p><span className="text-muted-foreground">Event:</span> {eventType === "Other" ? specificEventType : eventType}</p>
                    <p><span className="text-muted-foreground">Date:</span> {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                    <p><span className="text-muted-foreground">Start time:</span> {prettyTime(startTime)}</p>
                    {endTime && <p><span className="text-muted-foreground">End time (optional):</span> {prettyTime(endTime)}</p>}
                    <p><span className="text-muted-foreground">Setting:</span> {locationType}</p>
                    {eventAddress && <p><span className="text-muted-foreground">Address:</span> {eventAddress}</p>}
                    {guestCount && <p><span className="text-muted-foreground">Guests:</span> ~{guestCount}</p>}
                  </div>
                  <div className="p-4 rounded-xl border border-border">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{packageName}{packageMode === "custom" && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">Custom</span>}</p>
                        <p className="text-xs text-muted-foreground">{packagePhotos === 999 ? "Unlimited" : packagePhotos} photos</p>
                      </div>
                      <p className="font-heading font-bold text-primary">{formatPrice(packagePrice)}</p>
                    </div>
                    {packageMode === "fixed" && selectedAddOns.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1">
                        {selectedAddOns.map((i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">+ {photographerAddOns[i].name}</span>
                            <span>{formatPrice(photographerAddOns[i].price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-border space-y-1">
                    <p><span className="text-muted-foreground">Contact:</span> {contactName} · {contactPhone}</p>
                    <p><span className="text-muted-foreground">Email:</span> {contactEmail}</p>
                    {notes && <p><span className="text-muted-foreground">Notes:</span> {notes}</p>}
                  </div>
                  
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 mt-4">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/90">
                      <strong>Note:</strong> By confirming, your requested time will be temporarily held for up to 24 hours while the professional reviews your request. You won't be charged until it is approved.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar summary */}
          <div>
            <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 sticky top-24">
              <h3 className="font-heading font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                {date && <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{date.toLocaleDateString()}</span></div>}
                {startTime && <div className="flex justify-between"><span className="text-muted-foreground">Start time</span><span className="font-medium">{prettyTime(startTime)}</span></div>}
                {endTime && <div className="flex justify-between"><span className="text-muted-foreground">End time</span><span className="font-medium">{prettyTime(endTime)}</span></div>}
                {eventType && <div className="flex justify-between"><span className="text-muted-foreground">Event</span><span className="font-medium">{eventType === "Other" && specificEventType ? specificEventType : eventType}</span></div>}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{packageMode === "fixed" ? (pkg ? `${pkg.name} Package` : "No package selected") : "Custom Package"}</span>
                  <span className="font-medium">{formatPrice(packagePrice)}</span>
                </div>
                {packageMode === "fixed" && selectedAddOns.map((i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{photographerAddOns[i].name}</span>
                    <span className="font-medium">{formatPrice(photographerAddOns[i].price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-semibold">Total</span>
                  <span className="text-xl font-heading font-bold text-primary">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {step < steps.length - 1 ? (
                  <Button className="w-full" size="lg" onClick={handleNext} disabled={!currentValidation.ok}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleOpenConfirm}>
                    Submit Booking Request
                  </Button>
                )}
                {step > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous Step
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                No payment is required right now.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-heading font-bold mb-2">Confirm Booking Request</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to submit this booking request? Your requested time will be temporarily held for up to 24 hours while the professional reviews it.
            </p>
            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSubmitting}>Back</Button>
              <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : "Confirm Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}