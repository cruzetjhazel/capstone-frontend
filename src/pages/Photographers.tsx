import { useState } from "react";
import { Star, Search, SlidersHorizontal, Heart, MapPin, Calendar, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavorites, useAddFavorite, useRemoveFavorite } from "@/hooks/useFavorites";
import { usePhotographers } from "@/hooks/usePhotographers";
import { formatPrice } from "@/data/photographers";

// Aligned with SRS 1.2, 3.2, 5.1, 7.1: Professional Types, Bulan Location, and Profile Data
const typeFilters = ["All", "Freelancer", "Studio"];
const serviceFilters = ["Weddings", "Portraits", "Events", "Product", "Graduation"];

export default function Photographers() {
  const { data: favoritePhotographers = [] } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isFavorite = (id: string) => favoritePhotographers.some((f) => f.photographerId === id);
  const [activeType, setActiveType] = useState("All");
  const [activeService, setActiveService] = useState("");
  const { data: photographers = [], isLoading } = usePhotographers();

  const filteredPhotographers = photographers.filter((p) =>
    (activeType === "All" || p.type === activeType) &&
    (activeService === "" ||
      p.specialty.toLowerCase().includes(activeService.toLowerCase()) ||
      p.services.some((svc) => svc.toLowerCase().includes(activeService.toLowerCase())))
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-heading font-bold">Discover Professionals</h1>
          <p className="text-muted-foreground">Find and book the perfect photography service in Bulan, Sorsogon.</p>
        </div>

        {/* SRS 7.2: Search Inputs (What, When, Where) */}
        <div className="bg-card p-4 rounded-2xl card-shadow border border-border/50 grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="relative">
             <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input placeholder="What (e.g. Wedding, Portrait)..." className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background" />
           </div>
           <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input type="date" placeholder="When (Event Date)..." className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background" />
           </div>
           <div className="relative flex gap-2">
             <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Where (Bulan Location)..." defaultValue="Bulan, Sorsogon" className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background" />
             </div>
             <Button variant="default" className="px-6 shrink-0"><Search className="w-4 h-4 mr-2"/> Search</Button>
           </div>
        </div>

        {/* SRS 7.3: Explore Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 bg-muted/50 p-1 rounded-full border border-border/50 w-fit">
            {typeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveType(f)}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeType === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <span className="text-sm font-medium text-muted-foreground mr-2 whitespace-nowrap">Services:</span>
            {serviceFilters.map((s) => (
              <button
                key={s}
                onClick={() => setActiveService(activeService === s ? "" : s)}
                className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-colors whitespace-nowrap ${
                  activeService === s
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-card text-muted-foreground hover:bg-muted/80 border-border/50"
                }`}
              >
                {s}
              </button>
            ))}
            <Button variant="outline" size="sm" className="ml-2 gap-2 text-xs rounded-full"><SlidersHorizontal className="w-3.5 h-3.5"/> More Filters</Button>
          </div>
        </div>

        {/* Grid (SRS 7.1) */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden card-shadow animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="flex items-center justify-between pt-4">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotographers.map((p) => {
            const isFav = isFavorite(p.id);
            return (
              <Link
                key={p.id}
                to={`/photographers/${p.id}`}
                className="group relative bg-card rounded-2xl card-shadow border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isFav) {
                      removeFavorite.mutate(p.id);
                      toast(`${p.name} removed from favorites.`);
                    } else {
                      addFavorite.mutate(p.id);
                      toast.success(`${p.name} added to favorites!`);
                    }
                  }}
                  className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-background/80 backdrop-blur-md hover:bg-background border border-border/50 active:scale-95 transition-all duration-200 group-hover:opacity-100 shadow-sm"
                >
                  <Heart 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isFav ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"
                    }`} 
                  />
                </button>

                <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                   <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-md border border-border/50 text-foreground">
                      {p.type}
                   </div>
                  <div className="w-20 h-20 rounded-full bg-background border-4 border-background flex items-center justify-center text-primary font-heading text-2xl font-bold group-hover:scale-105 transition-transform duration-300 shadow-sm overflow-hidden">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.avatar
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                     <h3 className="font-heading font-bold text-lg">{p.name}</h3>
                     <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded text-accent">
                      <Star className="w-3.5 h-3.5 fill-accent" />
                      <span className="text-sm font-bold">{p.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{p.specialty}</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                     <MapPin className="w-3.5 h-3.5 shrink-0"/>
                     <span className="truncate">{p.location}</span>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                     <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-0.5">Starting At</span>
                        <span className="text-sm font-bold text-primary">{formatPrice(p.priceMin)}–{formatPrice(p.priceMax)}</span>
                     </div>
                     <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">View Profile</span>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {filteredPhotographers.length === 0 && (
             <div className="col-span-full py-12 text-center bg-card rounded-2xl border border-dashed border-border/60">
                <p className="text-muted-foreground">No professionals match your current filters.</p>
                <Button variant="link" onClick={() => { setActiveType("All"); setActiveService(""); }}>Clear Filters</Button>
             </div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
