import { useState } from "react";
import { Star, Search, SlidersHorizontal, Heart, MapPin, Calendar, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/contexts/FavoritesContext";

// Aligned with SRS 1.2, 3.2, 5.1, 7.1: Professional Types, Bulan Location, and Profile Data
const photographers = [
  { id: "1", name: "Marcus Rivera", type: "Studio", specialty: "Weddings & Prenup", rating: 4.9, reviews: 134, price: "₱10,000–₱25,000", location: "Bulan, Sorsogon", avatar: "MR", style: "Cinematic" },
  { id: "2", name: "Anya Petrova", type: "Freelancer", specialty: "Portraits & Lifestyle", rating: 4.8, reviews: 97, price: "₱3,000–₱8,000", location: "Bulan, Sorsogon", avatar: "AP", style: "Light & Airy" },
  { id: "3", name: "Leo Chang", type: "Studio", specialty: "Corporate & Events", rating: 4.7, reviews: 82, price: "₱8,000–₱15,000", location: "Nearby Municipalities", avatar: "LC", style: "Classic" },
  { id: "4", name: "Sofia Mendez", type: "Freelancer", specialty: "Events Coverage", rating: 4.9, reviews: 156, price: "₱5,000–₱12,000", location: "Bulan, Sorsogon", avatar: "SM", style: "Documentary" },
  { id: "5", name: "James Okafor", type: "Studio", specialty: "Product & Studio", rating: 4.6, reviews: 63, price: "₱4,000–₱10,000", location: "Anywhere in Sorsogon", avatar: "JO", style: "Editorial" },
  { id: "6", name: "Isla Nakamura", type: "Freelancer", specialty: "Birthday & Graduation", rating: 4.8, reviews: 111, price: "₱2,500–₱6,000", location: "Bulan, Sorsogon", avatar: "IN", style: "Vibrant" },
];

const typeFilters = ["All", "Freelancer", "Studio"];
const serviceFilters = ["Weddings", "Portraits", "Events", "Product", "Graduation"];

export default function Photographers() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [activeType, setActiveType] = useState("All");
  const [activeService, setActiveService] = useState("");

  const filteredPhotographers = photographers.filter(p => 
    (activeType === "All" || p.type === activeType) &&
    (activeService === "" || p.specialty.includes(activeService))
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
                    toggleFavorite(p.id);
                    if (!isFav) {
                      toast.success(`${p.name} added to favorites!`);
                    } else {
                      toast(`${p.name} removed from favorites.`);
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
                  <div className="w-20 h-20 rounded-full bg-background border-4 border-background flex items-center justify-center text-primary font-heading text-2xl font-bold group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    {p.avatar}
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
                  <p className="text-sm text-muted-foreground mb-3">{p.specialty} · {p.style}</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                     <MapPin className="w-3.5 h-3.5 shrink-0"/>
                     <span className="truncate">{p.location}</span>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                     <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-0.5">Starting At</span>
                        <span className="text-sm font-bold text-primary">{p.price}</span>
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
      </div>
    </DashboardLayout>
  );
}