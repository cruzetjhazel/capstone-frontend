import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Cake, Heart, PartyPopper, GraduationCap, Camera,
  Trees, Baby, Home as HomeIcon, Building2, ChevronDown
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/* ----- options ----- */
const popularServices = [
  { name: "Birthday Photoshoot", desc: "Parties, kids' birthdays, and family celebrations", icon: Cake },
  { name: "Wedding Coverage", desc: "Full-day event coverage, ceremony, and reception", icon: Heart },
  { name: "Debut Photoshoot", desc: "Pre-debut shoots and 18th birthday celebrations", icon: PartyPopper },
  { name: "Graduation Photoshoot", desc: "Graduation portraits, ceremonies, and family photos", icon: GraduationCap },
];
const suggestedServices = [
  { name: "Portrait Session", desc: "Solo, couple, family, or group portraits", icon: Camera },
  { name: "Outdoor Photoshoot", desc: "Natural light sessions in parks or open locations", icon: Trees },
  { name: "Baptism Coverage", desc: "Church ceremony and family gathering coverage", icon: Baby },
];

const quickLocations = [
  { name: "Anywhere in Bulan", desc: "Show photographers available across Bulan", icon: MapPin },
  { name: "At my location", desc: "The photographer will travel to your address", icon: HomeIcon },
  { name: "Photographer's studio", desc: "Find photographers with indoor studio setups", icon: Camera },
  { name: "Outdoor location", desc: "Parks, beaches, streets, and open-air spots", icon: Trees },
  { name: "Event venue", desc: "Search known venues, halls, churches, and resorts", icon: Building2 },
];
const popularAreas = [
  { name: "Poblacion", desc: "Central area, near shops and common event places" },
  { name: "Sabang Beach", desc: "Outdoor, coastal, and casual photoshoot locations" },
  { name: "Zone 2", desc: "Local celebrations and outdoor photo sessions" },
  { name: "Zone 1", desc: "Nearby homes, small gatherings, and family events" },
];

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

interface Props {
  initialService?: string;
  initialDate?: string;
  initialLocation?: string;
  variant?: "hero" | "compact";
}

type Panel = "what" | "when" | "where" | null;

export default function SearchBar({
  initialService = "",
  initialDate = "",
  initialLocation = "",
  variant = "hero",
}: Props) {
  const navigate = useNavigate();
  const [service, setService] = useState(initialService);
  const [date, setDate] = useState<Date | undefined>(initialDate ? new Date(initialDate) : undefined);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [locationQuery, setLocationQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasAnyInput = Boolean(service || date || location);

  const handleSearch = () => {
    if (!hasAnyInput) {
      setPanel("what");
      return;
    }
    // Validation: if a date is chosen but no time, prompt time step
    if (date && !time) {
      setPanel("when");
      return;
    }
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (date) params.set("date", date.toISOString().split("T")[0]);
    if (time) params.set("time", time);
    if (location) params.set("location", location);
    setPanel(null);
    navigate(`/explore?${params.toString()}`);
  };

  const reset = () => {
    setService("");
    setDate(undefined);
    setTime("");
    setLocation("");
    setLocationQuery("");
  };

  const compact = variant === "compact";
  const dateLabel = date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (time ? ` · ${time}` : "") : "add date";

  const Pill = ({ id, label, value, placeholder, rounded }: { id: Panel; label: string; value: string; placeholder: string; rounded?: "l" | "r" }) => (
    <button
      onClick={() => setPanel(panel === id ? null : id)}
      className={cn(
        "flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors",
        rounded === "l" && "rounded-l-full",
        rounded === "r" && "rounded-r-full",
        compact ? "px-4 py-2 sm:px-5 sm:py-2.5" : "px-5 py-3 sm:px-6 sm:py-3.5",
        panel === id && "bg-muted/40"
      )}
    >
      <span className="text-[11px] sm:text-xs font-semibold text-foreground block">{label}</span>
      <span className={cn("text-xs sm:text-sm truncate block", value ? "text-foreground font-medium" : "text-muted-foreground")}>
        {value || placeholder}
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative w-full max-w-3xl mx-auto">
      <div
        className={cn(
          "flex items-stretch bg-card rounded-full border border-border overflow-visible",
          compact ? "shadow-md" : "shadow-xl"
        )}
      >
        <Pill id="what" label="what" value={service} placeholder="select service" rounded="l" />
        <div className="w-px bg-border my-2" />
        <Pill id="when" label="when" value={dateLabel === "add date" ? "" : dateLabel} placeholder="add date" />
        <div className="w-px bg-border my-2" />
        <Pill id="where" label="where" value={location} placeholder="Bulan only" />

        <div className={cn("flex items-center gap-1 pr-2", compact ? "py-1.5" : "py-2")}>
          {hasAnyInput && (
            <button
              onClick={reset}
              aria-label="Reset search"
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 hidden sm:inline"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSearch}
            aria-label="Search"
            className={cn(
              "rounded-full bg-primary text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95 font-medium",
              compact ? "h-10 px-4" : "h-12 px-5"
            )}
          >
            <Search className={compact ? "w-4 h-4" : "w-5 h-5"} />
            {!compact && <span className="text-sm">Search</span>}
          </button>
        </div>
      </div>


      {/* ===== WHAT panel ===== */}
      {panel === "what" && (
        <div className="absolute top-full left-0 mt-3 w-[460px] max-w-[92vw] bg-card rounded-3xl border border-border shadow-2xl z-50 p-6 animate-fade-in max-h-[70vh] overflow-y-auto">
          <h3 className="font-heading font-bold text-primary mb-1">What are you booking?</h3>
          <p className="text-xs text-muted-foreground mb-4">Choose the type of shoot or event you need covered.</p>

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Popular searches in Bulan</p>
          <div className="space-y-1 mb-4">
            {popularServices.map((s) => (
              <button key={s.name} onClick={() => { setService(s.name); setPanel("when"); }}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                <s.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Suggested services</p>
          <div className="space-y-1">
            {suggestedServices.map((s) => (
              <button key={s.name} onClick={() => { setService(s.name); setPanel("when"); }}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                <s.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== WHEN panel ===== */}
      {panel === "when" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[560px] max-w-[95vw] bg-card rounded-3xl border border-border shadow-2xl z-50 p-6 animate-fade-in max-h-[80vh] overflow-y-auto">
          <h3 className="font-heading font-bold text-primary mb-1">When do you need a photographer?</h3>
          <p className="text-xs text-muted-foreground mb-4">Pick a date to see available photographers.</p>

          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-foreground block mb-2">Start Time</label>
            <div className="relative">
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full appearance-none border border-border rounded-xl px-4 py-3 text-sm bg-card pr-10 focus:outline-none focus:border-primary"
              >
                <option value="">select the start time of event</option>
                {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={() => setPanel("where")}
              className="text-sm font-medium text-primary hover:underline">
              Next: Choose location →
            </button>
          </div>
        </div>
      )}

      {/* ===== WHERE panel ===== */}
      {panel === "where" && (
        <div className="absolute top-full right-0 mt-3 w-[460px] max-w-[92vw] bg-card rounded-3xl border border-border shadow-2xl z-50 p-6 animate-fade-in max-h-[70vh] overflow-y-auto">
          <h3 className="font-heading font-bold text-primary mb-1">Where will the shoot happen?</h3>
          <p className="text-xs text-muted-foreground mb-4">Choose a location in Bulan or select a venue.</p>

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search barangay, venue, or address"
              className="w-full pl-10 pr-4 py-3 rounded-full border border-border bg-card text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Quick Options</p>
          <div className="space-y-1 mb-4">
            {quickLocations.map((l) => (
              <button key={l.name} onClick={() => { setLocation(l.name); setPanel(null); }}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                <l.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Popular Areas in Bulan</p>
          <div className="space-y-1">
            {popularAreas.map((a) => (
              <button key={a.name} onClick={() => { setLocation(a.name); setPanel(null); }}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
