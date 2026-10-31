import { useState, useEffect } from "react";
import { 
  Star, MapPin, Camera, Check, ArrowLeft, Image, MessageCircle, 
  Calendar, Facebook, Instagram, Globe, Tag, Heart, AlertTriangle, X, Settings2, Paperclip, Palette, Wrench, Phone, Mail, Search
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import { fetchPhotographer } from "@/services/photographerService";
import { formatPrice, inclusionText, type Photographer } from "@/data/photographers";
import { coverageLabel } from "@/data/coverage";
import {
  useFavorites, useAddFavorite, useRemoveFavorite,
  useFavoritePackages, useAddFavoritePackage, useRemoveFavoritePackage,
} from "@/hooks/useFavorites";
import { useRole } from "@/contexts/RoleContext";


// Shared style tokens so every section card and chip looks consistent.
const sectionCard = "bg-card/95 backdrop-blur-sm rounded-2xl border border-border/50 shadow-[0_1px_2px_hsl(0_0%_0%/0.04),0_12px_32px_-16px_hsl(var(--primary)/0.2)]";
const sectionLabel = "text-sm font-semibold text-muted-foreground flex items-center gap-2";
const chip = "px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium border border-secondary/20";

// Cover always fills the whole frame, edge to edge, with a soft fade-in once it loads.
function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        "absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500",
        loaded ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

// Determines which package (if any) should show the "Most Popular" badge.
// Prefers an explicit backend flag; falls back to a booking/selection count
// if one exists, and only when there's a single clear winner. Returns -1
// (no badge shown) rather than guessing — a package should never be labeled
// "Most Popular" just because it happens to be second in the list.
function getPopularPackageIndex(packages: any[] | undefined | null): number {
  if (!Array.isArray(packages) || packages.length === 0) return -1;

  const flaggedIndex = packages.findIndex((pkg) => pkg?.isPopular === true || pkg?.is_popular === true);
  if (flaggedIndex !== -1) return flaggedIndex;

  const scores = packages.map((pkg) =>
    pkg?.bookingCount ?? pkg?.booking_count ?? pkg?.timesBooked ?? pkg?.times_booked
    ?? pkg?.selectionCount ?? pkg?.selection_count ?? 0
  );
  const maxScore = Math.max(0, ...scores);
  if (maxScore <= 0) return -1;
  const topIndices = scores.reduce<number[]>((acc, s, i) => (s === maxScore ? [...acc, i] : acc), []);
  return topIndices.length === 1 ? topIndices[0] : -1;
}

export default function PhotographerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photographer, setPhotographer] = useState<Photographer | null | undefined>(undefined);
  
  const { data: favoritePhotographers = [], isLoading: favoritesLoading } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isFavorite = (id: string) => favoritePhotographers.some((f) => f.photographerId === id);
  const { user, role } = useRole();

  const { data: favoritePackages = [] } = useFavoritePackages(!!user && role === "client");
  const addFavoritePackage = useAddFavoritePackage();
  const removeFavoritePackage = useRemoveFavoritePackage();
  const isPackageFavorite = (pkgId: number) => favoritePackages.some((f) => f.packageId === String(pkgId));
  const toggleFavoritePackage = (pkg: any) => {
    if (!user) {
      toast.error("Please log in or create an account to save packages.");
      return;
    }
    if (role !== "client") {
      toast.error("Only client accounts can save packages.");
      return;
    }
    const id = String(pkg.id);
    if (isPackageFavorite(pkg.id)) {
      removeFavoritePackage.mutate(id, { onSuccess: () => toast(`${pkg.name} removed from favorites.`) });
    } else {
      addFavoritePackage.mutate(id, { onSuccess: () => toast.success(`${pkg.name} added to favorites!`) });
    }
  };

  const handleBookClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error("Please log in as a client to book this photographer.");
      navigate("/login");
      return;
    }
    if (role === "studio") {
      e.preventDefault();
      toast.error("Photographer accounts can't make bookings — log in with a client account instead.");
      return;
    }
    if (role === "admin") {
      e.preventDefault();
      toast.error("Admin accounts can't make bookings.");
      return;
    }
  };
  
  // Profile Report State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSeverity, setReportSeverity] = useState("");
  const [reportAction, setReportAction] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
      async function load() {
          const data = await fetchPhotographer(id || "");
          setPhotographer(data);
      }
      load();
  }, [id]);

  const [activeTab, setActiveTab] = useState<"portfolio" | "packages" | "reviews">("portfolio");
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Fixed package search / filter state
  const [packageSearch, setPackageSearch] = useState("");
  const [packageSort, setPackageSort] = useState<"default" | "price-asc" | "price-desc">("default");


  // Review star filter (null = all)
  const [reviewStarFilter, setReviewStarFilter] = useState<number | null>(null);

  // Shows the photographer's name in the top bar once the main heading has scrolled away.
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolledPastHeader(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);



  if (photographer === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading font-bold text-xl mb-2">Photographer not found</h2>
          <Link to="/explore"><Button>Back to Explore</Button></Link>
        </div>
      </div>
    );
  }

  const p = photographer;
  const isFav = isFavorite(p.id);
  const popularPackageIndex = getPopularPackageIndex(p.packages);
  const socialLinks = [
    { url: p.socials?.facebook, Icon: Facebook, label: "Facebook" },
    { url: p.socials?.instagram, Icon: Instagram, label: "Instagram" },
    { url: p.socials?.website, Icon: Globe, label: "Website" },
  ].filter((s) => !!s.url) as { url: string; Icon: typeof Facebook; label: string }[];

  const handleReportSubmit = () => {
    toast.error(`Report sent — your report regarding ${p.name} has been sent to the admin team.`);
    setShowReportModal(false);
    setReportReason("");
    setReportSeverity("");
    setReportAction("");
    setReportDetails("");
  };

  // Filtered packages keep their ORIGINAL index so ?package=${i} and the "Most Popular" badge stay correct.
  const packageSearchTerm = packageSearch.trim().toLowerCase();

  const visiblePackages = (p.packages ?? [])
    .map((pkg, i) => ({ pkg, i }))
    .filter(({ pkg }) => {

      if (!packageSearchTerm) return true;
      const haystack = [
        pkg.name,
        pkg.description,
        ...(pkg.inclusions ?? []).map((inc: any) => (typeof inc === "string" ? inc : `${inc.name} ${inc.detail ?? ""}`)),
      ].join(" ").toLowerCase();
      return haystack.includes(packageSearchTerm);
    })
    .sort((a, b) =>
      packageSort === "price-asc" ? Number(a.pkg.price) - Number(b.pkg.price)
      : packageSort === "price-desc" ? Number(b.pkg.price) - Number(a.pkg.price)
      : 0
    );


  const allReviews = p.reviewList ?? [];
  const reviewCountsByStar = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
  }));
  const filteredReviews = reviewStarFilter == null ? allReviews : allReviews.filter((r) => r.rating === reviewStarFilter);

  const tabCounts: Record<"portfolio" | "packages" | "reviews", number | null> = {
    portfolio: p.portfolio?.length ?? 0,
    packages: p.packages?.length ?? 0,
    reviews: p.reviews ?? 0,
  };

  return (
    <div className="min-h-screen bg-background relative">

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <p
            className={cn(
              "font-heading font-semibold text-sm truncate transition-all duration-300",
              scrolledPastHeader ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
            )}
            aria-hidden={!scrolledPastHeader}
          >
            {p.name}
          </p>
          
          <div className="flex items-center gap-3 shrink-0">
            <Button 
              variant="outline" 
              size="icon"
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              className="active:scale-75 transition-all duration-200"
              disabled={favoritesLoading || addFavorite.isPending || removeFavorite.isPending}
              onClick={() => {
                if (!user) {
                  toast.error("Please log in or create an account to save favorites.");
                  return;
                }
                if (isFav) {
                  removeFavorite.mutate(p.id);
                  toast(`${p.name} removed from favorites.`);
                } else {
                  addFavorite.mutate(p.id);
                  toast.success(`${p.name} added to favorites!`);
                }
              }}
            >
              <Heart 
                className={`w-4 h-4 transition-transform duration-200 hover:scale-110 ${
                  isFav ? "fill-red-500 text-red-500" : ""
                }`} 
              />
            </Button>
            <Link to={`/booking/${p.id}`} onClick={handleBookClick}>
              <Button size="sm" className="font-medium">Book Now</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 animate-fade-up">
        {/* Profile header */}
        <div className={cn(sectionCard, "overflow-hidden")}>
          <div className="relative overflow-hidden aspect-[5/2] sm:aspect-[4/1] bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/25">
            {p.coverUrl ? (
              <CoverImage src={p.coverUrl} alt={`${p.name} cover`} />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(hsl(var(--primary) / 0.25) 1.5px, transparent 1.5px)",
                  backgroundSize: "24px 24px",
                }}
              />
            )}
            {/* Soft scrim so the avatar blends in without dulling the photo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/15 to-transparent" />
          </div>

          <div className="relative z-10 px-5 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
              {/* Avatar overlaps the cover, like a social profile */}
              <div className="-mt-14 sm:-mt-16 w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl bg-card ring-4 ring-card shadow-lg flex items-center justify-center text-primary font-heading text-3xl font-bold overflow-hidden">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-primary/10 flex items-center justify-center">{p.avatar}</span>
                )}
              </div>

              <div className="flex-1 min-w-0 sm:pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight leading-tight">{p.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/15 text-xs font-semibold text-primary">{p.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {p.location}</span>
                  <span className="flex items-center gap-1.5"><Camera className="w-4 h-4" /> {p.specialty}</span>
                  {p.coverageArea && coverageLabel(p.coverageArea) && (
                    <span className="flex items-center gap-1.5" title="Areas covered">
                      <Globe className="w-4 h-4" /> Covers: {coverageLabel(p.coverageArea)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="text-foreground font-medium">
                      {p.reviews > 0 ? p.rating : ""}
                    </span>
                    {p.reviews > 0 ? `(${p.reviews} reviews)` : "No reviews yet"}
                  </span>
                </div>
              </div>

              <div className="sm:text-right shrink-0 sm:pb-1 flex sm:block items-baseline gap-2 sm:gap-0 rounded-xl sm:rounded-none bg-muted/50 sm:bg-transparent px-4 py-2.5 sm:p-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Starting at</p>
                <p className="text-2xl sm:text-3xl font-heading font-bold text-primary leading-tight">{formatPrice(p.priceMin)}</p>
              </div>
            </div>

            {(p.phone || p.email || socialLinks.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-border/60 text-sm">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-background/70 hover:bg-muted text-foreground transition-colors">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {p.phone}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-background/70 hover:bg-muted text-foreground transition-colors min-w-0">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> <span className="truncate">{p.email}</span>
                  </a>
                )}
                {socialLinks.map(({ url, Icon, label }) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer" title={label}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-background/70 hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Specializations strip */}
        <Reveal>
        <div className={cn(sectionCard, "px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-3")}>
          <span className={sectionLabel}>
            <Tag className="w-4 h-4" /> Specializes in
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {p.services.map((svc) => (
              <span key={svc} className={chip}>
                {svc}
              </span>
            ))}
          </div>
        </div>
        </Reveal>

        {/* Experience & Shooting Types */}
        {(p.yearsActive != null || coverageLabel(p.coverageArea) || (p.shootingTypes && p.shootingTypes.length > 0)) && (
          <Reveal>
          <div className={cn(sectionCard, "px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5")}>
            {p.yearsActive != null && (
              <div>
                <span className={sectionLabel}>
                  <Calendar className="w-4 h-4" /> Experience
                </span>
                <p className="mt-2 text-lg font-heading font-semibold">
                  {p.yearsActive} {p.yearsActive === 1 ? "year" : "years"}
                </p>
              </div>
            )}
            {p.coverageArea && coverageLabel(p.coverageArea) && (
              <div>
                <span className={sectionLabel}>
                  <Globe className="w-4 h-4" /> Areas Covered
                </span>
                <p className="mt-2 text-lg font-heading font-semibold">{coverageLabel(p.coverageArea)}</p>
              </div>
            )}
            {p.shootingTypes && p.shootingTypes.length > 0 && (
              <div>
                <span className={sectionLabel}>
                  <Camera className="w-4 h-4" /> Shooting Types Supported
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {p.shootingTypes.map((t) => (
                    <span key={t} className={chip}>
                      {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          </Reveal>
        )}

        {/* About */}
        <Reveal>
        <div className={cn(sectionCard, "p-6")}>
          <h2 className="font-heading font-semibold text-lg mb-3">About</h2>
          <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed max-w-3xl whitespace-pre-line">{p.about}</p>
        </div>
        </Reveal>

        {/* Photography Style */}
        {p.styles && p.styles.length > 0 && (
          <Reveal>
          <div className={cn(sectionCard, "p-6")}>
            <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Photography Style
            </h2>
            <div className="flex flex-wrap gap-2">
              {p.styles.map((style) => (
                <span key={style} className={chip}>
                  {style}
                </span>
              ))}
            </div>
          </div>
          </Reveal>
        )}

        {/* Tabs (sticks below the top bar while scrolling) */}
        <div className="sticky top-16 z-30 -mx-2 px-2 py-2 bg-background/90 backdrop-blur-md">
          <div className="flex gap-1 rounded-full border border-border/50 bg-muted/50 p-1" role="tablist">
            {(["portfolio", "packages", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-3 sm:px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 capitalize flex items-center justify-center gap-2",
                  activeTab === tab ? "bg-card text-primary shadow-sm" : "text-primary/60 hover:text-primary"
                )}
              >
                {tab === "portfolio" && <Image className="w-4 h-4" />}
                {tab === "packages" && <Calendar className="w-4 h-4" />}
                {tab === "reviews" && <MessageCircle className="w-4 h-4" />}
                {tab}
                {tabCounts[tab] ? (
                  <span className={cn(
                    "hidden sm:inline-block text-[11px] leading-none px-1.5 py-1 rounded-full",
                    activeTab === tab ? "bg-primary/10 text-primary" : "bg-background/70 text-muted-foreground"
                  )}>
                    {tabCounts[tab]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio tab */}
        {activeTab === "portfolio" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
            {p.portfolio.length > 0 ? (
              p.portfolio.map((url, i) => (
                <Reveal key={i} delay={(i % 4) * 70}>
                  <div className="group aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`Portfolio ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </Reveal>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                No portfolio photos yet.
              </div>
            )}
          </div>
        )}

        {/* Packages tab */}
        {activeTab === "packages" && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Quick entry to the custom calculator, so it's easy to find however many fixed packages there are */}
            <div className="-mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-sm">Don't see the right fit?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Build a custom package with your own coverage, photo count, and add-ons.
                  </p>
                </div>
              </div>
              <Link to={`/booking/${p.id}?custom=true`} onClick={handleBookClick} className="shrink-0">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">Build Your Own</Button>
              </Link>
            </div>

            {/* Fixed Packages Section */}
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Fixed Packages
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Pre-built services tailored for common event needs.</p>
              </div>
              
              {(p.packages ?? []).length > 0 && (
                <div className={cn(sectionCard, "p-3 mb-6 flex flex-col md:flex-row md:items-center gap-3")}>
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      placeholder="Search packages or inclusions..."
                      aria-label="Search packages"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/25 focus-visible:ring-offset-0 transition-shadow"
                    />
                  </div>

                  <select
                    value={packageSort}
                    onChange={(e) => setPackageSort(e.target.value as typeof packageSort)}
                    aria-label="Sort packages"
                    className="flex h-10 w-full md:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/25 focus-visible:ring-offset-0 transition-shadow"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="price-asc">Price: Low to high</option>
                    <option value="price-desc">Price: High to low</option>
                  </select>

                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-3">
                {(p.packages ?? []).length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    No fixed packages set up yet.
                  </div>
                ) : visiblePackages.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    No packages match your search. Try a different keyword.
                  </div>
                ) : visiblePackages.map(({ pkg, i }) => (
                  <div
                    key={pkg.name}
                    className={cn(
                      "relative bg-card rounded-2xl border p-5 flex flex-col transition-all duration-300 hover:-translate-y-0.5",
                      i === popularPackageIndex
                        ? "border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-card to-primary/5" 
                        : "border-border/50 card-shadow hover:shadow-lg"
                    )}
                  >
                    {i === popularPackageIndex && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}
                    
                    <div className="text-center mb-6">
                      <button
                        type="button"
                        aria-label={isPackageFavorite((pkg as any).id) ? "Remove package from favorites" : "Save package to favorites"}
                        title={isPackageFavorite((pkg as any).id) ? "Remove from favorites" : "Save to favorites"}
                        disabled={addFavoritePackage.isPending || removeFavoritePackage.isPending}
                        onClick={() => toggleFavoritePackage(pkg)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 border border-border/50 flex items-center justify-center shadow-sm hover:scale-110 active:scale-90 transition-all"
                      >
                        <Heart className={`w-4 h-4 ${isPackageFavorite((pkg as any).id) ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                      <h4 className="font-heading font-semibold text-base leading-snug px-7">{pkg.name}</h4>
                      <div className="mt-3 flex items-baseline justify-center gap-1">
                        <span className="text-xl font-heading font-bold">{formatPrice(pkg.price)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pkg.description}</p>
                    </div>

                    <div className="space-y-3 flex-grow border-t border-border/50 pt-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Includes</p>
                      {pkg.inclusions.map((inc, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-px" /> 
                          <span className="text-muted-foreground leading-snug">
                            {typeof inc === "string" ? inc : inc.name}
                            {typeof inc !== "string" && inc.detail && <span className="text-muted-foreground/70"> — {inc.detail}</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <Link to={`/booking/${p.id}?package=${i}`} className="block" onClick={handleBookClick}>
                        <Button className="w-full" variant={i === popularPackageIndex ? "default" : "outline"} size="default">
                          Select Package
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Package Calculator Section */}
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" /> Build Your Own
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Need something specific? Create a tailored package.</p>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/50 rounded-2xl border border-border card-shadow-hover p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex-1 space-y-4 relative z-10">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                      <Settings2 className="w-3.5 h-3.5" /> Dynamic Pricing
                    </span>
                    <h4 className="text-2xl font-heading font-bold">Custom Package Calculator</h4>
                    <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
                      Configure your own rates and options. Select base fees, adjust coverage hours, choose photo count tiers, and add optional extras to perfectly match your event.
                    </p>
                  </div>
                  
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {["Flexible coverage times", "Tiered photo counts", "Express delivery options", "Premium add-ons"].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full md:w-auto relative z-10 shrink-0">
                  <Link to={`/booking/${p.id}?custom=true`} className="block" onClick={handleBookClick}>
                    <Button size="lg" className="w-full md:w-auto px-8 shadow-md">
                      Open Calculator
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground mt-3">Instant transparent pricing</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <div className="space-y-4 animate-fade-in">
            <div className={cn(sectionCard, "flex items-center gap-4 px-6 py-4")}>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-accent text-accent" />
                <span className="text-2xl font-heading font-bold">{p.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">{p.reviews} total reviews</span>
            </div>
            {allReviews.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter reviews by rating">
                <button
                  onClick={() => { setReviewStarFilter(null); setShowAllReviews(false); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    reviewStarFilter == null
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  )}
                >
                  All ({allReviews.length})
                </button>
                {reviewCountsByStar.map(({ star, count }) => (
                  <button
                    key={star}
                    disabled={count === 0}
                    onClick={() => { setReviewStarFilter(reviewStarFilter === star ? null : star); setShowAllReviews(false); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed",
                      reviewStarFilter === star
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {star} <Star className={cn("w-3.5 h-3.5", reviewStarFilter === star ? "fill-current" : "fill-accent text-accent")} /> ({count})
                  </button>
                ))}
              </div>
            )}
            {reviewStarFilter != null && filteredReviews.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No {reviewStarFilter}-star reviews yet.</div>
            )}
            {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map((review) => (
              <Reveal key={review.id}>
              <div className={cn(sectionCard, "p-5 sm:p-6")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading text-sm font-bold shrink-0">
                    {review.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: review.rating }, (_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
                {review.reply && (
                  <div className="mt-4 rounded-lg bg-muted/50 border-l-2 border-primary/40 px-4 py-3">
                    <p className="text-xs font-semibold text-foreground">Photographer reply</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.reply}</p>
                  </div>
                )}
              </div>
              </Reveal>
            ))}
            {filteredReviews.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" onClick={() => setShowAllReviews((v) => !v)}>
                  {showAllReviews ? "Show less" : `See more reviews (${filteredReviews.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <Reveal>
        <div className={cn(sectionCard, "p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4")}>
          <div>
            <h3 className="font-heading font-semibold text-lg">Ready to book {p.name}?</h3>
            <p className="text-sm text-muted-foreground mt-1">Choose a fixed package or build a custom package, then pick your preferred date.</p>
          </div>
          <Link to={`/booking/${p.id}`} onClick={handleBookClick} className="shrink-0">
            <Button size="lg" className="font-medium w-full sm:w-auto">Book Now</Button>
          </Link>
        </div>
        </Reveal>

        {/* --- DISCREET REPORT LINK FOR PROFILE --- */}
        <div className="text-center pt-2 pb-12">
          <button 
            onClick={() => setShowReportModal(true)} 
            className="text-xs text-muted-foreground/70 hover:text-destructive flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Report this Professional
          </button>
        </div>
      </div>

      {/* --- REPORT PROFILE MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 my-8">
            <button 
              onClick={() => setShowReportModal(false)} 
              aria-label="Close"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-lg font-heading font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Report Professional
            </h3>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Reason for reporting *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="no-show">Didn’t appear (No-show)</option>
                  <option value="unresponsive">Unresponsive</option>
                  <option value="harassment">Harassment/Inappropriate Behavior</option>
                  <option value="scam">Suspected scam/fraud</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Severity *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reportSeverity}
                  onChange={(e) => setReportSeverity(e.target.value)}
                >
                  <option value="">Select severity...</option>
                  <option value="minor">Minor inconvenience</option>
                  <option value="payment">Payment problem</option>
                  <option value="tomorrow">Event is tomorrow</option>
                  <option value="emergency">Emergency/safety concern</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">How we can help *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reportAction}
                  onChange={(e) => setReportAction(e.target.value)}
                >
                  <option value="">Select an action...</option>
                  <option value="investigate">Investigate user</option>
                  <option value="refund">Refund request</option>
                  <option value="cancel">Cancel booking</option>
                  <option value="warn">Warn user</option>
                  <option value="remove-review">Remove review</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Additional Details *</label>
                <Textarea 
                  rows={3} 
                  placeholder="Please provide specific details to help us investigate..." 
                  value={reportDetails} 
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Evidence files (Optional)
                </label>
                <input 
                  type="file" 
                  multiple
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>

              <Button 
                variant="destructive" 
                className="w-full mt-4" 
                onClick={handleReportSubmit} 
                disabled={!reportReason || !reportSeverity || !reportAction || !reportDetails.trim()}
              >
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
