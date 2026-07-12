import { useState, useEffect } from "react";
import { Star, MapPin, Camera, Check, ArrowLeft, Image, MessageCircle, Calendar, Facebook, Instagram, Globe, Tag } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchPhotographer } from "@/services/photographerService";
import { formatPrice, defaultSocials, type Photographer } from "@/data/photographers";

export default function PhotographerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photographer, setPhotographer] = useState<Photographer | null | undefined>(undefined);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <Link to={`/booking/${p.id}`}>
            <Button size="sm" className="font-medium">Book Now</Button>
          </Link>
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

        {/* Specializations + Socials strip (under cover card) */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {p.portfolio.map((color, i) => (
              <div
                key={i}
                className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}
              >
                <Camera className="w-8 h-8 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        )}

        {/* Packages tab */}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {p.packages.map((pkg, i) => (
              <div
                key={pkg.name}
                className={cn(
                  "relative bg-card rounded-xl border p-6 transition-all duration-200 hover:card-shadow-hover",
                  i === 1 ? "border-primary ring-1 ring-primary/20" : "border-border/50 card-shadow"
                )}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Popular
                  </span>
                )}
                <h3 className="font-heading font-semibold text-lg">{pkg.name}</h3>
                <p className="text-3xl font-heading font-bold mt-2">{formatPrice(pkg.price)}</p>
                <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                <ul className="mt-4 space-y-2">
                  {pkg.inclusions.map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {inc}
                    </li>
                  ))}
                </ul>
                <Link to={`/booking/${p.id}?package=${i}`}>
                  <Button className="w-full mt-5" variant={i === 1 ? "default" : "outline"}>
                    Select & Book
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
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
        <div className="bg-card rounded-xl card-shadow border border-border/50 p-6 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold">Ready to book {p.name}?</h3>
            <p className="text-sm text-muted-foreground mt-1">Choose a package and pick your preferred date and time</p>
          </div>
          <Link to={`/booking/${p.id}`}>
            <Button size="lg" className="font-medium">Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
