import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePhotographers } from "@/hooks/usePhotographers";


interface Props {
  initialService?: string;
  initialDate?: string;
  initialLocation?: string;
  variant?: "hero" | "compact";
}

type Panel = "what" | "when" | "where" | null;

// Common municipalities/cities clients search from, shown as quick picks —
// but the input itself is free text, so any location can be typed in.
const LOCATION_PRESETS = [
  "Bulan, Sorsogon",
  "Irosin, Sorsogon",
  "Sorsogon City, Sorsogon",
  "Legazpi, Albay",
  "Anywhere",
];

export default function SearchBar({
  initialService = "",
  initialDate = "",
  initialLocation = "",
  variant = "hero",
}: Props) {
  const navigate = useNavigate();
  const [service, setService] = useState(initialService);
  const [date, setDate] = useState<Date | undefined>(initialDate ? new Date(initialDate) : undefined);
  const [location, setLocation] = useState(initialLocation || "Bulan, Sorsogon");
  const { data: allPhotographers = [] } = usePhotographers();
  const allServices = useMemo(
    () => Array.from(new Set(allPhotographers.flatMap((p) => p.services))).sort((a, b) => a.localeCompare(b)),
    [allPhotographers]
  );
  // "Popular" = highest actual frequency across all approved photographers' real
  // service lists — not fabricated stats, since the app has no click/search tracking yet.
  const popularServices = useMemo(() => {
    const counts = new Map<string, number>();
    allPhotographers.forEach((p) => p.services.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
  }, [allPhotographers]);
  const matchedServices = useMemo(() => {
    const q = service.trim().toLowerCase();
    return q ? allServices.filter((s) => s.toLowerCase().includes(q)) : allServices;
  }, [service, allServices]);
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasAnyInput = Boolean(service || date);

  const handleSearch = () => {
    if (!hasAnyInput) {
      setPanel("what");
      return;
    }
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (date) params.set("date", date.toISOString().split("T")[0]);
    if (location && location !== "Anywhere") params.set("location", location);
    setPanel(null);
    navigate(`/explore?${params.toString()}`);
  };

  const reset = () => {
      setService("");
      setDate(undefined);
    };

  const compact = variant === "compact";
  const dateLabel = date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "add date";

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
        <Pill id="where" label="where" value={location === "Bulan, Sorsogon" ? "" : location} placeholder="Bulan, Sorsogon" />

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
          <p className="text-xs text-muted-foreground mb-4">Search events, services, or photography types.</p>

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Search events, services, or photography types..."
              className="w-full pl-10 pr-4 py-3 rounded-full border border-border bg-card text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {!service.trim() && (
            <>
              {popularServices.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Popular searches in Bulan</p>
                  <div className="space-y-1 mb-4">
                    {popularServices.map((name) => (
                      <button key={name} onClick={() => { setService(name); setPanel("when"); }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                        <Camera className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-sm font-semibold">{name}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">
            {service.trim() ? "Matching services" : "All available services"}
          </p>
          {matchedServices.length > 0 ? (
            <div className="space-y-1">
              {matchedServices.map((name) => (
                <button key={name} onClick={() => { setService(name); setPanel("when"); }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors">
                  <Camera className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">{name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm font-medium">No matching services found</p>
              <p className="text-xs text-muted-foreground mt-1">Try another event, service, or photography type.</p>
            </div>
          )}
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
              onSelect={(d) => { setDate(d); setPanel(null); }}
              numberOfMonths={1}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md"
            />
          </div>

          </div>
      )}

      {/* ===== WHERE panel ===== */}
      {panel === "where" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[420px] max-w-[92vw] bg-card rounded-3xl border border-border shadow-2xl z-50 p-6 animate-fade-in max-h-[70vh] overflow-y-auto">
          <h3 className="font-heading font-bold text-primary mb-1">Where's the event?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Search isn't limited to Bulan — type any city, municipality, or province, or pick a quick option below.
          </p>

          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPanel(null)}
            placeholder="e.g. Sorsogon City, Sorsogon"
            className="w-full px-4 py-3 rounded-full border border-border bg-card text-sm focus:outline-none focus:border-primary mb-4"
            autoFocus
          />

          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Quick picks</p>
          <div className="space-y-1">
            {LOCATION_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => { setLocation(preset); setPanel(null); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-semibold">{preset}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}