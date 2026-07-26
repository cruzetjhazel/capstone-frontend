import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { usePhotographers } from "@/hooks/usePhotographers";
import { useToast } from "@/hooks/use-toast"; // <-- 1. Import the toast hook
import { Star, Heart, Camera, MapPin, Sparkles } from "lucide-react";

// Safe local formatter fallback
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function Favorites() {
  const { data: allPhotographers = [] } = usePhotographers();
  const { toast } = useToast(); // <-- 2. Initialize the hook
  
  // Use first 3 items from the photographer dataset to populate favorites list initially
  const [favoriteIds, setFavoriteIds] = useState<string[]>(
    allPhotographers.slice(0, 3).map((p) => String(p.id))
  );

  // Modal State
  const [studioToRemove, setStudioToRemove] = useState<string | null>(null);

  const favoritePhotographers = allPhotographers.filter((p) => favoriteIds.includes(String(p.id)));

  const removeFavorite = (id: string) => {
    setFavoriteIds((prev) => prev.filter((favId) => favId !== String(id)));
  };

  const confirmRemoval = () => {
    if (studioToRemove) {
      removeFavorite(studioToRemove);
      setStudioToRemove(null);
      
      // <-- 3. Trigger the toast notification
      toast({
        title: "Successfully unfavorited",
        description: "The studio has been removed from your favorites.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Favorite Studios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your curated list of preferred photographers and production teams in Bulan.
            </p>
          </div>
          <Link to="/explore">
            <Button size="sm" className="gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Explore Studios
            </Button>
          </Link>
        </div>

        {favoritePhotographers.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-base">No favorites saved yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Browse through local talent, compare portfolios, and hit the heart icon to save them here.
            </p>
            <Link to="/explore">
              <Button size="sm">Explore Now</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoritePhotographers.map((p) => (
              <div 
                key={p.id} 
                className="group bg-card rounded-2xl border border-border/50 card-shadow overflow-hidden hover:card-shadow-hover transition-all duration-200"
              >
                {/* Visual Cover Header */}
                <div className="h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 p-4 flex justify-between items-start relative">
                  <div className="w-12 h-12 rounded-xl bg-background/95 border border-border/50 flex items-center justify-center text-primary font-heading font-bold shadow-sm">
                    {p.avatar}
                  </div>
                  
                  <button 
                    onClick={() => setStudioToRemove(p.id)}
                    className="w-8 h-8 rounded-full bg-background/90 text-primary hover:bg-destructive hover:text-white flex items-center justify-center transition-all shadow-sm"
                    title="Remove Favorite"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Content Panel */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{p.location || "Bulan, Sorsogon"} &bull; {p.specialty}</span>
                    </p>
                  </div>

                  {/* Rating / Meta */}
                  <div className="flex items-center justify-between border-y border-border/40 py-2.5 text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                      <span className="font-semibold text-foreground">4.9</span>
                      <span className="text-muted-foreground">(42 reviews)</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Packages from </span>
                      <strong className="text-primary">{formatPrice(p.priceMin)}</strong>
                    </div>
                  </div>

                  {/* Interactive Triggers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link to={`/photographers/${p.id}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full text-xs h-9">
                        View Profile
                      </Button>
                    </Link>
                    <Link to={`/explore`} className="w-full">
                      <Button size="sm" className="w-full text-xs h-9 gap-1 shadow-sm">
                        <Camera className="w-3.5 h-3.5" /> Book Again
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Modal */}
        {studioToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2">Remove from Favorites?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to remove this studio from your favorites? You can always add them back later from the Explore page.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setStudioToRemove(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmRemoval}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}