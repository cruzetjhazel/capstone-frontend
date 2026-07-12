import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, Star, MapPin, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarketingNavbar from "@/components/MarketingNavbar";
import SearchBar from "@/components/SearchBar";
import { usePhotographers } from "@/hooks/usePhotographers";
import {
  serviceFilters,
  typeFilters,
  priceFilters,
  ratingFilters,
  formatPrice,
} from "@/data/photographers";

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawService = searchParams.get("service") || "All";
  const initialService = serviceFilters.includes(rawService) ? rawService : "All";
  const urlDate = searchParams.get("date") || "";
  const urlTime = searchParams.get("time") || "";
  const urlLocation = searchParams.get("location") || "";
  const urlType = searchParams.get("type") || "All";
  const urlPriceIdx = Number(searchParams.get("price") || 0);
  const urlRatingIdx = Number(searchParams.get("rating") || 0);
  const urlSort = (searchParams.get("sort") as "rating" | "price-low" | "price-high" | "reviews") || "rating";

  const [activeService, setActiveService] = useState(initialService);
  const [activeType, setActiveType] = useState(typeFilters.includes(urlType) ? urlType : "All");
  const [activePriceIdx, setActivePriceIdx] = useState(Number.isFinite(urlPriceIdx) ? urlPriceIdx : 0);
  const [activeRatingIdx, setActiveRatingIdx] = useState(Number.isFinite(urlRatingIdx) ? urlRatingIdx : 0);
  const [sortBy, setSortBy] = useState<"rating" | "price-low" | "price-high" | "reviews">(urlSort);
  const [showFilters, setShowFilters] = useState(false);
  const [filterLoading, setFilterLoading] = useState(true);
  const { data: allPhotographers = [], isLoading: dataLoading } = usePhotographers();
  const loading = dataLoading || filterLoading;

  // Persist all filter state into the URL for shareable/bookmarkable results.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const set = (k: string, v: string, def = "") => (v && v !== def ? params.set(k, v) : params.delete(k));
    set("service", activeService, "All");
    set("type", activeType, "All");
    set("price", String(activePriceIdx), "0");
    set("rating", String(activeRatingIdx), "0");
    set("sort", sortBy, "rating");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeService, activeType, activePriceIdx, activeRatingIdx, sortBy]);

  // Simulate a fetch on filter/sort change so the UI shows a proper loading state.
  useEffect(() => {
    setFilterLoading(true);
    const t = setTimeout(() => setFilterLoading(false), 350);
    return () => clearTimeout(t);
  }, [activeService, activeType, activePriceIdx, activeRatingIdx, sortBy]);


  const filtered = useMemo(() => {
    const pf = priceFilters[activePriceIdx];
    const rf = ratingFilters[activeRatingIdx];
    const results = allPhotographers.filter((s) => {
      if (activeService !== "All" && !s.services.includes(activeService)) return false;
      if (activeType !== "All" && s.type !== activeType) return false;
      if (pf.min > 0 || pf.max < Infinity) {
        if (s.priceMin > pf.max || s.priceMax < pf.min) return false;
      }
      if (rf.min > 0 && s.rating < rf.min) return false;
      return true;
    });

    switch (sortBy) {
      case "rating": results.sort((a, b) => b.rating - a.rating); break;
      case "price-low": results.sort((a, b) => a.priceMin - b.priceMin); break;
      case "price-high": results.sort((a, b) => b.priceMax - a.priceMax); break;
      case "reviews": results.sort((a, b) => b.reviews - a.reviews); break;
    }
    return results;
  }, [activeService, activeType, activePriceIdx, activeRatingIdx, sortBy, allPhotographers]);

  const activeFilterCount = [
    activeService !== "All",
    activeType !== "All",
    activePriceIdx !== 0,
    activeRatingIdx !== 0,
  ].filter(Boolean).length;

  const clearAll = () => {
    setActiveService("All");
    setActiveType("All");
    setActivePriceIdx(0);
    setActiveRatingIdx(0);
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

      {/* Search + filters header — compact */}
      <section className="pt-20 sm:pt-24 pb-4 px-4 sm:px-6 border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">Explore photographers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse studios in Bulan, Sorsogon
              {urlDate && <> · <span className="text-foreground font-medium">{urlDate}</span></>}
              {urlTime && <> at <span className="text-foreground font-medium">{urlTime}</span></>}
              {urlLocation && <> · <span className="text-foreground font-medium">{urlLocation}</span></>}
            </p>
          </div>

          <div className="w-full flex flex-wrap items-center justify-center gap-2">
            <SearchBar
              variant="compact"
              initialService={rawService !== "All" ? rawService : ""}
              initialDate={urlDate}
              initialLocation={urlLocation}
            />
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
                  (showFilters || activeFilterCount > 0) && "text-foreground border-primary/50"
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

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 px-3 rounded-full border border-border bg-transparent text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer text-sm"
              >
                <option value="rating">Top Rated</option>
                <option value="reviews">Most Reviews</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
              </select>

              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-primary hover:underline text-sm">
                  Reset
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="w-full max-w-4xl mx-auto text-left bg-background border border-border rounded-2xl p-4 grid gap-4 sm:grid-cols-2 animate-fade-in">
              <ChipRow label="Service" options={serviceFilters} active={activeService} onSelect={setActiveService} />
              <ChipRow label="Provider Type" options={typeFilters} active={activeType} onSelect={setActiveType} />
              <ChipRow
                label="Price Range"
                options={priceFilters.map((_, i) => String(i))}
                active={String(activePriceIdx)}
                onSelect={(v) => setActivePriceIdx(Number(v))}
                labelOf={(v) => priceFilters[Number(v)].label}
              />
              <ChipRow
                label="Rating"
                options={ratingFilters.map((_, i) => String(i))}
                active={String(activeRatingIdx)}
                onSelect={(v) => setActiveRatingIdx(Number(v))}
                labelOf={(v) =>
                  ratingFilters[Number(v)].label === "Any Rating"
                    ? ratingFilters[Number(v)].label
                    : `★ ${ratingFilters[Number(v)].label}`
                }
              />
            </div>
          )}
        </div>
      </section>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6">
        {/* Results heading */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold">
              {activeService !== "All" ? activeService : "All"}{" "}
              {activeType !== "All" ? activeType + "s" : "Photographers & Studios"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {loading ? "Searching…" : `Showing ${filtered.length} of ${allPhotographers.length} results in Bulan, Sorsogon`}
            </p>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {activeService !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {activeService}
                <button onClick={() => setActiveService("All")} aria-label="Remove service filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeType !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {activeType}
                <button onClick={() => setActiveType("All")} aria-label="Remove type filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activePriceIdx !== 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {priceFilters[activePriceIdx].label}
                <button onClick={() => setActivePriceIdx(0)} aria-label="Remove price filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeRatingIdx !== 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                ★ {ratingFilters[activeRatingIdx].label}
                <button onClick={() => setActiveRatingIdx(0)} aria-label="Remove rating filter">
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
          <div className="text-center py-20">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search query</p>
            <Button variant="outline" onClick={clearAll}>Clear all filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={`/photographers/${s.id}`}
                className="group bg-card rounded-xl card-shadow border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200"
              >
                <div className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center relative">
                  <span className="text-4xl font-heading font-bold text-primary/20">{s.avatar}</span>
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-card/90 text-xs font-medium border border-border">
                    {s.type}
                  </span>
                  {s.rating >= 4.9 && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                      Top Rated
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-heading font-semibold text-sm">{s.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                      <span className="text-xs font-semibold">{s.rating}</span>
                      <span className="text-xs text-muted-foreground">({s.reviews})</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{s.specialty}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" />{s.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.services.slice(0, 3).map((svc) => (
                      <span key={svc} className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">{svc}</span>
                    ))}
                    {s.services.length > 3 && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">+{s.services.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
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
