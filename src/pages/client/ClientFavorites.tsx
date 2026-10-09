import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  useFavorites,
  useRemoveFavorite,
  useFavoritePackages,
  useRemoveFavoritePackage,
} from "@/hooks/useFavorites";
import toast from "react-hot-toast";
import { Heart, Camera, MapPin, Compass, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);

const formatDuration = (minutes: number | null) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h} hr${h > 1 ? "s" : ""}` : `${m} min`;
};

type Tab = "photographers" | "packages";

export default function Favorites() {
  const [tab, setTab] = useState<Tab>("photographers");

  const { data: favoritePhotographers = [], isLoading: loadingPhotographers } = useFavorites();
  const { data: favoritePackages = [], isLoading: loadingPackages } = useFavoritePackages();
  const removeFavorite = useRemoveFavorite();
  const removePackageFavorite = useRemoveFavoritePackage();

  const [studioToRemove, setStudioToRemove] = useState<string | null>(null);
  const [packageToRemove, setPackageToRemove] = useState<string | null>(null);

  const confirmRemoval = () => {
    if (!studioToRemove) return;
    const id = studioToRemove;
    setStudioToRemove(null);
    removeFavorite.mutate(id, {
      onSuccess: () => toast.success("Removed from your favorites."),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't remove favorite. Please try again."),
    });
  };

  const confirmPackageRemoval = () => {
    if (!packageToRemove) return;
    const id = packageToRemove;
    setPackageToRemove(null);
    removePackageFavorite.mutate(id, {
      onSuccess: () => toast.success("Package removed from your favorites."),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't remove package. Please try again."),
    });
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "photographers", label: "Photographers", count: favoritePhotographers.length },
    { key: "packages", label: "Packages", count: favoritePackages.length },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Favorites</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your saved photographers and fixed packages in Bulan.
            </p>
          </div>
          <Link to="/explore">
            <Button size="sm" className="gap-1.5 text-xs">
              <Compass className="w-3.5 h-3.5" /> Explore Studios
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="text-xs rounded-full bg-muted px-2 py-0.5">{t.count}</span>
            </button>
          ))}
        </div>

        {/* ---------- Photographers tab ---------- */}
        {tab === "photographers" &&
          (loadingPhotographers ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Loading your saved favorites…</p>
            </div>
          ) : favoritePhotographers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
              <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-base">No favorite photographers yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Browse local talent, compare portfolios, and hit the heart icon to save them here.
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
                  <div className="h-28 relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5">
                    {p.coverPhotoUrl && <img src={p.coverPhotoUrl} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                    <div className="absolute inset-0 p-4 flex justify-between items-start">
                      <div className="w-12 h-12 rounded-xl bg-background/95 border border-border/50 flex items-center justify-center text-primary font-heading font-bold shadow-sm overflow-hidden">
                        {p.profilePhotoUrl ? (
                          <img src={p.profilePhotoUrl} alt={p.businessName || "Studio"} className="w-full h-full object-cover" />
                        ) : (
                          p.businessName?.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <button
                        onClick={() => setStudioToRemove(p.photographerId)}
                        className="w-8 h-8 rounded-full bg-background/90 text-primary hover:bg-destructive hover:text-white flex items-center justify-center transition-all shadow-sm"
                        title="Remove Favorite"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-heading font-bold text-base group-hover:text-primary transition-colors">
                        {p.businessName || "Studio"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{p.style || "Photography"}</span>
                      </p>
                    </div>

                    <div className="border-y border-border/40 py-2.5 text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          p.isAvailable ? "text-emerald-600" : "text-muted-foreground"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", p.isAvailable ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                        {p.isAvailable ? "Accepting bookings" : "Not accepting bookings right now"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link to={`/photographers/${p.photographerId}`} className="w-full">
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
          ))}

        {/* ---------- Packages tab ---------- */}
        {tab === "packages" &&
          (loadingPackages ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Loading your saved packages…</p>
            </div>
          ) : favoritePackages.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
              <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-base">No favorite packages yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Open a photographer's Packages tab and tap the heart on a fixed package to save it here.
              </p>
              <Link to="/explore">
                <Button size="sm">Explore Now</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {favoritePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-card rounded-2xl border border-border/50 card-shadow p-5 flex flex-col hover:card-shadow-hover transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-primary text-xs font-heading font-bold overflow-hidden shrink-0">
                        {pkg.profilePhotoUrl ? (
                          <img src={pkg.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          pkg.photographerName?.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{pkg.photographerName || "Studio"}</p>
                    </div>
                    <button
                      onClick={() => setPackageToRemove(pkg.packageId)}
                      className="w-8 h-8 rounded-full bg-background text-primary border border-border/50 hover:bg-destructive hover:text-white flex items-center justify-center transition-all shrink-0"
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <h3 className="font-heading font-bold text-base mt-4">{pkg.name}</h3>
                  <p className="text-2xl font-heading font-bold text-primary mt-1">{formatPrice(pkg.price)}</p>
                  {formatDuration(pkg.durationMinutes) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(pkg.durationMinutes)}
                    </p>
                  )}
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{pkg.description}</p>
                  )}

                  {pkg.includedItems.length > 0 && (
                    <ul className="mt-3 space-y-1.5 flex-grow">
                      {pkg.includedItems.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="leading-tight">{item}</span>
                        </li>
                      ))}
                      {pkg.includedItems.length > 3 && (
                        <li className="text-xs text-muted-foreground/70 pl-5">+{pkg.includedItems.length - 3} more</li>
                      )}
                    </ul>
                  )}

                  {!pkg.isAvailable && (
                    <p className="mt-3 text-xs text-amber-600">This package is no longer offered.</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-border/40">
                    <Link to={`/photographers/${pkg.photographerId}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-9">
                        View Package &amp; Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {/* Photographer removal modal */}
        {studioToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2">Remove from Favorites?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to remove this studio from your favorites? You can always add them back later from the Explore page.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setStudioToRemove(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={confirmRemoval}>Remove</Button>
              </div>
            </div>
          </div>
        )}

        {/* Package removal modal */}
        {packageToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2">Remove Package?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Remove this package from your favorites? You can save it again from the photographer's profile.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setPackageToRemove(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={confirmPackageRemoval}>Remove</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}