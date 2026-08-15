import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, Star, MapPin, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarketingNavbar from "@/components/MarketingNavbar";
import SearchBar from "@/components/SearchBar";
import { usePhotographers } from "@/hooks/usePhotographers";
import {
  typeFilters,
  priceFilters,
  ratingFilters,
  formatPrice,
} from "@/data/photographers";

// Generic terms from the SearchBar that shouldn't trigger strict location filtering
const GENERIC_LOCATIONS = [
  "anywhere in bulan",
  "at my location",
  "event venue",
  "outdoor location",
  "photographer's studio",
  "bulan, sorsogon"
];

const sortOptions = ["rating", "favorites", "reviews", "price-low", "price-high"] as const;
const sortLabels: Record<(typeof sortOptions)[number], string> = {
  rating: "Recommended",
  favorites: "Most Favorited",
  reviews: "Most Reviewed",
  "price-low": "Lowest price",
  "price-high": "Highest price",
};

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. PERFECT SYNC: Read state strictly from the URL. No useState required for filters.
  const activeService = searchParams.get("service") || "All";
  const urlDate = searchParams.get("date") || "";
  const urlLocation = searchParams.get("location") || "";
  const activeType = searchParams.get("type") || "All";
  const activePriceIdx = Number(searchParams.get("price") || 0);
  const activeRatingIdx = Number(searchParams.get("rating") || 0);
  const sortBy = (searchParams.get("sort") as "rating" | "favorites" | "price-low" | "price-high" | "reviews") || "rating";

  const [openPanel, setOpenPanel] = useState<"filters" | "sort" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const { data: allPhotographers = [], isLoading: dataLoading } = usePhotographers(urlDate ? { date: urlDate } : undefined);
  const loading = dataLoading || filterLoading;

  // 2. HELPER FUNCTION: Updates the URL instantly when a filter chip is clicked
  const setParam = (key: string, value: string, defaultValue: string = "") => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== defaultValue) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params, { replace: true });
  };

  // Simulate a quick loading skeleton when filters change for better UX
  useEffect(() => {
    setFilterLoading(true);
    const t = setTimeout(() => setFilterLoading(false), 300);
    return () => clearTimeout(t);
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  // 3. SMART FILTERING: Handles fuzzy matching so the SearchBar never breaks
  const filtered = useMemo(() => {
    const pf = priceFilters[activePriceIdx];
    const rf = ratingFilters[activeRatingIdx];
    
    const results = allPhotographers.filter((s) => {
      // Smart Service/Name Match (Case insensitive, partial match against services or the provider's own name)
      if (activeService !== "All") {
        const q = activeService.toLowerCase();
        const hasService = s.services.some(svc => svc.toLowerCase().includes(q) || q.includes(svc.toLowerCase()));
        const nameMatches = s.name.toLowerCase().includes(q);
        if (!hasService && !nameMatches) return false;
      }

      // Exact Type Match
      if (activeType !== "All" && s.type !== activeType) return false;
      
      // Budget: strict containment on priceMin (the same field price sorting uses),
      // so anything that passes this filter is guaranteed to fall inside the bracket.
      if (pf.min > 0 || pf.max < Infinity) {
        if (s.priceMin < pf.min || s.priceMin > pf.max) return false;
      }
      if (rf.min > 0 && s.rating < rf.min) return false;

      // Smart Location Match (Ignores generic terms, matches specific ones)
      if (urlLocation) {
        const query = urlLocation.toLowerCase().trim();
        if (!GENERIC_LOCATIONS.includes(query)) {
          if (!s.location.toLowerCase().includes(query)) {
            return false;
          }
        }
      }

      return true;
    });

    // Sorting logic
    switch (sortBy) {
      case "rating": results.sort((a, b) => b.rating - a.rating); break;
      case "favorites": results.sort((a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0)); break;
      case "price-low": results.sort((a, b) => a.priceMin - b.priceMin); break;
      case "price-high": results.sort((a, b) => b.priceMax - a.priceMax); break;
      case "reviews": results.sort((a, b) => b.reviews - a.reviews); break;
    }
    return results;
  }, [activeService, activeType, activePriceIdx, activeRatingIdx, sortBy, urlLocation, urlDate, allPhotographers]);

  const activeFilterCount = [
    activeService !== "All",
    activeType !== "All",
    activePriceIdx !== 0,
    activeRatingIdx !== 0,
  ].filter(Boolean).length;

  const clearAll = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("service");
    params.delete("type");
    params.delete("price");
    params.delete("rating");
    // We intentionally don't delete date/location so the user's primary search remains
    setSearchParams(params, { replace: true });
  };

  // Filters-popover-only reset: clears secondary filters (type/price/rating), leaves
  // What/When/Where alone since those are the search bar's own criteria, not filters.
  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("type");
    params.delete("price");
    params.delete("rating");
    setSearchParams(params, { replace: true });
    setOpenPanel(null);
  };
  const ChipRow = <T extends string>({
    label,
    options,
    active,
    onSelect,
    labelOf,
  }: {
    label: string;
    options: readonly T[];
    active: T;
    onSelect: (v: T) => void;
    labelOf?: (v: T) => string;
  }) => (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              active === opt
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            )}
          >
            {labelOf ? labelOf(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MarketingNavbar solid />

      {/* Search + filters header */}
      <section className="pt-20 sm:pt-24 pb-4 px-4 sm:px-6 border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">Explore photographers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[
                activeService !== "All" ? activeService : null,
                urlDate || null,
                urlLocation && !GENERIC_LOCATIONS.includes(urlLocation.toLowerCase()) ? urlLocation : "Bulan, Sorsogon",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <SearchBar
            initialService={activeService !== "All" ? activeService : ""}
            initialDate={urlDate}
            initialLocation={urlLocation}
          />

          <div ref={panelRef} className="relative flex flex-wrap items-center justify-center gap-2 text-sm">
            <button
              onClick={() => setOpenPanel(openPanel === "filters" ? null : "filters")}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
                (openPanel === "filters" || activeFilterCount > 0) && "text-foreground border-primary/50"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setOpenPanel(openPanel === "sort" ? null : "sort")}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
                openPanel === "sort" && "text-foreground border-primary/50"
              )}
            >
              <span>Sort by: {sortLabels[sortBy]}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Filters popover */}
            {openPanel === "filters" && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[320px] sm:w-[420px] text-left bg-card border border-border rounded-2xl p-4 animate-fade-in shadow-xl z-50">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChipRow label="Provider Type" options={typeFilters} active={activeType} onSelect={(v) => setParam("type", v, "All")} />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Budget</p>
                    <div className="space-y-1">
                      {priceFilters.map((_, i) => {
                        const budgetLabels = ["Any budget", "Under ₱3,000", "₱3,000–₱5,000", "₱5,000–₱10,000", "₱10,000+"];
                        const selected = activePriceIdx === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setParam("price", String(i), "0")}
                            className="w-full flex items-center gap-2 text-left px-1 py-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <span
                              className={cn(
                                "w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center",
                                selected ? "border-primary" : "border-border"
                              )}
                            >
                              {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </span>
                            <span className={cn("text-xs", selected ? "text-foreground font-medium" : "text-muted-foreground")}>
                              {budgetLabels[i] ?? priceFilters[i].label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {(activeType !== "All" || activePriceIdx !== 0) && (
                  <button onClick={clearFilters} className="mt-4 text-xs text-primary hover:underline font-medium">
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Sort popover */}
            {openPanel === "sort" && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[220px] text-left bg-card border border-border rounded-2xl p-2 animate-fade-in shadow-xl z-50">
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setParam("sort", opt, "rating"); setOpenPanel(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      sortBy === opt ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold">
              {(() => {
                const parts = [activeService !== "All" ? activeService : null, activeType !== "All" ? activeType : null].filter(Boolean);
                return parts.length ? `${parts.join(" ")} Photographers` : "All Photographers & Studios";
              })()}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {loading ? "Searching…" : `Showing ${filtered.length} of ${allPhotographers.length} results`}
            </p>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {activeService !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {activeService}
                <button onClick={() => setParam("service", "All", "All")} aria-label="Remove service filter" className="hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeType !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {activeType}
                <button onClick={() => setParam("type", "All", "All")} aria-label="Remove type filter" className="hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activePriceIdx !== 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {priceFilters[activePriceIdx].label}
                <button onClick={() => setParam("price", "0", "0")} aria-label="Remove price filter" className="hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeRatingIdx !== 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                ★ {ratingFilters[activeRatingIdx].label}
                <button onClick={() => setParam("rating", "0", "0")} aria-label="Remove rating filter" className="hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results grid or skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/50 overflow-hidden card-shadow animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-5 w-14 bg-muted rounded-full" />
                    <div className="h-5 w-14 bg-muted rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-8 w-20 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-1 text-lg">No photographers match your current search</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">Try adjusting your date, budget, or provider type.</p>
            {allPhotographers.length > 0 && activeFilterCount > 0 && (
              <p className="text-xs text-muted-foreground mb-6">
                {allPhotographers.length} photographer{allPhotographers.length === 1 ? "" : "s"} found without these filters
              </p>
            )}
            <Button variant="outline" onClick={activeFilterCount > 0 ? clearFilters : clearAll} className="rounded-full">Clear filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={`/photographers/${s.id}`}
                className="group bg-card rounded-xl card-shadow border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200"
              >
                <div className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center relative overflow-hidden">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-heading font-bold text-primary/20">{s.avatar}</span>
                  )}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-card/90 text-xs font-medium border border-border">
                    {s.type}
                  </span>
                  {s.rating >= 4.9 && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium flex items-center gap-1">
                      Top Rated
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-heading font-semibold text-sm truncate pr-2">{s.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                      <span className="text-xs font-semibold">{s.rating}</span>
                      <span className="text-xs text-muted-foreground">({s.reviews})</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{s.specialty}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{s.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.services.slice(0, 3).map((svc) => (
                      <span key={svc} className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">{svc}</span>
                    ))}
                    {s.services.length > 3 && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">+{s.services.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm font-semibold text-primary">{formatPrice(s.priceMin)}–{formatPrice(s.priceMax)}</span>
                    <Button size="sm" className="text-xs h-8">View Profile</Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}