import { Link } from "react-router-dom";
import {
  Compass, Scale, SlidersHorizontal, CalendarDays, ClipboardList, Search, ClipboardCheck,
  Users, Camera, Building2, MapPin, ArrowRight, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import MarketingNavbar from "@/components/MarketingNavbar";
import Logo from "@/components/Logo";
import Reveal from "@/components/Reveal";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const glance = [
  { label: "Location", value: "Bulan, Sorsogon" },
  { label: "Built for", value: "Clients, freelance photographers, and studios" },
  { label: "Origin", value: "BSIT capstone project, 2026" },
];

const pillars = [
  { icon: Compass, label: "Photographer discovery" },
  { icon: Scale, label: "Service comparison" },
  { icon: SlidersHorizontal, label: "Booking customization" },
  { icon: CalendarDays, label: "Availability" },
  { icon: ClipboardList, label: "Booking management" },
];

const steps = [
  { icon: Compass, title: "Discover", text: "Find photographers and studios in Bulan and explore their profiles and portfolios." },
  { icon: Search, title: "Search", text: "Search by event/service, date, and location." },
  { icon: SlidersHorizontal, title: "Customize", text: "Choose services and package options that fit your needs." },
  { icon: ClipboardCheck, title: "Book & Track", text: "Submit bookings and follow their status throughout the booking process." },
];

const roles = [
  { icon: Users, title: "Clients", text: "Find, compare, customize, and book photography services.", cta: { label: "Explore photographers", to: "/explore" } },
  { icon: Camera, title: "Freelance Photographers", text: "Showcase your work, offer services, and manage bookings.", cta: { label: "Join as a photographer", to: "/register" } },
  { icon: Building2, title: "Studio Owners", text: "Manage studio services, team information, availability, and bookings.", cta: { label: "Register your studio", to: "/register" } },
];

const team = [
  { name: "Jhazel G. Cruzet", role: "Lead Developer & Programmer" },
  { name: "Erica G. Muring", role: "Project Manager" },
  { name: "Chariza Mae Demetrial", role: "System Analyst" },
  { name: "Patrick Palacio", role: "Technical Writer" },
];

/* Small shared bits so section headers stay consistent */
const Eyebrow = ({ children, className = "text-[#2b211b]" }: { children: string; className?: string }) => (
  <p className={`text-xs uppercase tracking-[0.2em] mb-3 ${className}`}>{children}</p>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function About() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-foreground">
      <MarketingNavbar />

      <main>
        {/* Intro — light, text-led, no photo hero */}
        <section className="relative overflow-hidden pt-32 pb-14 sm:pt-40 sm:pb-16 px-6 sm:px-8">
          {/* Background photo + the same brown wash used on Home's hero */}
          <div aria-hidden className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center grayscale-[60%] scale-105"
              style={{ backgroundImage: "url('/images/landscape.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(25,30%,6%)]/95 via-[hsl(25,30%,6%)]/70 to-[hsl(25,30%,6%)]/25" />
            <div className="absolute inset-0 bg-[hsl(25,30%,6%)]/40 lg:hidden" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-black pointer-events-none" />
          </div>
          <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-end">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="flex items-center gap-2 text-white/80 mb-5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs uppercase tracking-[0.2em]">About</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight leading-tight text-white">
                  About LensBook
                  </h1>
              </Reveal>

              <Reveal delay={100} className="mt-5">
                <p className="text-base sm:text-lg font-heading font-semibold text-white/90 mb-3">
                  A simpler way to discover, compare, and book local photographers.
                </p>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-xl">
                  LensBook is a web-based platform designed to connect clients with
                  photographers and photography studios in Bulan, Sorsogon through a centralized
                  booking experience.
                </p>
              </Reveal>

              <Reveal delay={180} className="mt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Link to="/explore">
                    <Button size="lg" className="font-medium px-8 bg-primary text-primary-foreground rounded-lg">
                      Explore Studios
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      size="lg"
                      variant="outline"
                      className="font-medium px-8 rounded-lg border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                    >
                      Join as Photographer
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* At a glance — quiet fact list, not a card */}
            <Reveal delay={160} className="lg:col-span-5">
              <dl className="border-l-2 border-white/30 pl-6 space-y-5">
                {glance.map((g) => (
                  <div key={g.label}>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-1">{g.label}</dt>
                    <dd className="text-sm font-heading font-semibold text-white/90">{g.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* Why */}
        <section className="pt-10 sm:pt-14 pb-14 sm:pb-16 px-6 sm:px-8 bg-black">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <Reveal className="lg:col-span-7">
              <Eyebrow className="text-white/60">Our purpose</Eyebrow>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6 text-white">Why SnapBulan?</h2>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-4 max-w-xl">
                Finding and booking a photographer usually means checking social media pages,
                sending multiple messages, waiting for replies, and manually comparing services
                and schedules across different studios.
              </p>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-xl">
                LensBook brings photographer discovery, service comparison,
                booking customization, availability, and booking management into one platform —
                so clients and photographers in Bulan don't have to piece it together themselves.
              </p>

              <div className="mt-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-4">One platform for</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                  {pillars.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-3 text-sm text-white/90">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#e8c9a0]" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[4/3] lg:aspect-[4/5]">
                <img
                  src="/images/photography.jpg"
                  alt="Photography studio in Bulan"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* What you can do — numbered list instead of Home's icon columns */}
        <section className="relative overflow-hidden py-16 sm:py-20 px-6 sm:px-8 bg-[#30231C] border-t border-white/10">
          <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <Reveal className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <Eyebrow className="text-white/60">The booking journey</Eyebrow>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3 text-white">What You Can Do</h2>
                <p className="text-sm text-white/70 leading-relaxed max-w-xs">
                  From the first search to the final booking, in one place.
                </p>
              </div>
            </Reveal>

            <ol className="lg:col-span-8">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <Reveal delay={i * 70} className="group flex items-start gap-5 sm:gap-8 py-6 border-t border-white/15 first:border-t-0 first:pt-0">
                    <span className="font-heading font-bold text-base text-[#e8c9a0] tabular-nums pt-0.5 w-7 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-base mb-1.5 text-white transition-colors duration-300 group-hover:text-[#e8c9a0]">{step.title}</h3>
                      <p className="text-sm text-white/70 leading-relaxed max-w-md">{step.text}</p>
                    </div>
                    <div className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors duration-300 group-hover:bg-white/10 group-hover:text-[#e8c9a0]">
                      <step.icon className="w-5 h-5" />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Built for */}
        <section className="py-16 sm:py-20 px-6 sm:px-8 bg-[#D9C8AE]">
          <div className="max-w-6xl mx-auto">
            <Reveal className="mb-12 max-w-xl">
              <Eyebrow className="text-[#1a120d]/70">Who it's for</Eyebrow>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#1a120d]">Built for Clients and Photographers</h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-12">
              {roles.map((role, i) => (
                <Reveal key={role.title} delay={i * 80} className="flex flex-col items-start border-t border-black/20 pt-6">
                  <div className="w-10 h-10 rounded-lg bg-black/[0.07] flex items-center justify-center mb-5">
                    <role.icon className="w-5 h-5 text-[#1a120d]" />
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-2 text-[#1a120d]">{role.title}</h3>
                  <p className="text-sm text-[#1a120d]/85 leading-relaxed mb-5">{role.text}</p>
                  <Link
                    to={role.cta.to}
                    className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#1a120d] underline underline-offset-4 decoration-black/40 hover:decoration-black underline-offset-4"
                  >
                    {role.cta.label}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 sm:py-20 px-6 sm:px-8 bg-[#F1E8DA]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <Reveal className="lg:col-span-4">
              <Eyebrow>The team</Eyebrow>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">The People Behind the Platform</h2>
              <p className="text-xs text-[#2b211b]">BSIT 3-4 · Sorsogon State University – Bulan Campus</p>
            </Reveal>

            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {team.map((member, i) => (
                  <Reveal key={member.name} delay={i * 70} className="flex items-center gap-4 py-5 border-t border-[#d9c9b2]">
                    <div className="w-12 h-12 rounded-full bg-[#E6D9C5] flex items-center justify-center font-heading font-semibold text-sm text-primary shrink-0">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-sm">{member.name}</h3>
                      <p className="text-xs text-[#2b211b] mt-0.5">{member.role}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal className="mt-8 pt-6 border-t border-[#d9c9b2] flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-[#2b211b] leading-relaxed">
                  A Capstone Project — developed as a Bachelor of Science in Information Technology
                  capstone project at Sorsogon State University – Bulan Campus, 2026.
                </p>
              </Reveal>
            </div>
          </div>
        </section>
      </main>


{/* CTA — matching Home page width, gradient, and divider */}
<section className="bg-[#F8F5EF] px-6 sm:px-8 py-16">
  <div className="max-w-7xl mx-auto">
    {/* Horizontal divider */}
    <div className="border-t border-[#d9c9b2] mb-12" />

    <Reveal>
      <div className="rounded-3xl px-8 sm:px-16 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#3a2418] via-[#4a2e1e] to-[#5a3826] shadow-xl">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
            Find the right photographer in Bulan
          </h2>
          <p className="text-white/75 text-sm sm:text-base">
            Browse portfolios, compare packages, and book in one place.
          </p>
        </div>

        <Link to="/explore">
          <Button
            size="lg"
            className="font-medium bg-white text-[#3a2418] hover:bg-white/90 rounded-full px-8 shadow-md"
          >
            Explore Studios
          </Button>
        </Link>
      </div>
    </Reveal>
  </div>
</section>


            {/* Footer */}
      <footer className="bg-background border-t border-border py-16 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo linkTo={null} className="mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect with photographers and studios in Bulan, Sorsogon.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/explore" className="hover:text-foreground transition-colors">Explore</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">About</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About LensBook</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms and Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">For Photographers</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/register" className="hover:text-foreground transition-colors">Join as Photographer</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">© 2026 LensBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
