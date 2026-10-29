import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api";
import { usePhotographerClients } from "@/hooks/usePhotographerClients";
import { useCreateManualBooking } from "@/hooks/usePhotographerBookings";
import { WALK_IN_SOURCES, type WalkInSource } from "@/services/photographerClientService";

export interface NewClientDraft {
  name: string;
  phone: string;
  email: string;
  location: string;
  source: WalkInSource;
}

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "prenup", label: "Prenup" },
  { value: "graduation", label: "Graduation" },
  { value: "portrait", label: "Portrait" },
  { value: "corporate_event", label: "Corporate Event" },
  { value: "product_photography", label: "Product Photography" },
  { value: "family_event", label: "Family Event" },
  { value: "other", label: "Other" },
];

const LOCATION_TYPES = [
  { value: "studio", label: "Studio" },
  { value: "client_location", label: "Client's location" },
  { value: "outdoor_location", label: "Outdoor location" },
  { value: "other", label: "Other" },
];

const EMPTY_CLIENT: NewClientDraft = { name: "", phone: "", email: "", location: "", source: "walk_in" };

const todayLocal = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the user's timezone

interface Props {
  open: boolean;
  onClose: () => void;
  /** Prefills the "New client" fields (used when continuing from the Add Walk-in Client form). */
  initialClient?: NewClientDraft | null;
}

export default function ManualBookingDialog({ open, onClose, initialClient = null }: Props) {
  const { toast } = useToast();
  const { data: clients = [] } = usePhotographerClients();
  const createManual = useCreateManualBooking();

  const walkIns = useMemo(
    () => clients.filter((c) => c.type === "walk-in" && c.status !== "archived"),
    [clients]
  );

  const [clientMode, setClientMode] = useState<"new" | "existing">("new");
  const [walkInId, setWalkInId] = useState("");
  const [client, setClient] = useState<NewClientDraft>(EMPTY_CLIENT);

  const [eventType, setEventType] = useState("wedding");
  const [customEventType, setCustomEventType] = useState("");
  const [packageName, setPackageName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationType, setLocationType] = useState("client_location");
  const [eventAddress, setEventAddress] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [markCompleted, setMarkCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start fresh (or prefilled) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setClientMode("new");
    setWalkInId("");
    setClient(initialClient ?? EMPTY_CLIENT);
    setEventType("wedding");
    setCustomEventType("");
    setPackageName("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setLocationType("client_location");
    setEventAddress("");
    setGuestCount("");
    setNotes("");
    setTotalPrice("");
    setAmountPaid("");
    setMarkCompleted(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canComplete = eventDate !== "" && eventDate <= todayLocal();
  const total = Number(totalPrice) || 0;
  const paid = Number(amountPaid) || 0;

  const validate = (): string | null => {
    if (clientMode === "existing") {
      if (!walkInId) return "Choose a walk-in client.";
    } else {
      if (!client.name.trim()) return "Enter the client's name.";
      if (!client.phone.trim()) return "Enter the client's phone number.";
    }
    if (eventType === "other" && !customEventType.trim()) return "Describe the type of event.";
    if (!eventDate) return "Choose the event date.";
    if (!startTime) return "Choose the start time.";
    if (endTime && endTime <= startTime) return "The end time must be after the start time.";
    if (totalPrice === "" || Number.isNaN(Number(totalPrice)) || Number(totalPrice) < 0) return "Enter the total price.";
    if (amountPaid !== "" && (Number.isNaN(Number(amountPaid)) || Number(amountPaid) < 0)) return "Enter a valid amount paid.";
    if (paid > total) return "The amount paid cannot be more than the total price.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    try {
      await createManual.mutateAsync({
        walkInClientId: clientMode === "existing" ? walkInId : undefined,
        newClient:
          clientMode === "new"
            ? {
                name: client.name.trim(),
                phone: client.phone.trim(),
                email: client.email.trim() || null,
                location: client.location.trim() || null,
                source: client.source,
              }
            : undefined,
        eventType,
        customEventType: eventType === "other" ? customEventType.trim() : null,
        packageName: packageName.trim() || null,
        eventDate,
        startTime,
        endTime: endTime || null,
        locationType,
        eventAddress: eventAddress.trim() || null,
        guestCount: guestCount ? Number(guestCount) : null,
        notes: notes.trim() || null,
        totalPrice: total,
        amountPaid: paid,
        markCompleted: canComplete && markCompleted,
      });
      toast({ title: "Manual booking recorded." });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't record this booking. Please try again."));
    }
  };

  const sectionTitle = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40 shrink-0">
          <div>
            <h2 className="text-base font-heading font-bold">Record a Manual Booking</h2>
            <p className="text-xs text-muted-foreground mt-0.5">For a client who booked you outside the system.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-5 space-y-6 overflow-y-auto">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                The booking is confirmed right away and blocks this date and time on your calendar. The client does not
                get a platform account or any notification.
              </p>
            </div>

            {/* CLIENT */}
            <section className="space-y-3">
              <h3 className={sectionTitle}>Client</h3>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                {(["new", "existing"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={mode === "existing" && walkIns.length === 0}
                    onClick={() => setClientMode(mode)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50",
                      clientMode === mode ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === "new" ? "New client" : "Existing walk-in client"}
                  </button>
                ))}
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Walk-in client <span className="text-destructive">*</span>
                  </Label>
                  <Select value={walkInId} onValueChange={setWalkInId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {walkIns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-name" className="text-xs font-semibold">
                      Full name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mb-name"
                      placeholder="e.g. Maria Santos"
                      value={client.name}
                      onChange={(e) => setClient({ ...client, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-phone" className="text-xs font-semibold">
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="mb-phone"
                      type="tel"
                      placeholder="e.g. +63 9XX XXX XXXX"
                      value={client.phone}
                      onChange={(e) => setClient({ ...client, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-email" className="text-xs font-semibold">
                      Email <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="mb-email"
                      type="email"
                      placeholder="e.g. maria@example.com"
                      value={client.email}
                      onChange={(e) => setClient({ ...client, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-location" className="text-xs font-semibold">
                      Location <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="mb-location"
                      placeholder="e.g. Bulan, Sorsogon"
                      value={client.location}
                      onChange={(e) => setClient({ ...client, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">How they reached you</Label>
                    <Select value={client.source} onValueChange={(v) => setClient({ ...client, source: v as WalkInSource })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WALK_IN_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </section>

            {/* EVENT */}
            <section className="space-y-3">
              <h3 className={sectionTitle}>Event</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Event type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {eventType === "other" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-custom" className="text-xs font-semibold">
                      Describe the event <span className="text-destructive">*</span>
                    </Label>
                    <Input id="mb-custom" value={customEventType} onChange={(e) => setCustomEventType(e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-package" className="text-xs font-semibold">
                      Package / service <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="mb-package"
                      placeholder="e.g. Wedding Gold"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="mb-date" className="text-xs font-semibold">
                    Event date <span className="text-destructive">*</span>
                  </Label>
                  <Input id="mb-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-start" className="text-xs font-semibold">
                      Start time <span className="text-destructive">*</span>
                    </Label>
                    <Input id="mb-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mb-end" className="text-xs font-semibold">
                      End time
                    </Label>
                    <Input id="mb-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2 -mt-2">
                  Leave the end time empty if the shoot is open-ended. A booking with no end time does not reserve a time window.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Location type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={locationType} onValueChange={setLocationType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-guests" className="text-xs font-semibold">
                    Guests <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="mb-guests"
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="mb-address" className="text-xs font-semibold">
                    Venue / address <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input id="mb-address" value={eventAddress} onChange={(e) => setEventAddress(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="mb-notes" className="text-xs font-semibold">
                    Notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea id="mb-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            </section>

            {/* PAYMENT */}
            <section className="space-y-3">
              <h3 className={sectionTitle}>Payment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mb-total" className="text-xs font-semibold">
                    Total price (₱) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mb-total"
                    type="number"
                    min={0}
                    step="0.01"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-paid" className="text-xs font-semibold">
                    Already paid (₱)
                  </Label>
                  <Input
                    id="mb-paid"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
              </div>
              {totalPrice !== "" && (
                <p className="text-xs text-muted-foreground">
                  Remaining balance: <strong className="text-foreground">₱{Math.max(0, total - paid).toLocaleString()}</strong>
                </p>
              )}

              {canComplete && (
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markCompleted}
                    onChange={(e) => setMarkCompleted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    <strong>This event already happened. Record it as completed.</strong>
                    <span className="block text-muted-foreground">
                      Leave unchecked if the shoot is today and still going on.
                    </span>
                  </span>
                </label>
              )}
            </section>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-card">
            <Button type="button" variant="outline" onClick={onClose} disabled={createManual.isPending} className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={createManual.isPending} className="h-9 text-xs font-semibold px-4">
              {createManual.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}