import { useState, useMemo } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Camera, AlertCircle, Calendar as CalendarIcon,
  ChevronLeft, Sparkles, Wallet, Wand2, Package as PackageIcon, Info, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  addOns, eventTypes,
  formatPrice, defaultCustomRates, type Photographer, type CustomRates,
} from "@/data/photographers";
import { usePhotographer, usePhotographers } from "@/hooks/usePhotographers";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import { LogIn, Lock } from "lucide-react";
import { bookingService } from "@/services/bookingService";

const steps = ["Date & Time", "Event Info", "Package", "Add-ons", "Payment", "Review"];

const suggestedTimes = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

const paymentOptions = [
  { id: "downpayment", label: "Downpayment (30%)", percent: 0.3, description: "Pay 30% now, balance on event day" },
  { id: "half",        label: "Half Payment (50%)", percent: 0.5, description: "Pay half now, half on event day" },
  { id: "full",        label: "Full Payment (100%)", percent: 1,  description: "Pay the full amount now" },
];

interface CustomBuild {
  photoTier: number;
  photographers: number;
  delivery: string;
  rawFiles: boolean;
  secondLocation: boolean;
}

function makeDefaultBuild(rates: CustomRates): CustomBuild {
  return {
    photoTier: rates.photoTiers[1]?.value ?? rates.photoTiers[0].value,
    photographers: rates.photographerTiers[0].value,
    delivery: rates.deliveryTiers[0].id,
    rawFiles: false,
    secondLocation: false,
  };
}

function calculateCustomPrice(b: CustomBuild, r: CustomRates): number {
  const photoPrice = r.photoTiers.find((t) => t.value === b.photoTier)?.price ?? 0;
  const photographerPrice = r.photographerTiers.find((t) => t.value === b.photographers)?.price ?? 0;
  const deliveryPrice = r.deliveryTiers.find((t) => t.id === b.delivery)?.price ?? 0;
  return r.baseFee + photoPrice + photographerPrice + deliveryPrice
    + (b.rawFiles ? r.rawFiles : 0) + (b.secondLocation ? r.secondLocation : 0);
}

export default function Booking() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useRole();

  const { data: photographer, isLoading: loadingPhotographer } = usePhotographer(id);
  const { data: allPhotographers = [] } = usePhotographers();
  const rates = photographer?.customRates ?? defaultCustomRates;

  const initialPkgParam = searchParams.get("package");
  const initialPkg = initialPkgParam !== null ? parseInt(initialPkgParam) : -1;

  const [step, setStep] = useState(0);
  const [packageMode, setPackageMode] = useState<"fixed" | "custom">("fixed");
  const [selectedPkg, setSelectedPkg] = useState<number>(initialPkg);
  const [customBuild, setCustomBuild] = useState<CustomBuild>(makeDefaultBuild(rates));
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([]);

  // Date & event details
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");   // HTML time input → "HH:MM" (24h)
  const [eventType, setEventType] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [paymentOption, setPaymentOption] = useState("downpayment");

  const p = photographer;
  const pkg = p && selectedPkg >= 0 ? p.packages[selectedPkg] ?? null : null;

  const dateStr = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

  // Each booked slot now means "this photographer is busy that whole day".
  const bookedDates = useMemo(() => {
    if (!p) return [];
    return p.bookedSlots.map((s) => {
      const [y, m, d] = s.date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [p]);

  const dayConflict = p?.bookedSlots.find((s) => s.date === dateStr);

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

  // === Pricing ===
  const customPrice = calculateCustomPrice(customBuild, rates);
  const packagePrice = packageMode === "fixed" ? (pkg?.price ?? 0) : customPrice;
  const packageName  = packageMode === "fixed" ? (pkg?.name ?? "—") : "Custom Package";
  const packagePhotos = packageMode === "fixed"
    ? (pkg?.photos ?? 0)
    : (rates.photoTiers.find((t) => t.value === customBuild.photoTier)?.value ?? 0);

  const subtotal = packagePrice + selectedAddOns.reduce((sum, i) => sum + addOns[i].price, 0);
  const selectedPayment = paymentOptions.find((o) => o.id === paymentOption) || paymentOptions[0];
  const dueNow = Math.round(subtotal * selectedPayment.percent);
  const balance = subtotal - dueNow;

  // ---- Validation per step (with messages) ----
  type StepValidation = { ok: boolean; reason?: string };
  const validateStep = (s: number): StepValidation => {
    switch (s) {
      case 0:
        if (!date) return { ok: false, reason: "Please pick an event date to continue." };
        if (dayConflict) return { ok: false, reason: "This date is fully booked — choose another date or try an alternative provider below." };
        if (!startTime) return { ok: false, reason: "Please choose a start time for your event." };
        return { ok: true };
      case 1:
        if (!eventType) return { ok: false, reason: "Please choose an event type." };
        if (!eventLocation.trim()) return { ok: false, reason: "Please enter the event location/venue." };
        if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim())
          return { ok: false, reason: "Please complete your contact details (name, phone, email)." };
        if (!/^\S+@\S+\.\S+$/.test(contactEmail))
          return { ok: false, reason: "Please enter a valid email address." };
        return { ok: true };
      case 2:
        if (packageMode === "fixed" && !pkg) return { ok: false, reason: "Please select a package to continue." };
        return { ok: true };
      case 3: return { ok: true };
      case 4:
        if (!paymentOption) return { ok: false, reason: "Please choose a payment option." };
        return { ok: true };
      case 5: return { ok: true };
      default: return { ok: true };
    }
  };
  const currentValidation = validateStep(step);

  const handleNext = () => {
    const v = validateStep(step);
    if (!v.ok) { toast({ title: "Can't continue yet", description: v.reason }); return; }
    setStep(step + 1);
  };

  const handleConfirm = async () => {
    for (let i = 0; i <= 5; i++) {
      const v = validateStep(i);
      if (!v.ok) { toast({ title: "Can't confirm yet", description: v.reason }); setStep(i); return; }
    }
    const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const record = {
      id: bookingId,
      clientEmail: user?.email ?? contactEmail,
      photographerId: p.id,
      photographerName: p.name,
      photographerAvatar: p.avatar,
      eventType, date: dateStr, startTime, eventLocation, guestCount, notes,
      contactName, contactPhone, contactEmail,
      packageName, packagePrice, packagePhotos,
      addOns: selectedAddOns.map((i) => addOns[i]),
      subtotal, dueNow, balance,
      paymentOption: selectedPayment.label,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    await bookingService.create(record);
    navigate(`/booking-sent/${bookingId}`);
  };

  // Pretty-print 24h "14:30" → "2:30 PM"
  const prettyTime = (t: string) => {
    if (!t) return "";
    const [hh, mm] = t.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Sign-in overlay for non-logged-in clients */}
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
      {/* Header */}
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
        {/* Step indicator */}
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

        {/* Inline guidance banner */}
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
                  Photographers cover your event from your start time onward — no per-hour booking. First, let's check the date is open.
                </p>

                <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive/40" /> Booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary/20 border border-primary/40" /> Available</span>
                </div>

                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0)) ||
                      bookedDates.some((ud) => ud.toDateString() === d.toDateString())
                    }
                    modifiers={{ booked: bookedDates }}
                    modifiersClassNames={{ booked: "!bg-destructive/20 !text-destructive line-through" }}
                    className="rounded-xl border pointer-events-auto"
                  />
                </div>

                {date && !dayConflict && (
                  <div className="mt-5 space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} is available!</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Now pick your event start time below.</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-primary" />
                        <p className="font-medium text-sm">Choose Start Time *</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">Coverage runs from this time until your event ends — no per-hour charges.</p>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                        {suggestedTimes.map((t) => (
                          <button
                            key={t}
                            onClick={() => setStartTime(t)}
                            className={cn(
                              "px-2 py-2 rounded-lg border text-xs font-medium transition-colors",
                              startTime === t
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            {prettyTime(t)}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor="customStart" className="text-xs text-muted-foreground whitespace-nowrap">Or pick a custom time:</Label>
                        <Input id="customStart" type="time" className="max-w-[160px]"
                          value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {date && dayConflict && (
                  <div className="mt-5 p-4 rounded-xl border border-accent/30 bg-accent/5">
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
                    onChange={(e) => setEventType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select event type…</option>
                    {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Event Location / Venue *</Label>
                  <Input id="location" placeholder="e.g. Bulan Municipal Hall, Zone 5"
                    value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestCount">Estimated Guests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="guestCount" type="number" placeholder="e.g. 80"
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

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Edited Photos</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {rates.photoTiers.map((t) => (
                          <button key={t.value} onClick={() => setCustomBuild({ ...customBuild, photoTier: t.value })}
                            className={cn("p-3 rounded-lg border-2 text-center transition-colors",
                              customBuild.photoTier === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                            <p className="text-xs font-medium">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.price === 0 ? "Included" : `+${formatPrice(t.price)}`}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Number of Photographers</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {rates.photographerTiers.map((t) => (
                          <button key={t.value} onClick={() => setCustomBuild({ ...customBuild, photographers: t.value })}
                            className={cn("p-3 rounded-lg border-2 text-center transition-colors",
                              customBuild.photographers === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                            <p className="text-xs font-medium">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.price === 0 ? "Included" : `+${formatPrice(t.price)}`}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Delivery Speed</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {rates.deliveryTiers.map((t) => (
                          <button key={t.id} onClick={() => setCustomBuild({ ...customBuild, delivery: t.id })}
                            className={cn("p-3 rounded-lg border-2 text-left transition-colors",
                              customBuild.delivery === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                            <p className="text-xs font-medium">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.price === 0 ? "Included" : `+${formatPrice(t.price)}`}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div>
                          <p className="text-sm font-medium">Include RAW Files</p>
                          <p className="text-xs text-muted-foreground">All unedited high-resolution files</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">+{formatPrice(rates.rawFiles)}</span>
                          <Switch checked={customBuild.rawFiles} onCheckedChange={(v) => setCustomBuild({ ...customBuild, rawFiles: v })} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div>
                          <p className="text-sm font-medium">Second Location Coverage</p>
                          <p className="text-xs text-muted-foreground">Cover an additional venue or location</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">+{formatPrice(rates.secondLocation)}</span>
                          <Switch checked={customBuild.secondLocation} onCheckedChange={(v) => setCustomBuild({ ...customBuild, secondLocation: v })} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="w-4 h-4 text-primary" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Price Breakdown</p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Base fee</span><span>{formatPrice(rates.baseFee)}</span></div>
                        {(rates.photoTiers.find((t) => t.value === customBuild.photoTier)?.price ?? 0) > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Photos ({rates.photoTiers.find((t) => t.value === customBuild.photoTier)?.label})</span><span>+{formatPrice(rates.photoTiers.find((t) => t.value === customBuild.photoTier)!.price)}</span></div>
                        )}
                        {(rates.photographerTiers.find((t) => t.value === customBuild.photographers)?.price ?? 0) > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Extra photographers</span><span>+{formatPrice(rates.photographerTiers.find((t) => t.value === customBuild.photographers)!.price)}</span></div>
                        )}
                        {(rates.deliveryTiers.find((t) => t.id === customBuild.delivery)?.price ?? 0) > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">{rates.deliveryTiers.find((t) => t.id === customBuild.delivery)!.label}</span><span>+{formatPrice(rates.deliveryTiers.find((t) => t.id === customBuild.delivery)!.price)}</span></div>
                        )}
                        {customBuild.rawFiles && <div className="flex justify-between"><span className="text-muted-foreground">RAW files</span><span>+{formatPrice(rates.rawFiles)}</span></div>}
                        {customBuild.secondLocation && <div className="flex justify-between"><span className="text-muted-foreground">Second location</span><span>+{formatPrice(rates.secondLocation)}</span></div>}
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
                <p className="text-sm text-muted-foreground mb-5">Enhance your booking — feel free to skip this step.</p>
                <div className="space-y-3">
                  {addOns.map((addon, i) => (
                    <button key={addon.name} onClick={() => toggleAddOn(i)}
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
              </div>
            )}

            {/* ===== Step 4: Payment ===== */}
            {step === 4 && (
              <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 animate-fade-up">
                <h3 className="font-heading font-semibold text-lg mb-1">Payment Option</h3>
                <p className="text-sm text-muted-foreground mb-5">Pick how much you'd like to pay now. You'll review everything in the next step.</p>
                <div className="space-y-3">
                  {paymentOptions.map((opt) => {
                    const due = Math.round(subtotal * opt.percent);
                    const remaining = subtotal - due;
                    return (
                      <button key={opt.id} onClick={() => setPaymentOption(opt.id)}
                        className={cn("w-full text-left p-5 rounded-xl border-2 transition-all duration-200",
                          paymentOption === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                              paymentOption === opt.id ? "border-primary" : "border-muted-foreground/30")}>
                              {paymentOption === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="font-heading font-semibold flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-primary" /> {opt.label}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">Due now</p>
                            <p className="font-heading font-bold text-primary">{formatPrice(due)}</p>
                            {remaining > 0 && <p className="text-[11px] text-muted-foreground mt-0.5">+ {formatPrice(remaining)} balance</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== Step 5: Review ===== */}
            {step === 5 && (
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
                    <p><span className="text-muted-foreground">Event:</span> {eventType}</p>
                    <p><span className="text-muted-foreground">Date:</span> {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                    <p><span className="text-muted-foreground">Start time:</span> {prettyTime(startTime)}</p>
                    <p><span className="text-muted-foreground">Location:</span> {eventLocation}</p>
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
                    {selectedAddOns.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1">
                        {selectedAddOns.map((i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">+ {addOns[i].name}</span>
                            <span>{formatPrice(addOns[i].price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-border space-y-1">
                    <p><span className="text-muted-foreground">Payment:</span> {selectedPayment.label}</p>
                    <p><span className="text-muted-foreground">Due now:</span> {formatPrice(dueNow)}{balance > 0 && <> · <span className="text-muted-foreground">Balance:</span> {formatPrice(balance)}</>}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border space-y-1">
                    <p><span className="text-muted-foreground">Contact:</span> {contactName} · {contactPhone}</p>
                    <p><span className="text-muted-foreground">Email:</span> {contactEmail}</p>
                    {notes && <p><span className="text-muted-foreground">Notes:</span> {notes}</p>}
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
                {eventType && <div className="flex justify-between"><span className="text-muted-foreground">Event</span><span className="font-medium">{eventType}</span></div>}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{packageMode === "fixed" ? (pkg ? `${pkg.name} Package` : "No package selected") : "Custom Package"}</span>
                  <span className="font-medium">{formatPrice(packagePrice)}</span>
                </div>
                {selectedAddOns.map((i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{addOns[i].name}</span>
                    <span className="font-medium">{formatPrice(addOns[i].price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-semibold">Total</span>
                  <span className="text-xl font-heading font-bold text-primary">{formatPrice(subtotal)}</span>
                </div>
                {step >= 4 && (
                  <>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-border/60">
                      <span className="text-muted-foreground">Due now</span>
                      <span className="font-semibold text-primary">{formatPrice(dueNow)}</span>
                    </div>
                    {balance > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Balance later</span>
                        <span className="font-medium">{formatPrice(balance)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {step < steps.length - 1 ? (
                  <Button className="w-full" size="lg" onClick={handleNext} disabled={!currentValidation.ok}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleConfirm}>
                    Confirm Booking
                  </Button>
                )}
                {step > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous Step
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Your payment is held safely — released to the photographer after confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
