import { Star, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const photographers = [
  { id: "1", name: "Marcus Rivera", specialty: "Weddings", rating: 4.9, reviews: 134, price: "$200–$500", location: "Los Angeles, CA", avatar: "MR" },
  { id: "2", name: "Anya Petrova", specialty: "Portraits", rating: 4.8, reviews: 97, price: "$150–$350", location: "New York, NY", avatar: "AP" },
  { id: "3", name: "Leo Chang", specialty: "Corporate", rating: 4.7, reviews: 82, price: "$300–$600", location: "Chicago, IL", avatar: "LC" },
  { id: "4", name: "Sofia Mendez", specialty: "Events", rating: 4.9, reviews: 156, price: "$250–$450", location: "Miami, FL", avatar: "SM" },
  { id: "5", name: "James Okafor", specialty: "Product", rating: 4.6, reviews: 63, price: "$180–$400", location: "Austin, TX", avatar: "JO" },
  { id: "6", name: "Isla Nakamura", specialty: "Lifestyle", rating: 4.8, reviews: 111, price: "$200–$380", location: "Seattle, WA", avatar: "IN" },
];

const filters = ["All", "Weddings", "Portraits", "Corporate", "Events", "Product", "Lifestyle"];

export default function Photographers() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Photographers</h1>
            <p className="text-muted-foreground mt-1">Find and book the perfect photographer</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search photographers…" className="pl-9 w-64" />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photographers.map((p) => (
            <Link
              key={p.id}
              to={`/photographers/${p.id}`}
              className="group bg-card rounded-xl card-shadow border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200"
            >
              {/* Placeholder cover */}
              <div className="h-36 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading text-xl font-bold group-hover:scale-105 transition-transform duration-200">
                  {p.avatar}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-heading font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.specialty} · {p.location}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="text-sm font-medium">{p.rating}</span>
                    <span className="text-xs text-muted-foreground">({p.reviews})</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{p.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
