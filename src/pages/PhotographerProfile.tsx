import { useState, useEffect } from "react";
import { 
  Star, MapPin, Camera, Check, ArrowLeft, Image, MessageCircle, 
  Calendar, Facebook, Instagram, Globe, Tag, Heart, AlertTriangle, X, Settings2, Paperclip, Sparkles
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fetchPhotographer } from "@/services/photographerService";
import { formatPrice, defaultSocials, type Photographer } from "@/data/photographers";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function PhotographerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photographer, setPhotographer] = useState<Photographer | null | undefined>(undefined);
  
  const { toggleFavorite, isFavorite } = useFavorites();
  
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

  const handleReportSubmit = () => {
    toast.error("Report Sent", { 
      description: `Your report regarding ${p.name} has been sent to the admin team.`
    });
    setShowReportModal(false);
    setReportReason("");
    setReportSeverity("");
    setReportAction("");
    setReportDetails("");
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon"
              className="active:scale-75 transition-all duration-200"
              onClick={() => {
                toggleFavorite(p.id);
                if (!isFav) {
                  toast.success(`${p.name} added to favorites!`);
                } else {
                  toast(`${p.name} removed from favorites.`);
                }
              }}
            >
              <Heart 
                className={`w-4 h-4 transition-transform duration-200 hover:scale-110 ${
                  isFav ? "fill-red-500 text-red-500" : ""
                }`} 
              />
            </Button>
            <Link to={`/booking/${p.id}`}>
              <Button size="sm" className="font-medium">Book Now</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-fade-up">
        {/* Profile header */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/5" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 border-4 border-card flex items-center justify-center text-primary font-heading text-2xl font-bold">
                {p.avatar}
              </div>
              <div className="flex-1 sm:pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-heading font-bold">{p.name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">{p.type}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>
                  <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {p.specialty}</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-accent text-accent" /> {p.rating} ({p.reviews} reviews)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.services.map((svc) => (
                    <span key={svc} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{svc}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Starting at</p>
                <p className="text-2xl font-heading font-bold text-primary">{formatPrice(p.priceMin)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Specializations + Socials strip */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Specializes in
            </span>
            {p.services.map((svc) => (
              <span key={svc} className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium border border-secondary/20">
                {svc}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Connect:</span>
            {[
              { url: p.socials?.facebook ?? defaultSocials.facebook, Icon: Facebook, label: "Facebook" },
              { url: p.socials?.instagram ?? defaultSocials.instagram, Icon: Instagram, label: "Instagram" },
              { url: p.socials?.website ?? defaultSocials.website, Icon: Globe, label: "Website" },
            ].map(({ url, Icon, label }) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" title={label}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 p-6">
          <h2 className="font-heading font-semibold mb-3">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.about}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(["portfolio", "packages", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize flex items-center justify-center gap-2",
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "portfolio" && <Image className="w-4 h-4" />}
              {tab === "packages" && <Calendar className="w-4 h-4" />}
              {tab === "reviews" && <MessageCircle className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {activeTab === "portfolio" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {Array.from({ length: 12 }).map((_, i) => {
              const color = p.portfolio[i % p.portfolio.length] || "from-muted to-muted";
              return (
                <div
                  key={i}
                  className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}
                >
                  <Camera className="w-8 h-8 text-muted-foreground/30" />
                </div>
              );
            })}
          </div>
        )}

        {/* Packages tab - REDESIGNED */}
        {activeTab === "packages" && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Fixed Packages Section */}
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Fixed Packages
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Pre-built services tailored for common event needs.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {p.packages.map((pkg, i) => (
                  <div
                    key={pkg.name}
                    className={cn(
                      "relative bg-card rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1",
                      i === 1 
                        ? "border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-card to-primary/5" 
                        : "border-border/50 card-shadow hover:shadow-lg"
                    )}
                  >
                    {i === 1 && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}
                    
                    <div className="text-center mb-6">
                      <h4 className="font-heading font-semibold text-lg">{pkg.name}</h4>
                      <div className="mt-3 flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-heading font-bold">{formatPrice(pkg.price)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
                    </div>

                    <div className="space-y-3 flex-grow">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Includes</p>
                      {pkg.inclusions.map((inc) => (
                        <div key={inc} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 
                          <span className="text-muted-foreground leading-tight">{inc}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-4 border-t border-border/50">
                      <Link to={`/booking/${p.id}?package=${i}`} className="block">
                        <Button className="w-full" variant={i === 1 ? "default" : "outline"} size="lg">
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
                  <Sparkles className="w-5 h-5 text-primary" /> Build Your Own
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
                  <Link to={`/booking/${p.id}?custom=true`} className="block">
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
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-accent text-accent" />
                <span className="text-2xl font-heading font-bold">{p.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">{p.reviews} total reviews</span>
            </div>
            {(showAllReviews ? p.reviewList : p.reviewList.slice(0, 5)).map((review) => (
              <div key={review.id} className="bg-card rounded-xl card-shadow border border-border/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading text-sm font-bold">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    {Array.from({ length: review.rating }, (_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </div>
            ))}
            {p.reviewList.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" onClick={() => setShowAllReviews((v) => !v)}>
                  {showAllReviews ? "Show less" : `See more reviews (${p.reviewList.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold">Ready to book {p.name}?</h3>
            <p className="text-sm text-muted-foreground mt-1">Choose a fixed package or build a custom package, then pick your preferred date.</p>
          </div>
          <Link to={`/booking/${p.id}`}>
            <Button size="lg" className="font-medium w-full sm:w-auto">Book Now</Button>
          </Link>
        </div>

        {/* --- DISCREET REPORT LINK FOR PROFILE --- */}
        <div className="text-center pt-4 pb-12">
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