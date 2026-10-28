import { useState, useMemo, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check,
  ChevronLeft, Sparkles, Wand2, Package as PackageIcon, Info, Clock, MapPin,
  LogIn, Lock, Loader2, X, CalendarPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  formatPrice, defaultCustomRates, inclusionText, type Photographer, type CustomRates,
} from "@/data/photographers";
import { usePhotographer, usePhotographers } from "@/hooks/usePhotographers";
import { useMonthAvailability, useAvailableStartTimes, availableStartTimesQuery } from "@/hooks/usePhotographerAvailability";
import { useClientProfile } from "@/hooks/useClientProfile";
import toast from "react-hot-toast";
import { useRole } from "@/contexts/RoleContext";
   import { bookingService, type CreateBookingPayload } from "@/services/bookingService";
   import { BudgetOfferField, NegotiationBanner } from "@/components/booking/BudgetOfferField";
import { locationService, type Province, type CityMunicipality, type Barangay } from "@/services/locationService";
import { allowedLocationTypes, provinceAllowed, cityAllowed, coverageNote } from "@/data/coverage";
import {
  SessionLocationFields, emptySessionLocation, isSessionLocationComplete, sessionLocationPayload,
  type SessionLocation,
} from "@/components/SessionLocationFields";

const ALL_STEPS = [
  { id: 0, label: "Date & Time" },
  { id: 1, label: "Details" },
  { id: 2, label: "Package" },
  { id: 3, label: "Add-ons" },
  { id: 4, label: "Review" },
];

// Strictly mapped to SRS Section 7.11
const systemEventTypes = [
  "Wedding", "Birthday", "Prenup", "Graduation",
  "Portrait", "Corporate Event", "Product Photography",
  "Family Event", "Other"
];

// Strictly mapped to SRS Section 7.12
const locationTypes = [
  "Studio", "Client Location", "Outdoor Location", "Outside Bicol", "Other"
];

interface CustomBuild {
  selectedExtraIds: string[];
}

function makeDefaultBuild(): CustomBuild {
  return { selectedExtraIds: [] };
}

// Sliding-hours pricing across sessions — mirrors CreateBookingAction::
// resolveCustomPackage. Every session is priced from its OWN hours, never as
// one continuous span. "once": base fee (covering baseHours) charged once for
// the whole booking; "per_schedule": each session gets its own base fee.
function calculateSlidingSessionCharges(r: CustomRates, hoursPerSession: number[]): number[] {
  const rate = r.hourlyRate ?? 0;
  if (r.baseHours == null) return hoursPerSession.map((h) => rate * h);
  if (r.baseFeeMode === "once") {
    let remaining = r.baseHours;
    return hoursPerSession.map((h, i) => {
      const billable = Math.max(0, h - remaining);
      remaining = Math.max(0, remaining - h);
      return (i === 0 ? r.baseFee : 0) + billable * rate;
    });
  }
  return hoursPerSession.map((h) => r.baseFee + Math.max(0, h - (r.baseHours as number)) * rate);
}

function calculateCustomPrice(b: CustomBuild, r: CustomRates, hours?: number | null): number {
  // Sliding-hours mode: price scales off hours instead of a picked duration
  // extra — mirrors CreateBookingAction::resolveCustomPackage's hourly
  // branch. Duration-bearing extras don't apply here (there's nothing to
  // pick — the slider IS the duration), but any other flat/tier extra still
  // stacks on top exactly as before.
  if (r.hourlyRate != null && hours != null) {
    const flatExtrasPrice = (r.extras ?? [])
      .filter((e) => b.selectedExtraIds.includes(e.id) && (e as any).durationMinutes == null)
      .reduce((sum, e) => sum + e.price, 0);
    // Base fee covers baseHours; each extra hour is billed at hourlyRate.
    // No baseHours = older "hours x rate" configs.
    if (r.baseHours != null) {
      return r.baseFee + Math.max(0, hours - r.baseHours) * r.hourlyRate + flatExtrasPrice;
    }
    return r.hourlyRate * hours + flatExtrasPrice;
  }

  const extrasPrice = (r.extras ?? [])
    .filter((e) => b.selectedExtraIds.includes(e.id))
    .reduce((sum, e) => sum + e.price, 0);
  return r.baseFee + extrasPrice;
}

// One additional photography session belonging to THIS booking's single
// package/service — not a separate event. Separate services are separate
// bookings.
type SessionDraft = {
  key: string;
  label: string;
  date: string;
  startTime: string;
  // "" = use the package's duration if it has one, otherwise "to be
  // confirmed". We never invent a length for a session.
  durationHours: string;
  ownLocation: boolean;
  location: SessionLocation;
  // true = this is just another day of the SAME event (e.g. a 2-day
  // wedding) — same venue, no separate description needed. false = a
  // genuinely different session (e.g. a graduation's second batch),
  // which keeps its own description and can have its own location.
  sameEvent: boolean;
  // Only used when sameEvent is false: what THIS session covers (e.g. Prenup).
  eventType: string;
  customEventType: string;
};

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt12 = (t: string) => { const [hh, mm] = t.split(":").map(Number); return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`; };
const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

function SessionDateField({ photographerId, packageId, customDurationMinutes, sessionDurationMinutes, value, onPick, isDateTaken }: {
  photographerId?: string; packageId?: number; customDurationMinutes?: number; sessionDurationMinutes?: number;
  value: string; onPick: (ymd: string) => void;
  isDateTaken?: (ymd: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromYmd(value) : undefined;
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());
  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
  const { data: month, isFetching } = useMonthAvailability(photographerId, monthStr, packageId, customDurationMinutes, sessionDurationMinutes);

  const statusOf = (d: Date): "past" | "booked" | "partial" | "available" | "unknown" => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (d < today) return "past";
    const st = month?.[toYmd(d)] as string | undefined;
    if (st === "unavailable" || st === "booked" || st === "fully_booked") return "booked";
    if (st === "partial" || st === "partially_booked") return "partial";
    if (st === "available") return "available";
    return "unknown"; // fail closed until the backend answers
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-left flex items-center justify-between">
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select date"}
          </span>
          <CalendarPlus className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single" selected={selected} month={viewMonth} onMonthChange={setViewMonth}
          onSelect={(d) => { if (d) { onPick(toYmd(d)); setOpen(false); } }}
          disabled={(d) => { const s = statusOf(d); return s === "past" || s === "booked" || s === "unknown" || !!isDateTaken?.(toYmd(d)); }}
          modifiers={{ booked: (d) => statusOf(d) === "booked", partial: (d) => statusOf(d) === "partial" }}
          modifiersClassNames={{
            booked: "!text-destructive !opacity-100 !bg-transparent line-through cursor-not-allowed",
            partial: "!text-amber-600 dark:!text-amber-400 !bg-transparent font-semibold",
          }}
          className="pointer-events-auto" showOutsideDays
        />
        <p className="text-[11px] text-muted-foreground px-2 pb-1 flex items-center gap-1.5">
          {isFetching ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking availability…</> : "Struck-through dates are fully booked or blocked."}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function SessionTimeSlots({ date, startTime, times, loading, isTaken, onPick }: {
  date: string; startTime: string; times: string[]; loading: boolean;
  isTaken: (t: string) => boolean; onPick: (t: string) => void;
}) {
  if (!date) return <p className="text-xs text-muted-foreground">Pick a date to see the photographer's open start times.</p>;
  if (loading) return (
    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking available times…
    </p>
  );
  const sorted = [...times].map((t) => t.slice(0, 5)).sort();
  if (sorted.length === 0) return (
    <p className="text-xs text-destructive">No start times are open on this date for this session's length. Please choose another date.</p>
  );
  const groups = [
    { label: "Morning", items: sorted.filter((t) => Number(t.slice(0, 2)) < 12) },
    { label: "Afternoon / evening", items: sorted.filter((t) => Number(t.slice(0, 2)) >= 12) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">Available start times ({sorted.length} open)</p>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((t) => {
              const taken = isTaken(t);
              return (
                <button
                  key={t} type="button" disabled={taken}
                  title={taken ? "Already used by another schedule in this booking" : undefined}
                  onClick={() => onPick(t)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    startTime === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50",
                    taken && "opacity-40 cursor-not-allowed line-through hover:border-border"
                  )}
                >
                  {fmt12(t)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Booking() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useRole();
  // phone_number isn't on RoleContext's User (that's just the account-level
  // /auth/me shape) — it lives on the client profile record instead.
  const { data: clientProfile } = useClientProfile();

  const { data: rawPhotographer, isLoading: loadingPhotographer } = usePhotographer(id);
  // Location-based rates: "Studio" uses the normal prices. Any other location type uses the
  // photographer's outdoor / on-location price when they set one. This is declared here,
  // above everything that reads `photographer`, so every price on the page follows it.
  const [locationType, setLocationType] = useState(locationTypes[0]);
  const photographer = useMemo(() => {
    if (!rawPhotographer || locationType === "Studio") return rawPhotographer;
    const cr = rawPhotographer.customRates;
    return {
      ...rawPhotographer,
      packages: rawPhotographer.packages.map((pk) => ({
        ...pk,
        price: pk.outdoorPrice != null ? Number(pk.outdoorPrice) : pk.price,
      })),
      customRates: cr && cr.hourlyRate != null && cr.outdoorHourlyRate != null
        ? { ...cr, hourlyRate: cr.outdoorHourlyRate }
        : cr,
    };
  }, [rawPhotographer, locationType]);
  const { data: allPhotographers = [] } = usePhotographers();
  const rates = photographer?.customRates ?? defaultCustomRates;
  // Per-day / per-person custom pricing: the price is rate x quantity and the
  // client does NOT pick a coverage duration (the photographer's coverageHours
  // is the agreed length per session, or "to be confirmed" when blank).
  const isUnitModel = rates.pricingModel === "per_day" || rates.pricingModel === "per_person";
  const unitRate = rates.unitRate ?? 0;
  const [customPeople, setCustomPeople] = useState("");

  // Extra sessions on a custom package: sliding-hours only, and only when the
  // photographer turned it on AND chose how the base fee applies.
  const customAllowsMultiple =
    !!rates.allowsMultipleSessions;
  const extraSessionMinHours =
    rates.baseFeeMode === "per_schedule" ? (rates.minHours ?? 1) : (rates.sessionMinHours ?? 1);
  const extraSessionMaxHours = rates.maxHours ?? 12;

  const initialPkgParam = searchParams.get("package");
  const initialPkg = initialPkgParam !== null ? parseInt(initialPkgParam) : -1;

     const [step, setStep] = useState(0);
   const [budgetInput, setBudgetInput] = useState("");
   const [budgetNote, setBudgetNote] = useState("");
  const [packageMode, setPackageMode] = useState<"fixed" | "custom">("fixed");
  const [selectedPkg, setSelectedPkg] = useState<number>(initialPkg);
  const [customBuild, setCustomBuild] = useState<CustomBuild>(makeDefaultBuild());
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([]);
    // Add-ons only apply to fixed packages, so a custom package skips that step.
  const activeSteps = packageMode === "fixed" ? ALL_STEPS : ALL_STEPS.filter((s) => s.id !== 3);
  const stepPos = Math.max(0, activeSteps.findIndex((s) => s.id === step));
  const isLastStep = stepPos === activeSteps.length - 1;
  const goNext = () => setStep(activeSteps[Math.min(stepPos + 1, activeSteps.length - 1)].id);
  const goBack = () => setStep(activeSteps[Math.max(stepPos - 1, 0)].id);
  // Sliding-hours picker state — only relevant when rates.hourlyRate is set
  // (see calculateCustomPrice). Defaulted once the photographer's rates
  // load, below.
  const [customHours, setCustomHours] = useState<number | null>(null);

  useEffect(() => {
    if (rates.hourlyRate != null && customHours == null) {
      setCustomHours(rates.minHours ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.hourlyRate]);

  // A duration-bearing extra counts as "selected" either because the client
  // explicitly picked it, or — just like the tier pill UI itself shows via
  // isTierOptionActive further down — because it's the free/baseline option
  // in its group and nothing else in that group has been picked yet. Without
  // this fallback, a client who's happy with the default (Included) coverage
  // duration sees it rendered as active but Continue stays disabled forever,
  // since selectedExtraIds never actually contains a price-0 default.
  const selectedDurationExtra = (() => {
    const durationExtras = (rates.extras ?? []).filter((e) => (e as any).durationMinutes != null);
    const explicit = durationExtras.find((e) => customBuild.selectedExtraIds.includes(e.id));
    if (explicit) return explicit;
    return durationExtras.find((e) => e.price === 0);
  })();

  // Date & event details
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");

  // Additional photography sessions — see CreateBookingRequest.php's
  // additional_schedules field. The primary date/startTime above is always
  // Session 1. Extra sessions are only offered when the photographer has a
  // package that explicitly allows multiple sessions, and the selected
  // package must allow them too (validated in the Package step).
  const [showMultiSchedule, setShowMultiSchedule] = useState(false);
  const [additionalSchedules, setAdditionalSchedules] = useState<SessionDraft[]>([]);

  const addAdditionalSchedule = (sameEvent: boolean = true) =>
    setAdditionalSchedules((prev) => [
      ...prev,
      {
        key: `sched-${Date.now()}-${prev.length}`,
        label: "", date: "", startTime: "", durationHours: "",
        ownLocation: false, location: emptySessionLocation(),
        eventType: "", customEventType: "",
        sameEvent,
      },
    ]);
  const removeAdditionalSchedule = (key: string) =>
    setAdditionalSchedules((prev) => prev.filter((s) => s.key !== key));
  // Sliding-hours custom packages: coverage hours are chosen PER session in the
  // Package step (keyed by the session's key). The first session uses customHours.
  const [sessionCustomHours, setSessionCustomHours] = useState<Record<string, number>>({});
  const setSessionHours = (key: string, hours: number) =>
    setSessionCustomHours((prev) => ({ ...prev, [key]: hours }));

  const updateAdditionalSchedule = (key: string, patch: Partial<SessionDraft>) =>
    setAdditionalSchedules((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const [eventType, setEventType] = useState("");
  const [specificEventType, setSpecificEventType] = useState("");

  // Refined Location State (Section 7.12)
  // (locationType state now lives near the top of this component, next to usePhotographer.)
  const [eventAddress, setEventAddress] = useState(""); // "Specific Address / Venue"

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [citiesMunicipalities, setCitiesMunicipalities] = useState<CityMunicipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityMunicipalityId, setCityMunicipalityId] = useState<number | null>(null);

  // Only offer locations the photographer actually covers (Areas Covered).
  const coverage = rawPhotographer?.coverageArea;

  const allowedLocationTypeList = allowedLocationTypes(coverage, locationTypes);
  const allowedProvinces = provinces.filter((pv) => provinceAllowed(coverage, pv.name));
  const allowedCities = citiesMunicipalities.filter((c) => cityAllowed(coverage, c.name));
  const [barangayId, setBarangayId] = useState<number | null>(null);

  useEffect(() => {
    locationService.getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    setCityMunicipalityId(null);
    setBarangayId(null);
    setCitiesMunicipalities([]);
    if (provinceId == null) return;
    locationService.getCitiesMunicipalities(provinceId).then(setCitiesMunicipalities).catch(() => setCitiesMunicipalities([]));
  }, [provinceId]);

  useEffect(() => {
    setBarangayId(null);
    setBarangays([]);
    if (cityMunicipalityId == null) return;
    locationService.getBarangays(cityMunicipalityId).then(setBarangays).catch(() => setBarangays([]));
  }, [cityMunicipalityId]);

  // If the photographer's coverage leaves exactly one province / city, fill it in and lock it.
  const needsPsgcLocation = locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other";
  const onlyProvinceId = allowedProvinces.length === 1 ? allowedProvinces[0].id : null;
  const onlyCityId = allowedCities.length === 1 ? allowedCities[0].id : null;

  useEffect(() => {
    if (needsPsgcLocation && onlyProvinceId != null && provinceId == null) setProvinceId(onlyProvinceId);
  }, [needsPsgcLocation, onlyProvinceId, provinceId]);

  useEffect(() => {
    if (needsPsgcLocation && onlyCityId != null && cityMunicipalityId == null) setCityMunicipalityId(onlyCityId);
  }, [needsPsgcLocation, onlyCityId, cityMunicipalityId]);

  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");

  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");

  // contactName/contactEmail can init synchronously from useRole()'s user,
  // but the phone number comes from a separate query that resolves after
  // mount — so it's filled in via effect once it arrives. Only fills an
  // empty field, so it won't stomp on anything the client already typed.
  useEffect(() => {
    if (clientProfile?.phoneNumber && !contactPhone) {
      setContactPhone(clientProfile.phoneNumber);
    }
  }, [clientProfile]);

  // Modal & Submission States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const p = photographer;
  // Real, per-photographer add-ons from the backend (via photographerService's
  // normalizeAddOn) — NOT the generic mock addOns list from data/photographers.ts,
  // which isn't tied to any actual photographer or backend row.
  const photographerAddOns = (p as any)?.addOns ?? [];
  const pkg = p && selectedPkg >= 0 ? p.packages[selectedPkg] ?? null : null;
  // Only offer extra sessions when at least one package of this photographer
  // allows them.
  const multiSessionPackages = (p?.packages ?? []).filter((pk) => pk.allowsMultipleSessions);
  // Most sessions any package/custom option allows in one booking (Infinity = no cap).
  const maxSessionsAllowed = (() => {
    const caps = [
      ...multiSessionPackages.map((pk) => pk.maxSessions ?? Infinity),
      ...(customAllowsMultiple ? [rates.maxSessions ?? Infinity] : []),
    ];
    return caps.length ? Math.max(...caps) : 1;
  })();
  const canAddMoreSessions = additionalSchedules.length + 1 < maxSessionsAllowed;

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
  // see the `id?: number` field on the Package interface in photographers.ts.
  const candidatePkg =
    selectedPkg >= 0 ? p?.packages[selectedPkg]
    : initialPkg >= 0 ? p?.packages[initialPkg]
    : undefined; // no package chosen yet → the server offers start times that are free at that moment
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
  // CreateBookingAction.php actually checks at submission.
  const { data: availableStartTimes = [], isLoading: loadingStartTimes } = useAvailableStartTimes(
    p?.id,
    dateStr,
    calendarPackageId
  );

  // Custom-package revalidation only. Step 1's calendar/start-time list
  // above intentionally stays on the fixed-package/general-availability
  // fallback the whole time a client is on Date & Time — we don't know yet
  // whether they'll end up choosing fixed or custom. Once they pick a real
  // coverage duration in the Package step (selectedDurationExtra), this
  // separately re-checks the start time they already picked against that
  // real custom duration, so a slot that only looked open under the
  // fixed-package placeholder duration gets caught before Review instead of
  // failing opaquely at final submission.
  const customDurationMinutesForRevalidation =
    packageMode === "custom"
      ? (isUnitModel
          ? (rates.coverageHours ? rates.coverageHours * 60 : undefined)
          : rates.hourlyRate != null ? (customHours ?? rates.minHours ?? 1) * 60 : (selectedDurationExtra as any)?.durationMinutes)
      : undefined;

  const { data: customStartTimesForRevalidation = [], isLoading: loadingCustomRevalidation } = useAvailableStartTimes(
    p?.id,
    dateStr,
    undefined,
    customDurationMinutesForRevalidation
  );

  // Sorted so they render in order as tappable pills.
  const sortedStartTimes = useMemo(
    () => [...availableStartTimes].sort(),
    [availableStartTimes]
  );
  const isStartTimeAvailable = startTime !== "" && availableStartTimes.some((t) => t.slice(0, 5) === startTime);

  // AM/PM is purely a display grouping of the SAME sortedStartTimes the
  // server already validated against booking hours, blocked dates, existing
  // bookings, and the selected package's duration+buffer — no availability
  // logic changes here, just bucketing by hour.
  const TIME_PERIODS = [
    { key: "am" as const, label: "AM", dot: "bg-amber-500" },
    { key: "pm" as const, label: "PM", dot: "bg-indigo-400" },
  ];
  type TimePeriodKey = (typeof TIME_PERIODS)[number]["key"];

  const startTimesByPeriod = useMemo(() => {
    const groups: Record<TimePeriodKey, string[]> = { am: [], pm: [] };
    for (const t of sortedStartTimes) {
      const hour = Number(t.slice(0, 2));
      if (hour >= 0 && hour < 12) groups.am.push(t);
      else groups.pm.push(t);
    }
    return groups;
  }, [sortedStartTimes]);

  const [activePeriod, setActivePeriod] = useState<TimePeriodKey>("am");

  // Keep the active tab in sync with the date: jump to whichever period the
  // already-picked start time falls in, or fall back to the first period
  // that actually has open slots for this date/package.
  useEffect(() => {
    if (startTime && availableStartTimes.some((t) => t.slice(0, 5) === startTime)) {
      const hour = Number(startTime.slice(0, 2));
      setActivePeriod(hour < 12 ? "am" : "pm");
      return;
    }
    if (startTimesByPeriod.am.length) setActivePeriod("am");
    else if (startTimesByPeriod.pm.length) setActivePeriod("pm");
  }, [dateStr, startTimesByPeriod, startTime, availableStartTimes]);

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
  // returning a "partially_booked" status per date.
  const getDateStatus = (d: Date): "past" | "booked" | "partial" | "available" | "unknown" => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (d < today) return "past";
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const status: string | undefined = monthAvailability?.[ds];
    if (bookedDates.some((bd) => bd.toDateString() === d.toDateString())) return "booked";
    if (status === "unavailable" || status === "booked" || status === "fully_booked") return "booked";
    if (status === "partially_booked" || status === "partial") return "partial";
    if (status === "available") return "available";
    // No answer yet for this date — the query hasn't resolved, or it's
    // disabled because calendarPackageId is undefined. Fail closed instead
    // of defaulting to "available".
    return "unknown";
  };





  const alternativeProviders = useMemo<Photographer[]>(() => {
    if (!p || !date) return [];
    return allPhotographers
      .filter((other) => other.id !== p.id)
      .filter((other) => !other.bookedSlots.some((s) => s.date === dateStr))
      .slice(0, 3);
  }, [p, date, dateStr, allPhotographers]);

  // Group custom-package extras that share a tierName into single-select
  // "pill" groups (e.g. Edited Photos: 50/100/200/300/Unlimited). Extras
  // with no tierName stay as independent on/off toggles (e.g. RAW Files).
  //
  // Kept above the loading/not-found early-returns: hooks can't follow a
  // conditional return, or React throws "Rendered more hooks than during the
  // previous render" once loadingPhotographer flips from true to false.
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

  // start "HH:mm" + a duration in hours -> end "HH:mm". Returns "" when either
  // is unknown, so callers never show an invented end time.
  const addHoursToTime = (start: string, hours: number | undefined | null): string => {
    if (!start || !hours) return "";
    const [hh, mm] = start.split(":").map(Number);
    const totalMinutes = hh * 60 + mm + hours * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  // undefined = no known duration (package left it open) -> no end time.
  const durationHoursForEstimate =
    packageMode === "fixed" ? (pkg?.scheduleMode === "open" ? undefined : (pkg?.hours ?? undefined))
    : isUnitModel ? (rates.coverageHours ?? undefined)
    : rates.hourlyRate != null ? (customHours ?? rates.minHours ?? 1)
    : selectedDurationExtra ? (selectedDurationExtra as any).durationMinutes / 60
    : undefined;

  const estimatedEndTime = addHoursToTime(startTime, durationHoursForEstimate);

  // ── Additional sessions: availability ──
  // Coverage length (hours) for one additional session — same rules as the submit payload.
  const sessionHours = (s: SessionDraft): number | undefined =>
    packageMode === "custom" && rates.hourlyRate != null
      ? (sessionCustomHours[s.key] ?? extraSessionMinHours)
      : s.durationHours.trim() !== "" ? Number(s.durationHours) : durationHoursForEstimate;

  // Which duration the availability lookups use for a session.
  const sessionDurationSource = (s: SessionDraft) => {
    if (packageMode === "custom" && rates.hourlyRate != null) {
      return { packageId: undefined, customMinutes: Math.round((sessionHours(s) ?? extraSessionMinHours) * 60), overrideMinutes: undefined };
    }
    if (packageMode === "custom" && durationHoursForEstimate) {
      return { packageId: undefined, customMinutes: Math.round(durationHoursForEstimate * 60), overrideMinutes: undefined };
    }
    const own = s.durationHours.trim() !== "" ? Math.round(Number(s.durationHours) * 60) : undefined;
    return { packageId: calendarPackageId, customMinutes: undefined, overrideMinutes: own && own > 0 ? own : undefined };
  };

  // One start-time lookup per additional session (shares the cache with useAvailableStartTimes).
  const sessionSlotQueries = useQueries({
    queries: additionalSchedules.map((s) => {
      const src = sessionDurationSource(s);
      return availableStartTimesQuery(p?.id, s.date, src.packageId, src.customMinutes, src.overrideMinutes);
    }),
  });
  const sessionSlots: Record<string, { loading: boolean; loaded: boolean; times: string[] }> = {};
  additionalSchedules.forEach((s, i) => {
    const q = sessionSlotQueries[i];
    sessionSlots[s.key] = {
      loading: !!s.date && !!q?.isFetching && !q?.data,
      loaded: !!s.date && !!q?.isSuccess && !q?.isFetching,
      times: (q?.data as string[] | undefined) ?? [],
    };
  });
  const isSessionSlotOpen = (s: SessionDraft) =>
    !!s.date && !!s.startTime && sessionSlots[s.key]?.times.some((t) => t.slice(0, 5) === s.startTime);



  const additionalSchedulesWithEndTime = useMemo(
    () => additionalSchedules.map((s) => {
      // A session's own duration wins; blank falls back to the package's
      // duration; no package duration = no end time (to be confirmed).
      const hours = sessionHours(s);
      return { ...s, endTime: addHoursToTime(s.startTime, hours) };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [additionalSchedules, durationHoursForEstimate, packageMode, rates.hourlyRate, sessionCustomHours, extraSessionMinHours]
  );

  const allScheduleEntries = useMemo(() => {
    const primaryLabel = eventType === "Other" && specificEventType ? specificEventType : (eventType || "Event");
    const primary = { key: "primary", label: primaryLabel, dateStr, startTime, endTime: estimatedEndTime, locationText: "" };
    const extras = additionalSchedulesWithEndTime.map((s) => ({
      key: s.key,
      // Same-event sessions inherit Session 1's event; different ones use their own pick.
      label: s.sameEvent
        ? primaryLabel
        : ((s.eventType === "Other" ? s.customEventType.trim() : s.eventType) || "Photography session"),
      dateStr: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      locationText: s.ownLocation ? s.location.summary : "",
    }));
    return [primary, ...extras];
  }, [eventType, specificEventType, dateStr, startTime, estimatedEndTime, additionalSchedulesWithEndTime]);

  // ── Sliding-hours coverage caps ──
  // Max whole hours a schedule can cover before the next schedule of this
  // booking starts on the same day. Infinity = nothing after it.
  const maxHoursBeforeNextSibling = (selfKey: string, date: string, start: string): number => {
    if (!date || !start) return Infinity;
    const cs = toMinutes(start);
    let gap = Infinity;
    for (const e of allScheduleEntries) {
      if (e.key === selfKey || e.dateStr !== date || !e.startTime) continue;
      const es = toMinutes(e.startTime);
      if (es > cs) gap = Math.min(gap, es - cs);
    }
    return gap === Infinity ? Infinity : Math.floor(gap / 60);
  };
  const isSlidingCustom = packageMode === "custom" && rates.hourlyRate != null;
  // ── Which durations actually fit at the chosen start time ──
  const startMatches = (data: unknown, start: string) =>
    Array.isArray(data) && (data as string[]).some((t) => t.slice(0, 5) === start.slice(0, 5));

  // Sliding hours: Session 1
  const hourOptions = isSlidingCustom
    ? Array.from({ length: Math.max(0, (rates.maxHours ?? 12) - (rates.minHours ?? 1) + 1) }, (_, i) => (rates.minHours ?? 1) + i)
    : [];
  const durationFitQueries = useQueries({
    queries: hourOptions.map((h) => availableStartTimesQuery(p?.id, dateStr, undefined, h * 60, undefined)),
  });
  const maxFittingHours = (() => {
    if (!isSlidingCustom || !startTime) return Infinity;
    let max = (rates.minHours ?? 1) - 1;
    for (let i = 0; i < hourOptions.length; i++) {
      const data = durationFitQueries[i]?.data;
      if (!data) return Infinity; // not loaded yet — don't clamp
      if (!startMatches(data, startTime)) break;
      max = hourOptions[i];
    }
    return max;
  })();

  // Sliding hours: additional sessions
  const extraHourOptions = isSlidingCustom
    ? Array.from({ length: Math.max(0, extraSessionMaxHours - extraSessionMinHours + 1) }, (_, i) => extraSessionMinHours + i)
    : [];
  const sessionFitQueries = useQueries({
    queries: additionalSchedules.flatMap((s) =>
      extraHourOptions.map((h) => availableStartTimesQuery(p?.id, s.date, undefined, h * 60, undefined))
    ),
  });
  const maxFittingHoursForSession = (idx: number, start: string): number => {
    if (!isSlidingCustom || !start) return Infinity;
    let max = extraSessionMinHours - 1;
    for (let i = 0; i < extraHourOptions.length; i++) {
      const data = sessionFitQueries[idx * extraHourOptions.length + i]?.data;
      if (!data) return Infinity;
      if (!startMatches(data, start)) break;
      max = extraHourOptions[i];
    }
    return max;
  };

  // Fixed packages: does each package fit at the chosen start time?
  const packageFitQueries = useQueries({
    queries: (p?.packages ?? []).map((pk) => availableStartTimesQuery(p?.id, dateStr, pk.id)),
  });
  const packageFits = (i: number) => {
    const data = packageFitQueries[i]?.data;
    return !startTime || !data || startMatches(data, startTime);
  };

  // Custom "coverage duration" extras (tier pills with durationMinutes)
  const durationExtraList = (rates.extras ?? []).filter((e) => (e as any).durationMinutes != null);
  const durationExtraFitQueries = useQueries({
    queries: durationExtraList.map((e) =>
      availableStartTimesQuery(p?.id, dateStr, undefined, (e as any).durationMinutes, undefined)
    ),
  });
  const durationExtraFits = (id: string) => {
    const i = durationExtraList.findIndex((e) => e.id === id);
    if (i < 0) return true;
    const data = durationExtraFitQueries[i]?.data;
    return !startTime || !data || startMatches(data, startTime);
  };

  const primaryHourCap = Math.min(
    rates.maxHours ?? 12,
    maxHoursBeforeNextSibling("primary", dateStr, startTime),
    maxFittingHours
  );

  // Keep chosen hours inside the cap instead of locking the Continue button.
  useEffect(() => {
    if (!isSlidingCustom || customHours == null) return;
    if (customHours > primaryHourCap && primaryHourCap >= (rates.minHours ?? 1)) setCustomHours(primaryHourCap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlidingCustom, customHours, primaryHourCap]);

  useEffect(() => {
    if (!isSlidingCustom) return;
    additionalSchedules.forEach((s, idx) => {
      const cap = Math.min(
        extraSessionMaxHours,
        maxHoursBeforeNextSibling(s.key, s.date, s.startTime),
        maxFittingHoursForSession(idx, s.startTime)
      );
      const cur = sessionCustomHours[s.key] ?? extraSessionMinHours;
      if (cur > cap && cap >= extraSessionMinHours) setSessionHours(s.key, cap);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlidingCustom, allScheduleEntries, sessionCustomHours]);

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

  // Sliding-hours custom packages: each session is priced from its OWN hours.
  const slidingSessionHours: number[] =
    rates.hourlyRate != null && customHours != null
      ? [customHours, ...additionalSchedules.map((s) => sessionCustomHours[s.key] ?? extraSessionMinHours)]
      : [];
  const slidingSessionCharges = calculateSlidingSessionCharges(rates, slidingSessionHours);
  const customFlatExtras = (rates.extras ?? [])
    .filter((e) => customBuild.selectedExtraIds.includes(e.id) && (e as any).durationMinutes == null)
    .reduce((sum, e) => sum + e.price, 0);
  // per_day bills DISTINCT event dates (two sessions on one date = one day);
  // per_person bills the head-count. Mirrors CreateBookingAction.
  const unitQuantity = rates.pricingModel === "per_day"
    ? new Set([dateStr, ...additionalSchedules.map((s) => s.date)].filter(Boolean)).size
    : (Number.isInteger(Number(customPeople)) ? Number(customPeople) : 0);
  const customPrice = isUnitModel
    ? unitRate * unitQuantity + customFlatExtras
    : rates.hourlyRate != null && customHours != null
      ? slidingSessionCharges.reduce((a, b) => a + b, 0) + customFlatExtras
      : calculateCustomPrice(customBuild, rates, customHours);
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
  // The package price never depends on how many sessions the booking has.
  const packagePrice = packageMode === "fixed" ? (pkg?.price ?? 0) : customPrice;
  const packageName = packageMode === "fixed" ? (pkg?.name ?? "—") : "Custom Package";
  const packagePhotos = packageMode === "fixed" ? (pkg?.photos ?? 0) : 0;

  const subtotal = packagePrice + (packageMode === "fixed" ? selectedAddOns.reduce((sum, i) => sum + photographerAddOns[i].price, 0) : 0);

  type StepValidation = { ok: boolean; reason?: string };

  // Does [start, start+coverage] on `date` overlap another session of THIS booking?
  const overlapsSibling = (selfKey: string, date: string, start: string, coverageHours?: number) => {
    if (!date || !start) return false;
    const cs = toMinutes(start);
    const ce = cs + (coverageHours ? Math.round(coverageHours * 60) : 1);
    return allScheduleEntries.some((e) => {
      if (e.key === selfKey || e.dateStr !== date || !e.startTime) return false;
      const es = toMinutes(e.startTime);
      let ee = e.endTime ? toMinutes(e.endTime) : es + 1;
      if (ee <= es) ee += 24 * 60; // session runs past midnight
      return cs < ee && es < ce;
    });
  };

  // Exact same date + start time as another schedule in THIS booking.
  // Independent of duration, so it can never be affected by a slider.
  const startTakenBySibling = (selfKey: string, date: string, start: string) => {
    if (!date || !start) return false;
    return allScheduleEntries.some(
      (e) => e.key !== selfKey && e.dateStr === date && !!e.startTime && e.startTime.slice(0, 5) === start.slice(0, 5)
    );
  };

  // Date already used by another schedule in this booking (the main date or another day).
  const dateUsedBySibling = (selfKey: string, date: string) =>
    !!date && allScheduleEntries.some((e) => e.key !== selfKey && e.dateStr === date);

  const validateAdditionalSessions = (): StepValidation => {
    for (let i = 0; i < additionalSchedules.length; i++) {
      const sch = additionalSchedules[i];
      const name = `Session ${i + 2}`;
      if (sessionSlots[sch.key]?.loading) {
        return { ok: false, reason: `Still checking availability for ${name} — one moment.` };
      }
      if (!isSessionSlotOpen(sch)) {
        return { ok: false, reason: `${name}: that date and time isn't available. Please pick an open start time.` };
      }
      if (sch.sameEvent && dateUsedBySibling(sch.key, sch.date)) {
        return { ok: false, reason: `${name} is on the same date as another schedule. Pick a different date, or use "Add a different session" for a second session on the same day.` };
      }
      if (startTakenBySibling(sch.key, sch.date, sch.startTime)) {
        return { ok: false, reason: `${name} has the same date and start time as another schedule in this booking. Please choose a different start time.` };
      }
      if (overlapsSibling(sch.key, sch.date, sch.startTime, sessionHours(sch))) {
        return { ok: false, reason: `${name} overlaps another schedule in this booking. Reduce its coverage hours or choose a different start time.` };
      }
    }
    return { ok: true };
  };
  const validateStep = (s: number): StepValidation => {
    switch (s) {
      case 0:
        if (!date) return { ok: false, reason: "Please pick an event date to continue." };
        if (dayConflict) return { ok: false, reason: "This date is fully booked — choose another date or try an alternative provider below." };
        if (!startTime) return { ok: false, reason: "Please choose a start time for your event." };
        if (!isStartTimeAvailable) return { ok: false, reason: "That start time isn't open — please pick a time the photographer is available." };
        for (const sch of additionalSchedules) {
          if (!sch.date || !sch.startTime) {
            return { ok: false, reason: "Please give every additional day a date and start time — or remove the incomplete one." };
          }
          if (!sch.sameEvent && !sch.eventType) {
            return { ok: false, reason: "Please choose what the different session covers (e.g. Prenup, Wedding) — or remove it." };
          }
          if (!sch.sameEvent && sch.eventType === "Other" && !sch.customEventType.trim()) {
            return { ok: false, reason: "Please specify the event for the different session — or remove it." };
          }
          if (sch.durationHours.trim() !== "" && !(Number(sch.durationHours) > 0)) {
            return { ok: false, reason: "A session's duration must be a positive number of hours — or leave it blank." };
          }
          if (sch.ownLocation && !isSessionLocationComplete(sch.location)) {
            return { ok: false, reason: `Please complete the location for this session, or untick the different-location option.` };
          }
        }
        // Every extra day/session must be on an open date AND an open time slot.
        return validateAdditionalSessions();
      case 1:
        if (!eventType) return { ok: false, reason: "Please choose an event type." };
        if (eventType === "Other" && !specificEventType.trim()) return { ok: false, reason: "Please specify the event type." };

        // Location Validation per SRS Section 7.12
        if (!locationType) return { ok: false, reason: "Please select a location type." };
        if (locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other") {
          if (!provinceId) return { ok: false, reason: "Please select a province." };
          if (!cityMunicipalityId) return { ok: false, reason: "Please select a city/municipality." };
          if (!barangayId) return { ok: false, reason: "Please select a barangay." };
          if (!eventAddress.trim()) return { ok: false, reason: "Please provide the specific address / venue." };
        }
        if (locationType === "Outside Bicol" && !eventAddress.trim()) {
          return { ok: false, reason: "Please provide the full address." };
        }

        if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim())
          return { ok: false, reason: "Please complete your contact details (name, phone, email)." };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail.trim()))
          return { ok: false, reason: "Please enter a valid email address." };

        return { ok: true };
            case 2:
        if (packageMode === "fixed" && !pkg) return { ok: false, reason: "Please select a package to continue." };
        // A timed package must fit at the start time chosen earlier. Open-ended
        // packages only need the start itself to be free (already checked).
        if (
          packageMode === "fixed" && pkg && startTime && !loadingStartTimes &&
          !availableStartTimes.some((t) => t.slice(0, 5) === startTime.slice(0, 5))
        ) {
          return {
            ok: false,
            reason: `"${pkg.name}" doesn't fit starting at ${prettyTime(startTime)} — the photographer is busy or closed for part of it. Pick another package, or go back and choose a different start time.`,
          };
        }
        // The chosen package/hours can change which slots fit each session.
        if (additionalSchedules.length > 0) {
          const sv = validateAdditionalSessions();
          if (!sv.ok) return { ok: false, reason: `${sv.reason} (Go back to Date & Time to change it.)` };
        }
        // One booking = one package/service. Extra sessions only work with a
        // package that allows multiple sessions (a fixed package the photographer
        // opted in, or a sliding-hours custom package with multi-session on).
        if (additionalSchedules.length > 0) {
          if (packageMode === "custom") {
            if (!customAllowsMultiple) {
              return {
                ok: false,
                reason: "This photographer's custom package covers a single photography session. Remove the extra sessions, or choose a fixed package that allows multiple sessions — separate services should be booked separately.",
              };
            }
            if (rates.maxSessions && additionalSchedules.length + 1 > rates.maxSessions) {
              return { ok: false, reason: `This custom package allows up to ${rates.maxSessions} sessions per booking.` };
            }
          } else {
            if (!pkg?.allowsMultipleSessions) {
              return {
                ok: false,
                reason: "This package covers a single photography session. Remove the extra sessions, or choose a package that allows multiple sessions — separate services should be booked separately.",
              };
            }
            const maxSessions = pkg?.maxSessions;
            if (maxSessions && additionalSchedules.length + 1 > maxSessions) {
              return { ok: false, reason: `This package allows up to ${maxSessions} sessions per booking.` };
            }
          }
        }
        if (packageMode === "custom" && isUnitModel) {
          if (rates.pricingModel === "per_person") {
            const n = Number(customPeople);
            if (!Number.isInteger(n) || n < 1) return { ok: false, reason: "Enter how many people will be covered." };
            if (rates.maxPeople != null && n > rates.maxPeople) {
              return { ok: false, reason: `${p.name} covers up to ${rates.maxPeople} people per booking.` };
            }
          }
          if (
            rates.coverageHours && startTime && !loadingCustomRevalidation &&
            !customStartTimesForRevalidation.some((t) => t.slice(0, 5) === startTime.slice(0, 5))
          ) {
            return {
              ok: false,
              reason: `${rates.coverageHours} hours of coverage starting at ${prettyTime(startTime)} doesn't fit ${p.name}'s schedule. Go back and pick another start time.`,
            };
          }
          return { ok: true };
        }
        if (packageMode === "custom" && rates.hourlyRate != null) {
          const min = rates.minHours ?? 1;
          const max = rates.maxHours ?? 12;
          for (const s of additionalSchedules) {
            const h = sessionCustomHours[s.key] ?? extraSessionMinHours;
            if (h < extraSessionMinHours || h > extraSessionMaxHours) {
              return { ok: false, reason: `Please choose between ${extraSessionMinHours} and ${extraSessionMaxHours} coverage hours for every session.` };
            }
          }
          if (customHours == null || customHours < min || customHours > max) {
            return { ok: false, reason: `Please choose between ${min} and ${max} coverage hours.` };
          }
          if (startTime && !loadingCustomRevalidation && !customStartTimesForRevalidation.some((t) => t.slice(0, 5) === startTime.slice(0, 5))) {
            return {
              ok: false,
              reason: `${customHours} hour${customHours === 1 ? "" : "s"} starting at ${prettyTime(startTime)} doesn't fit ${p.name}'s schedule. Choose fewer hours, or go back and pick another start time.`,
            };
          }
          return { ok: true };
        }
        if (packageMode === "custom" && !selectedDurationExtra) {
          return { ok: false, reason: "Please select your photography coverage duration to continue." };
        }
        return { ok: true };
      case 3: return { ok: true };
      case 4: return { ok: true };
      default: return { ok: true };
    }
  };

  const currentValidation = validateStep(step);

  // End times only make sense once a package/duration is being chosen (Package step onward).
  const showEndTimes = step >= 2;

  const sessionsChecking = additionalSchedules.some((s) => sessionSlots[s.key]?.loading);
  const isCheckingAvailability =
    (step === 0 && ((!!dateStr && loadingStartTimes) || sessionsChecking)) ||
    (step === 2 && (
      sessionsChecking ||
      (packageMode === "fixed" && packageFitQueries.some((q) => q.isFetching)) ||
      (packageMode === "custom" && (
        (!!dateStr && customDurationMinutesForRevalidation != null && loadingCustomRevalidation) ||
        durationFitQueries.some((q) => q.isFetching) ||
        durationExtraFitQueries.some((q) => q.isFetching)
      ))
    ));

  const handleNext = () => {
    const v = validateStep(step);
    if (!v.ok) {
      toast.error(v.reason || "Please complete the required fields.");
      return;
    }

    if (step === 1) {
      setEventAddress(eventAddress.trim());
      setContactName(contactName.trim());
      setContactPhone(contactPhone.trim());
      setContactEmail(contactEmail.trim());
      if (eventType === "Other") setSpecificEventType(specificEventType.trim());
    }

    goNext();
  };

  const handleOpenConfirm = () => {
    for (const s of activeSteps) {
      const v = validateStep(s.id);
      if (!v.ok) {
        toast.error(v.reason || "Please complete the required fields.");
        setStep(s.id);
        return;
      }
    }
   if (budgetInput.trim()) {
     const offered = Number(budgetInput);
     if (!Number.isFinite(offered) || offered <= 0 || offered >= subtotal) {
       toast.error("Your budget must be more than 0 and lower than the subtotal. Clear it to book at the listed price.");
       setStep(4);
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
      // end_time is intentionally never sent — the backend derives every
      // session's end from its start time + a known duration, and leaves it
      // empty ("to be confirmed") when no duration is known.
      const payload: CreateBookingPayload = {
        photographer_id: Number(p.id),
        event_type: toSlug(eventType) as CreateBookingPayload["event_type"],
        ...(eventType === "Other" ? { custom_event_type: specificEventType.trim() } : {}),
        event_date: dateStr,
        start_time: startTime,
        location_type: toSlug(locationType) as CreateBookingPayload["location_type"],
        ...(locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other" ? {
          province_id: provinceId!,
          city_municipality_id: cityMunicipalityId!,
          barangay_id: barangayId!,
          event_address: eventAddress.trim(),
        } : {}),
        ...(locationType === "Outside Bicol" ? {
          event_address: eventAddress.trim(),
        } : {}),
        ...(guestCount.trim() ? { guest_count: parseInt(guestCount, 10) } : {}),
           ...(notes.trim() ? { special_requests: notes.trim() } : {}),
   ...(budgetInput.trim()
     ? { budget_amount: Number(budgetInput), ...(budgetNote.trim() ? { budget_note: budgetNote.trim() } : {}) }
     : {}),
        // Additional sessions of THIS booking's single package. A blank
        // duration is simply omitted so the backend applies the package's
        // duration (or leaves it to be confirmed); a session with no own
        // location inherits the booking's location.
        ...(additionalSchedules.length
          ? {
              additional_schedules: additionalSchedules.map((s, idx) => ({
                label: `Session ${idx + 2} — ${allScheduleEntries[idx + 1]?.label ?? "Photography session"}`,
                event_date: s.date,
                start_time: s.startTime,
                ...(packageMode === "custom" && rates.hourlyRate != null
                  ? { duration_minutes: (sessionCustomHours[s.key] ?? extraSessionMinHours) * 60 }
                  : s.durationHours.trim() !== "" ? { duration_minutes: Math.round(Number(s.durationHours) * 60) } : {}),
                ...(!s.sameEvent && s.ownLocation ? sessionLocationPayload(s.location) : {}),
              })) as CreateBookingPayload["additional_schedules"],
            }
          : {}),
        ...(packageMode === "fixed"
          ? {
              package_id: (pkg as any)?.id,
              ...(selectedAddOns.length
                ? { add_on_ids: selectedAddOns.map((i) => Number(photographerAddOns[i].id)) }
                : {}),
            }
          : {
              is_custom_package: true,
              custom_component_ids: customBuild.selectedExtraIds
                // In hourly mode there's no duration extra to send — the
                // slider's value (custom_hours below) IS the duration, and
                // CreateBookingAction::resolveCustomPackage's hourly branch
                // only expects flat/tier extras here, not a duration one.
                .filter((extraId) => (rates.hourlyRate == null && !isUnitModel) || !(rates.extras ?? []).find((e) => e.id === extraId && (e as any).durationMinutes != null))
                .map(Number),
              ...(rates.hourlyRate != null && customHours != null ? { custom_hours: customHours } : {}),
              ...(rates.pricingModel === "per_person" ? { custom_people: Number(customPeople) } : {}),
            }),
      };

      const booking = await bookingService.create(payload);
      toast.success("Booking request submitted successfully!");
      setIsConfirmModalOpen(false);
      navigate(`/booking-sent/${booking.id}`);
    } catch (error) {
      console.error("Submission failed", error);
      toast.error(error instanceof Error ? error.message : "There was an error submitting your request. Please try again.");
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

  // "YYYY-MM-DD" -> a readable date. `style` mirrors the two formats this
  // page already used before (short for the sidebar, long for Review).
  const prettyDate = (ds: string, style: "long" | "short" = "short") => {
    if (!ds) return "";
    const [y, m, d] = ds.split("-").map(Number);
    if (!y || !m || !d) return ds;
    const dt = new Date(y, m - 1, d);
    return style === "long"
      ? dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
              You're signed in as a {role === "studio" ? "studio/photographer" : role} account. Only client accounts can    {budgetInput.trim() ? "Submit Booking Request with Offer" : "Submit Booking Request"}s — sign in with a client account to book {p.name}.
            </p>
            <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">
              Go back
            </button>
          </div>
        </div>
      )}
      {user && role === "client" && user.emailVerified === false && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center backdrop-blur-md bg-background/60 animate-fade-in pb-24">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Info className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="font-heading font-bold text-xl mb-2">Verify your email first</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Please verify <strong className="text-foreground">{user.email}</strong> before booking {p.name}. Use the Resend button below if you can't find the email. This page unlocks by itself once you've verified.
            </p>
            <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground">
              Go back
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => stepPos > 0 ? goBack() : navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
          {activeSteps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => i < stepPos && setStep(s.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i === stepPos ? "bg-primary text-primary-foreground" :
                  i < stepPos ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {i < stepPos ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < activeSteps.length - 1 && <div className={cn("w-6 h-px", i < stepPos ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {!currentValidation.ok && !isCheckingAvailability && (
          <div className="mb-5 p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-start gap-2 animate-fade-in">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs">{currentValidation.reason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* ===== Step 0: Date ===== */}
               {step === 0 && <NegotiationBanner />}
   {step === 0 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Choose Your Start Time</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Pick a date, then the time you'd like the photographer to start.
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
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4 text-primary" />
                              </div>
                              <p className="font-medium text-sm">Available Start Times</p>
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
                              {/* Segmented AM / PM tabs */}
                              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 mb-3">
                                {TIME_PERIODS.map((period) => {
                                  const slots = startTimesByPeriod[period.key];
                                  const isActive = activePeriod === period.key;
                                  return (
                                    <button
                                      key={period.key}
                                      type="button"
                                      disabled={slots.length === 0}
                                      onClick={() => setActivePeriod(period.key)}
                                      className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                        isActive
                                          ? "bg-card text-foreground shadow-sm"
                                          : slots.length === 0
                                          ? "text-muted-foreground/40 cursor-not-allowed"
                                          : "text-muted-foreground hover:text-foreground"
                                      )}
                                    >
                                      <span className={cn("w-1.5 h-1.5 rounded-full", period.dot)} />
                                      {period.label}
                                    </button>
                                  );
                                })}
                              </div>

                              {startTimesByPeriod[activePeriod].length === 0 ? (
                                <p className="text-xs text-muted-foreground py-3 text-center">
                                  No {TIME_PERIODS.find((tp) => tp.key === activePeriod)?.label.toLowerCase()} start times on this date.
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {startTimesByPeriod[activePeriod].map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      disabled={startTakenBySibling("primary", dateStr, t)}
                                      title={startTakenBySibling("primary", dateStr, t) ? "Already used by another schedule in this booking" : undefined}
                                      onClick={() => setStartTime(t)}
                                      className={cn(
                                        "relative px-2 py-2.5 rounded-lg border text-sm font-medium transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through",
                                        startTime === t
                                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                          : "border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10"
                                      )}
                                    >
                                      {prettyTime(t)}
                                      {startTime === t && (
                                        <Check className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {startTime && (
                                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
                                  <Check className="w-4 h-4 text-primary shrink-0" />
                                  <p className="text-sm font-medium">Start Time: {prettyTime(startTime)}</p>
                                </div>
                              )}
                            </>
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

                {/* Additional photography sessions: only offered when this
                    photographer has a package that allows multiple sessions
                    under one booking. A normal single-session booking stays
                    exactly as simple as before. */}
                {(multiSessionPackages.length > 0 || customAllowsMultiple) && (
                  <div className="mt-6 pt-5 border-t border-border/50">
                    {!showMultiSchedule && additionalSchedules.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Need more than one day or session?</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowMultiSchedule(true); addAdditionalSchedule(true); }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            <CalendarPlus className="w-4 h-4" /> Add another day (same event)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowMultiSchedule(true); addAdditionalSchedule(false); }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            <CalendarPlus className="w-4 h-4" /> Add a different session
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Same event: another date for the same event and venue. Different session: its own event (e.g. Prenup), and optionally its own location or the same date.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="font-heading font-semibold text-sm">Additional days / sessions</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            All days and sessions belong to this one booking, at the same package price.
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            Extra days are a <strong>request</strong>. The photographer will review them and confirm.
                          </span>
                        </div>

                        {additionalSchedulesWithEndTime.map((s, idx) => (
                          <div key={s.key} className="p-4 rounded-xl border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {`Session ${idx + 2}`} — {s.sameEvent ? "same event as Session 1" : "different session"}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeAdditionalSchedule(s.key)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {s.sameEvent ? (
                              <p className="text-xs text-muted-foreground -mt-1">
                                Same event and same venue as your main booking — just pick the date and time.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <select
                                  value={s.eventType}
                                  onChange={(e) => updateAdditionalSchedule(s.key, {
                                    eventType: e.target.value,
                                    ...(e.target.value !== "Other" ? { customEventType: "" } : {}),
                                  })}
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">What does this session cover? (e.g. Prenup, Wedding)</option>
                                  {systemEventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {s.eventType === "Other" && (
                                  <input
                                    type="text"
                                    placeholder="Please specify the event"
                                    value={s.customEventType}
                                    onChange={(e) => updateAdditionalSchedule(s.key, { customEventType: e.target.value })}
                                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                                  />
                                )}
                              </div>
                            )}
                            {(() => {
                              const src = sessionDurationSource(s);
                              const slots = sessionSlots[s.key] ?? { loading: false, loaded: false, times: [] };
                              return (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[11px] text-muted-foreground">Date</label>
                                      <SessionDateField
                                        photographerId={p?.id}
                                        packageId={src.packageId}
                                        customDurationMinutes={src.customMinutes}
                                        sessionDurationMinutes={src.overrideMinutes}
                                        value={s.date}
                                        isDateTaken={s.sameEvent ? (ymd) => dateUsedBySibling(s.key, ymd) : undefined}
                                        onPick={(ymd) => updateAdditionalSchedule(s.key, { date: ymd, startTime: "" })}
                                      />
                                    </div>

                                  </div>
                                  <div>
                                    <label className="text-[11px] text-muted-foreground">Start time</label>
                                    <SessionTimeSlots
                                      date={s.date}
                                      startTime={s.startTime}
                                      times={slots.times}
                                      loading={slots.loading}
                                      isTaken={(t) => startTakenBySibling(s.key, s.date, t)}
                                      onPick={(t) => updateAdditionalSchedule(s.key, { startTime: t })}
                                    />
                                  </div>
                                </>
                              );
                            })()}

                            {!s.sameEvent && (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={s.ownLocation}
                                  onChange={(e) => updateAdditionalSchedule(s.key, { ownLocation: e.target.checked })}
                                />
                                This session is at a different location than the main booking
                              </label>
                            )}
                            {!s.sameEvent && s.ownLocation && (
                              <SessionLocationFields
                                coverageArea={rawPhotographer?.coverageArea}
                                value={s.location}
                                onChange={(loc) => updateAdditionalSchedule(s.key, { location: loc })}
                              />
                            )}
                          </div>
                        ))}

                        <div className="flex items-center gap-3 flex-wrap">
                          <Button type="button" variant="outline" size="sm" onClick={() => addAdditionalSchedule(true)} disabled={!canAddMoreSessions} className="gap-1.5" title="Same event, same place. Just pick the date and time.">
                            <CalendarPlus className="w-3.5 h-3.5" /> Add another day (same event)
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addAdditionalSchedule(false)} disabled={!canAddMoreSessions} className="gap-1.5" title="Its own description, and optionally its own location.">
                            <CalendarPlus className="w-3.5 h-3.5" /> Add a different session
                          </Button>
                          <button
                            type="button"
                            onClick={() => { setShowMultiSchedule(false); setAdditionalSchedules([]); }}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            I only need one day — remove all
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <Label htmlFor="eventType">Event Type{additionalSchedules.length > 0 ? " (Session 1)" : ""} *</Label>
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
                    {allowedLocationTypeList.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {locationType !== "Studio" && coverageNote(coverage) && (
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="w-3 h-3 mt-0.5 shrink-0" /> {coverageNote(coverage)}
                    </p>
                  )}
                  {additionalSchedules.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      This is the main location (Session 1). Any other session can have its own location — set that under Date & Time.
                    </p>
                  )}
                </div>

                {(locationType === "Client Location" || locationType === "Outdoor Location" || locationType === "Other") && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <select id="province" value={provinceId ?? ""} disabled={onlyProvinceId != null} onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Select province…</option>
                        {allowedProvinces.map((pv) => <option key={pv.id} value={pv.id}>{pv.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cityMunicipality">City / Municipality *</Label>
                      <select id="cityMunicipality" value={cityMunicipalityId ?? ""} disabled={!provinceId || onlyCityId != null}
                        onChange={(e) => setCityMunicipalityId(e.target.value ? Number(e.target.value) : null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Select city/municipality…</option>
                        {allowedCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barangay">Barangay *</Label>
                      <select id="barangay" value={barangayId ?? ""} disabled={!cityMunicipalityId}
                        onChange={(e) => setBarangayId(e.target.value ? Number(e.target.value) : null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Select barangay…</option>
                        {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Specific Address / Venue *</Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="address" className="pl-9" placeholder="Street, building, venue name, or other details"
                          value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {locationType === "Outside Bicol" && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="outsideBicolAddress">Full Address *</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="outsideBicolAddress" className="pl-9"
                        placeholder="Full address, e.g. street, city, province — this photographer travels outside Bicol"
                        value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We don't have a province/city dropdown outside the Bicol Region yet — just type the full address.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="guestCount">Estimated Guests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="guestCount" type="number" min={0} placeholder="e.g. 80"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value === "" ? "" : String(Math.max(0, Number(e.target.value))))} />
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
                  {additionalSchedules.length > 0 && ` Because you added extra sessions, only packages that allow multiple sessions can be selected${customAllowsMultiple ? " (this includes Build Your Own)" : ""}. Each session stays a separate schedule.`}
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
                    {p.packages.map((pk, i) => {
                      const blockedBySessions = additionalSchedules.length > 0 && !pk.allowsMultipleSessions;
                      const exceedsMax = !!pk.allowsMultipleSessions && !!pk.maxSessions && additionalSchedules.length + 1 > pk.maxSessions;
                      const doesNotFit = !packageFits(i);
                      return (
                        <button
                          key={pk.name}
                          type="button"
                          disabled={blockedBySessions || exceedsMax || doesNotFit}
                          onClick={() => setSelectedPkg(i)}
                          className={cn(
                            "w-full text-left p-5 rounded-xl border-2 transition-all duration-200",
                            selectedPkg === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                            (blockedBySessions || exceedsMax || doesNotFit) && "opacity-50 cursor-not-allowed hover:border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-heading font-semibold">{pk.name}</p>
                                {i === 1 && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Popular</span>}
                                {pk.allowsMultipleSessions && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                                    Multiple sessions{pk.maxSessions ? ` (up to ${pk.maxSessions})` : ""}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{pk.description}</p>
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {pk.hours != null && pk.hours > 0
                                  ? `${pk.hours} hour${pk.hours === 1 ? "" : "s"} of coverage`
                                  : "Duration to be confirmed with the photographer"}
                              </p>
                              {blockedBySessions && (
                                <p className="text-[11px] text-destructive mt-1.5">
                                  Single session only — remove your extra sessions (Date & Time step) to choose this package.
                                </p>
                              )}
                              {exceedsMax && (
                                <p className="text-[11px] text-destructive mt-1.5">
                                  This package covers up to {pk.maxSessions} session{pk.maxSessions === 1 ? "" : "s"} — you have {additionalSchedules.length + 1}. Remove a session (Date & Time step) to choose it.
                                </p>
                              )}
                              {!blockedBySessions && !exceedsMax && doesNotFit && (
                                <p className="text-[11px] text-destructive mt-1.5">
                                  Doesn't fit at {prettyTime(startTime)} — an existing booking or the photographer's buffer is in the way. Choose another start time to use this package.
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                            <p className="text-xl font-heading font-bold text-primary">{formatPrice(pk.price)}</p>
                            {locationType !== "Studio" && rawPhotographer?.packages[i]?.outdoorPrice != null && (
                              <p className="text-[10px] text-muted-foreground">Outdoor / on-location rate</p>
                            )}
                          </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What's Included</p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {pk.inclusions.map((inc, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  {inclusionText(inc)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {packageMode === "custom" && (
                  <div className="space-y-6">
                    {additionalSchedules.length > 0 && (
                      <div className={cn("p-3 rounded-lg bg-destructive/5 border border-destructive/30 text-xs flex items-start gap-2", customAllowsMultiple && "hidden")}>
                        <Info className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <span>Custom packages cover a single photography session. Remove your extra sessions, or switch to a fixed package that allows multiple sessions.</span>
                      </div>
                    )}

                    {rates.hourlyRate == null && !isUnitModel && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>These rates are set by <strong>{p.name}</strong>. Base fee starts at {formatPrice(rates.baseFee)}.</span>
                      </div>
                    )}

                    {isUnitModel && (
                      <div className="p-4 rounded-xl border border-border space-y-3">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            These rates are set by <strong>{p.name}</strong>:{" "}
                            {rates.pricingModel === "per_day"
                              ? `${formatPrice(unitRate)} per event day. Two sessions on the same date count as one day.`
                              : `${formatPrice(unitRate)} per person covered.`}
                            {rates.coverageHours
                              ? ` Coverage is ${rates.coverageHours} hour${rates.coverageHours === 1 ? "" : "s"} per session.`
                              : " The coverage length per session is confirmed by the photographer after you book."}
                          </span>
                        </div>
                        {rates.pricingModel === "per_person" && (
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Number of people to be covered</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={rates.maxPeople ?? undefined}
                              value={customPeople}
                              onChange={(e) => setCustomPeople(e.target.value)}
                              placeholder={rates.maxPeople ? `1 – ${rates.maxPeople}` : "e.g. 10"}
                            />
                            {rates.maxPeople != null && (
                              <p className="text-[11px] text-muted-foreground">Up to {rates.maxPeople} people per booking.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {rates.hourlyRate != null && (
                      <div className="p-4 rounded-xl border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-heading font-semibold">Photography Coverage</p>
                          <p className="text-sm font-medium">
                            {customHours ?? rates.minHours ?? 1} hour{(customHours ?? 1) === 1 ? "" : "s"}
                            <span className="text-muted-foreground font-normal ml-1">
                              ({formatPrice(calculateCustomPrice({ selectedExtraIds: [] }, rates, customHours ?? rates.minHours ?? 1))})
                            </span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select the number of photography coverage hours you need. The selected hours are the
                          agreed coverage period for your booking.
                        </p>
                        <Slider
                          min={rates.minHours ?? 1}
                          max={Math.max(rates.minHours ?? 1, primaryHourCap)}
                          step={1}
                          value={[customHours ?? rates.minHours ?? 1]}
                          onValueChange={([v]) => setCustomHours(v)}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{rates.minHours ?? 1} hr</span>
                          <span>{Math.max(rates.minHours ?? 1, primaryHourCap)} hr{Math.max(rates.minHours ?? 1, primaryHourCap) === 1 ? "" : "s"} max</span>
                        </div>
                        {primaryHourCap < (rates.maxHours ?? 12) && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {primaryHourCap < (rates.minHours ?? 1)
                              ? "The minimum coverage doesn't fit at this start time (another booking, the photographer's buffer, or another session is in the way). Go back and pick a different start time or date."
                              : `Another booking, buffer period or session follows this start time, so coverage can be at most ${primaryHourCap} hour${primaryHourCap === 1 ? "" : "s"}. For more, go back and choose an earlier start time.`}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                          {rates.baseHours != null
                            ? `${formatPrice(rates.baseFee)} covers the first ${rates.baseHours} hour${rates.baseHours === 1 ? "" : "s"}, then `
                            : ""}
                          {formatPrice(rates.hourlyRate)}/hour · Your selected hours are the agreed photography
                          coverage period. If your event ends earlier, the booked coverage and price remain
                          unchanged.
                        </p>
                      </div>
                    )}

                    {rates.hourlyRate != null && additionalSchedules.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-heading font-semibold">Coverage for each additional session</p>
                        <p className="text-xs text-muted-foreground">
                          Session 1 uses the hours chosen above. Each extra session is a separate schedule with its own
                          coverage hours, and is priced from those hours only.
                        </p>
                        {additionalSchedulesWithEndTime.map((s, idx) => {
                          const h = sessionCustomHours[s.key] ?? extraSessionMinHours;
                          return (
                            <div key={s.key} className="p-4 rounded-xl border border-border space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Session {idx + 2}{s.date ? ` · ${prettyDate(s.date)}` : ""}</p>
                                <p className="text-sm font-medium">
                                  {h} hour{h === 1 ? "" : "s"}
                                  <span className="text-muted-foreground font-normal ml-1">({formatPrice(slidingSessionCharges[idx + 1] ?? 0)})</span>
                                </p>
                              </div>
                              <Slider
                                min={extraSessionMinHours}
                                max={Math.max(extraSessionMinHours, Math.min(extraSessionMaxHours, maxHoursBeforeNextSibling(s.key, s.date, s.startTime), maxFittingHoursForSession(idx, s.startTime)))}
                                step={1}
                                value={[h]}
                                onValueChange={([v]) => setSessionHours(s.key, v)}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{extraSessionMinHours} hr</span>
                                <span>{extraSessionMaxHours} hrs</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {s.endTime ? <>Est. end time: <span className="font-medium text-foreground">{prettyTime(s.endTime)}</span></> : "End time shown once a start time is set."}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {rates.hourlyRate == null && tierGroups.map(([tierName, groupExtras]) => (
                      <div key={tierName} className="space-y-2">
                        <p className="text-sm font-heading font-semibold">{tierName}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {groupExtras!.map((extra) => {
                            const active = isTierOptionActive(groupExtras, extra);
                            return (
                              <button
                                key={extra.id}
                                type="button"
                                disabled={!durationExtraFits(extra.id)}
                                onClick={() => selectTierOption(groupExtras, extra)}
                                className={cn(
                                  "text-center p-3 rounded-xl border-2 transition-all duration-200",
                                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                                  !durationExtraFits(extra.id) && "opacity-40 cursor-not-allowed line-through hover:border-border"
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
                        {rates.hourlyRate == null && !isUnitModel && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Base fee</span><span>{formatPrice(rates.baseFee)}</span></div>
                        )}
                        {isUnitModel && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {rates.pricingModel === "per_day"
                                ? `${unitQuantity} day${unitQuantity === 1 ? "" : "s"} × ${formatPrice(unitRate)}`
                                : `${unitQuantity} ${unitQuantity === 1 ? "person" : "people"} × ${formatPrice(unitRate)}`}
                            </span>
                            <span>{formatPrice(unitRate * unitQuantity)}</span>
                          </div>
                        )}
                        {rates.hourlyRate != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {rates.baseHours != null
                                ? `Base fee (first ${rates.baseHours} hr${rates.baseHours === 1 ? "" : "s"}) + extra hours`
                                : `${customHours ?? rates.minHours ?? 1} hr × ${formatPrice(rates.hourlyRate)}`}
                            </span>
                            <span>{formatPrice(slidingSessionCharges[0] ?? 0)}</span>
                          </div>
                        )}

                        {rates.hourlyRate != null && additionalSchedules.map((s, idx) => {
                          const h = sessionCustomHours[s.key] ?? extraSessionMinHours;
                          return (
                            <div key={s.key} className="flex justify-between">
                              <span className="text-muted-foreground">Session {idx + 2} · {h} hr{h === 1 ? "" : "s"}</span>
                              <span>{formatPrice(slidingSessionCharges[idx + 1] ?? 0)}</span>
                            </div>
                          );
                        })}
                        {rates.hourlyRate != null && additionalSchedules.length > 0 && rates.baseFeeMode && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            {rates.baseFeeMode === "once"
                              ? "The base fee is charged once for the whole booking; other hours across all sessions are billed hourly."
                              : "Each session is charged the base fee plus the hourly rate for hours beyond the base hours."}
                          </p>
                        )}
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

            {/* ===== Step 2 (continued): Add-ons — same step as Package, fixed packages only ===== */}
            {step === 3 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Optional Add-ons</h3>
                {(
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
   <div className="mb-5">
     <BudgetOfferField
          subtotal={subtotal}
   platformFee={0}
       budget={budgetInput}
       note={budgetNote}
       onBudgetChange={setBudgetInput}
       onNoteChange={setBudgetNote}
     />
   </div>
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold">{p.avatar}</div>
                    <div>
                      <p className="font-heading font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.type} · {p.specialty}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border space-y-1">
                    <p><span className="text-muted-foreground">Event:</span> {Array.from(new Set(allScheduleEntries.map((s) => s.label))).join(" + ")}</p>
                    {allScheduleEntries.length > 1 && (
                      <p className="text-[11px] text-muted-foreground pt-1">
                        All sessions below belong to this one booking and package. This is a request, not a confirmed reservation — the photographer will review the requested sessions and confirm whether they can accommodate them. Each session is a separate schedule; the dates in between are not reserved.
                      </p>
                    )}
                    {allScheduleEntries.filter((s) => s.dateStr).map((s, i) => (
                      <div key={s.key} className={cn(i > 0 && "pt-2 mt-2 border-t border-border/50")}>
                        {allScheduleEntries.length > 1 && (
                          <p className="text-xs font-semibold text-foreground">Session {i + 1} — {s.label}</p>
                        )}
                        <p><span className="text-muted-foreground">Date:</span> {prettyDate(s.dateStr, "long")}</p>
                        <p><span className="text-muted-foreground">Starts:</span> {prettyTime(s.startTime)}</p>
                        <p>
                          <span className="text-muted-foreground">Estimated end:</span>{" "}
                          {s.endTime ? prettyTime(s.endTime) : "Duration to be confirmed by the photographer"}
                        </p>
                        {i > 0 && (
                          <p><span className="text-muted-foreground">Location:</span> {s.locationText || "Same as the main booking"}</p>
                        )}
                      </div>
                    ))}
                    {packageMode === "custom" && rates.hourlyRate != null && (
                      <p>
                      <span className="text-muted-foreground">Booked Coverage:</span>{" "}
                      {slidingSessionHours.length > 1
                        ? `${slidingSessionHours.map((h) => `${h} hr${h === 1 ? "" : "s"}`).join(" + ")} = ${slidingSessionHours.reduce((a, b) => a + b, 0)} hrs across ${slidingSessionHours.length} separate sessions`
                        : `${customHours ?? rates.minHours ?? 1} hour${(customHours ?? 1) === 1 ? "" : "s"}`}{" "}
                      ({formatPrice(rates.hourlyRate)}/hour)
                    </p>
                    )}
                    {packageMode === "custom" && rates.hourlyRate != null && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Photography Coverage Terms</p>
                        <p>
                          The selected coverage hours are the agreed photography coverage period. If the event
                          ends earlier, the booking price is not automatically reduced or refunded.
                        </p>
                        <p>
                          If your event runs longer than your booked coverage, you may request additional coverage
                          from the photographer. Additional coverage requires photographer approval and may incur
                          an additional hourly charge — it is not automatically granted or charged.
                        </p>
                      </div>
                    )}
                    {packageMode === "custom" && isUnitModel && (
                      <p>
                        <span className="text-muted-foreground">Custom pricing:</span>{" "}
                        {rates.pricingModel === "per_day"
                          ? `${unitQuantity} event day${unitQuantity === 1 ? "" : "s"} × ${formatPrice(unitRate)}`
                          : `${unitQuantity} ${unitQuantity === 1 ? "person" : "people"} × ${formatPrice(unitRate)}`}
                        {" · "}
                        {rates.coverageHours ? `${rates.coverageHours} hr coverage per session` : "coverage length to be confirmed by the photographer"}
                      </p>
                    )}
                    {packageMode === "custom" && rates.hourlyRate == null && !isUnitModel && selectedDurationExtra && (
                      <p><span className="text-muted-foreground">Coverage:</span> {selectedDurationExtra.label}</p>
                    )}
                    <p><span className="text-muted-foreground">Setting{allScheduleEntries.length > 1 ? " (main location)" : ""}:</span> {locationType}</p>
                    {locationType !== "Studio" && (
                      <p><span className="text-muted-foreground">Location:</span> {[
                        barangays.find((b) => b.id === barangayId)?.name,
                        citiesMunicipalities.find((c) => c.id === cityMunicipalityId)?.name,
                        provinces.find((pv) => pv.id === provinceId)?.name,
                      ].filter(Boolean).join(", ")}</p>
                    )}
                    {eventAddress && <p><span className="text-muted-foreground">Specific Address / Venue:</span> {eventAddress}</p>}
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
                      <strong>Note:</strong> By confirming, the photographer has up to 48 hours to review your request. Your time is only reserved once your request is accepted and your payment is confirmed. You won't be charged until it is approved.
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
                {date && allScheduleEntries.filter((s) => s.dateStr).map((s, i, arr) => (
                  <div key={s.key} className={cn("space-y-1", i > 0 && "pt-2 mt-1 border-t border-border/50")}>
                    {arr.length > 1 && (
                      <p className="text-xs font-medium text-foreground">Session {i + 1} · {s.label}</p>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{prettyDate(s.dateStr)}</span></div>
                    {s.startTime && <div className="flex justify-between"><span className="text-muted-foreground">Start time</span><span className="font-medium">{prettyTime(s.startTime)}</span></div>}
                    {showEndTimes && s.startTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. end time</span>
                        <span className="font-medium">{s.endTime ? prettyTime(s.endTime) : "To be confirmed"}</span>
                      </div>
                    )}
                    {i > 0 && s.locationText && (
                      <p className="text-[11px] text-muted-foreground">{s.locationText}</p>
                    )}
                  </div>
                ))}
                {eventType && <div className="flex justify-between"><span className="text-muted-foreground">Event</span><span className="font-medium text-right">{Array.from(new Set(allScheduleEntries.map((s) => s.label))).join(" + ")}</span></div>}
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
   <div className="flex justify-between items-center pt-1">
                  <span className="font-heading font-semibold">Total</span>
                     <span className="text-xl font-heading font-bold text-primary">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {!isLastStep ? (
                  <Button className="w-full" size="lg" onClick={handleNext} disabled={!currentValidation.ok || isCheckingAvailability}>
                    {isCheckingAvailability
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking availability…</>
                      : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleOpenConfirm}>
                       {budgetInput.trim() ? "Submit Booking Request with Offer" : "Submit Booking Request"}
                  </Button>
                )}
                {stepPos > 0 && (
                  <Button variant="outline" className="w-full" onClick={goBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous Step
                  </Button>
                )}
              </div>
              {!isLastStep && !currentValidation.ok && !isCheckingAvailability && currentValidation.reason && (
                <p className="text-xs text-destructive text-center mt-3">{currentValidation.reason}</p>
              )}
              <p className="text-xs text-muted-foreground text-center mt-3">
                No payment is required right now. Over your budget? You can offer your own price on the last step.
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
<p className="text-sm text-muted-foreground mb-6 leading-relaxed space-y-3">
                 <span className="block text-foreground font-medium">Send this request to {p.name}?</span>
<span className="block rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
  The photographer has <strong>up to 48 hours</strong> to review it. Your time is <strong>only reserved once your payment is confirmed</strong>, and you won't be charged until the request is approved.
</span>
   {budgetInput.trim() && (
  <span className="block rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
    <strong className="text-primary text-sm">Your offer: {formatPrice(Number(budgetInput))}</strong>{" "}
    sent with this request.
    <span className="block mt-1 text-muted-foreground">The listed price stays the same unless you accept the photographer's terms.</span>
  </span>
)}
            </p>
            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSubmitting}>Back</Button>
              <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : budgetInput.trim() ? "Confirm & Send Offer" : "Confirm Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}