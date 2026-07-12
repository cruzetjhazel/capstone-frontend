import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Star, ChevronLeft, ChevronRight, ArrowRight,
  Search, Sparkles, Package, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarketingNavbar from "@/components/MarketingNavbar";
import SearchBar from "@/components/SearchBar";
import Logo from "@/components/Logo";
import FeaturedStudiosSection from "@/components/FeaturedStudiosSection";


/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const heroSlides = [
  {
    title: "Events &\nCelebrations",
    description: "Make every milestone unforgettable. From birthdays and graduations to weddings, our professional photographers capture every smile and memory. Tailored packages make your event photography effortless.",
    image: "/images/hero-events.jpg",
    tag: "Celebrate • Memories",
    cardLabel: "Events & Celebrations",
  },
  {
    title: "Wedding\nPhotography",
    description: "Timeless moments captured with artistry and emotion for your most special day. Tailored packages for every style.",
    image: "/images/hero-wedding.jpg",
    tag: "Love • Forever",
    cardLabel: "Wedding Photography",
  },
  {
    title: "Portrait\nSessions",
    description: "Professional headshots and creative portraits that tell your story. Studio and outdoor options available.",
    image: "/images/hero-portrait.jpg",
    tag: "You • Refined",
    cardLabel: "Portrait Sessions",
  },
  {
    title: "Couples\nPhotography",
    description: "Capture the magic between you and your partner. Romantic sessions in beautiful Bulan locations.",
    image: "/images/hero-couples.jpg",
    tag: "Together • Always",
    cardLabel: "Couples Photography",
  },
  {
    title: "Graduation\nShoots",
    description: "Celebrate your academic achievement with stunning graduation portraits you'll treasure forever.",
    image: "/images/hero-graduation.jpg",
    tag: "Achievement • Pride",
    cardLabel: "Graduation Shoots",
  },
];

const categories = [
  { name: "Events", image: "/images/hero-events.jpg" },
  { name: "Portrait", image: "/images/hero-portrait.jpg" },
  { name: "Studio", image: "/images/hero-portrait.jpg" },
  { name: "Couples", image: "/images/hero-couples.jpg" },
  { name: "Graduation", image: "/images/hero-graduation.jpg" },
  { name: "Wedding", image: "/images/hero-wedding.jpg" },
];

/* Navbar is shared via MarketingNavbar; SearchBar comes from components/SearchBar */

/* ------------------------------------------------------------------ */
/*  Hero Section — Matching reference image layout                     */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const [current, setCurrent] = useState(0);
  const total = heroSlides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const slide = heroSlides[current];

  return (
    <section className="relative min-h-[90vh]">
        {/* Clipped background layer */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center grayscale-[60%] scale-105 transition-all duration-700"
            style={{
              backgroundImage: `url(${slide.image})`,
            }}
          />

          {/* Cinematic gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(25,30%,6%)]/95 via-[hsl(25,30%,6%)]/70 to-transparent" />

          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent via-black/70 to-black pointer-events-none" />
        </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-12 min-h-[90vh] flex flex-col">
        {/* Location badge */}
        <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
          <MapPin className="w-4 h-4" />
          <div>
            <p className="font-heading font-semibold text-white">Bulan Sorsogon</p>
            <p className="text-xs text-white/50">Browse, compare, and book photographers of Bulan in one place</p>
          </div>
        </div>

        {/* Main hero row */}
        <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12 mt-6">
          {/* Left — Title & CTA */}
          <div className="flex-1 max-w-xl">
            <h1
              key={slide.title}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-heading font-bold text-white leading-[1.08] tracking-tight mb-5 whitespace-pre-line animate-fade-in"
            >
              {slide.title}
            </h1>
            <p
              key={slide.description}
              className="text-white/60 text-sm sm:text-base leading-relaxed mb-8 max-w-md animate-fade-in"
              style={{ animationDelay: "80ms" }}
            >
              {slide.description}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/explore">
                <Button size="lg" className="font-medium px-8 bg-primary text-primary-foreground rounded-lg">
                  Explore Studios
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="outline" size="lg" className="font-medium px-8 border-white/30 text-white hover:bg-white/10 rounded-lg bg-transparent">
                  View Events
                </Button>
              </Link>

            </div>
          </div>

          {/* Right — Cascading portrait cards, left-to-right like reference */}
          <div className="hidden lg:block w-[560px] relative h-[400px]">
            {heroSlides.map((s, i) => {
              const offset = (i - current + total) % total;
              const visible = offset < 3;
              // Left-anchored cascade: front card is a tall portrait, next two peek to the right
              const styles =
                offset === 0 ? "left-0 top-0 w-[260px] h-[400px] z-30 border-white/25 shadow-2xl opacity-100"
                : offset === 1 ? "left-[250px] top-[60px] w-[170px] h-[280px] z-20 border-white/20 shadow-xl opacity-95"
                : offset === 2 ? "left-[440px] top-[90px] w-[140px] h-[230px] z-10 border-white/15 shadow-lg opacity-80"
                : "left-[440px] top-[90px] w-[140px] h-[230px] z-0 opacity-0 pointer-events-none";
              return (
                <button
                  key={s.cardLabel}
                  onClick={() => setCurrent(i)}
                  aria-hidden={!visible}
                  className={cn(
                    "absolute rounded-2xl overflow-hidden transition-all duration-500 ease-out border cursor-pointer",
                    styles
                  )}
                >
                  <img src={s.image} alt={s.cardLabel} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {offset === 0 && (
                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {s.tag}
                      </div>
                      <p className="text-white font-heading font-semibold text-sm">{s.cardLabel}</p>
                    </div>
                  )}
                </button>
              );
            })}

          </div>
        </div>

        {/* Carousel nav arrows — bottom right */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={prev}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar — relative wrapper has high z so dropdown can escape */}
        <div className="mt-6 relative z-40">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Browse by Category — draggable + arrow indicator                   */
/* ------------------------------------------------------------------ */

function BrowseCategoriesSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ down: boolean; startX: number; startScroll: number; moved: boolean }>({
    down: false, startX: 0, startScroll: 0, moved: false,
  });

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  };

  const onDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { down: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false };
    el.classList.add("cursor-grabbing");
  };
  const onMove = (e: React.MouseEvent) => {
    if (!dragState.current.down || !scrollerRef.current) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    scrollerRef.current.scrollLeft = dragState.current.startScroll - dx;
  };
  const onUp = () => {
    dragState.current.down = false;
    scrollerRef.current?.classList.remove("cursor-grabbing");
  };

  return (
    <section className="bg-black py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-white">Browse by Category</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => scrollBy(-1)} aria-label="Scroll categories left"
              className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Scroll categories right"
              className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          ref={scrollerRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-none snap-x snap-mandatory cursor-grab select-none"
        >
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/explore?service=${cat.name}`}
              onClick={(e) => { if (dragState.current.moved) e.preventDefault(); }}
              style={{ width: "calc((100% - 4 * 1rem) / 4.5)" }}
              className="relative flex-shrink-0 aspect-[4/3] rounded-2xl overflow-hidden group snap-start"
            >
              <img src={cat.image} alt={cat.name} draggable={false} className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className="absolute bottom-4 left-4 text-white font-heading font-semibold text-base">{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Home Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNavbar />
      <HeroSection />
      <BrowseCategoriesSection />
      <FeaturedStudiosSection />


      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-2">How It Works</h2>
          <p className="text-muted-foreground mb-12">Simple, fast, and professional booking process</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: Search, title: "Browse & Compare", desc: "Explore portfolios, compare styles, and find the perfect photographer for your needs." },
              { icon: Package, title: "Customize Your Package", desc: "Select services, choose your date, and tailor a package that fits your vision and budget." },
              { icon: Monitor, title: "Book & Confirm", desc: "Secure your session with a few clicks and receive instant booking confirmation." },
            ].map((step, i) => (
              <div key={step.title} className="flex flex-col items-center animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                  <step.icon className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-sm mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* CTA */}
      <section className="mx-6 mb-16 mt-8">
        <div className="max-w-7xl mx-auto rounded-3xl px-8 sm:px-16 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#3a2418] via-[#4a2e1e] to-[#5a3826] shadow-xl">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">Are you a Photographer in Bulan?</h2>
            <p className="text-white/75 text-sm">Join our platform and manage bookings, showcase your work, and grow your business</p>
          </div>
          <Link to="/register">
            <Button size="lg" className="font-medium bg-white text-[#3a2418] hover:bg-white/90 rounded-full px-8 shadow-md">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo linkTo={null} className="mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed">Connect with talented photographers in Bulan and book your perfect photoshoot.</p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/explore" className="hover:text-foreground transition-colors">Explore Studios</Link></li>
              <li><Link to="/photographers" className="hover:text-foreground transition-colors">Photographers</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">My Bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Support</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">For Photographers</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/register" className="hover:text-foreground transition-colors">Join as Photographer</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Resources</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">© 2026 Bulan Photography Booking. All rights reserved.</p>

        </div>
      </footer>
    </div>
  );
}
