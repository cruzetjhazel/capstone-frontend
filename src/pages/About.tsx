import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ClipboardCheck, Compass, Users, Camera, Building2 } from "lucide-react";
import MarketingNavbar from "@/components/MarketingNavbar";
import Logo from "@/components/Logo";

const capabilities = [
  { icon: Compass, title: "Discover", text: "Find photographers and studios in Bulan and explore their profiles and portfolios." },
  { icon: Search, title: "Search", text: "Search by event/service, date, and location." },
  { icon: SlidersHorizontal, title: "Customize", text: "Choose services and package options that fit your needs." },
  { icon: ClipboardCheck, title: "Book & Track", text: "Submit bookings and follow their status throughout the booking process." },
];

const roles = [
  { icon: Users, title: "Clients", text: "Find, compare, customize, and book photography services." },
  { icon: Camera, title: "Freelance Photographers", text: "Showcase your work, offer services, and manage bookings." },
  { icon: Building2, title: "Studio Owners", text: "Manage studio services, team information, availability, and bookings." },
];

const team = [
  { name: "Jhazel G. Cruzet", role: "Lead Developer & Programmer" },
  { name: "Erica G. Muring", role: "Project Manager" },
  { name: "Chariza Mae Demetrial", role: "System Analyst" },
  { name: "Patrick Palacio", role: "Technical Writer" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar solid />

      {/* Hero / Intro */}
      <section className="pt-28 sm:pt-32 pb-16 px-6 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">About</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">About Bulan Photography Booking</h1>
          <p className="text-base sm:text-lg font-heading font-semibold text-foreground/90 mb-4">
            A simpler way to discover, compare, and book local photographers.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Bulan Photography Booking is a web-based platform designed to connect clients with
            photographers and photography studios in Bulan, Sorsogon through a centralized
            booking experience.
          </p>
        </div>
      </section>

      <main>
        {/* Why Bulan Photography Booking? */}
        <section className="py-20 px-6 border-b border-border bg-muted/40">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6">Why Bulan Photography Booking?</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
                Finding and booking a photographer usually means checking social media pages,
                sending multiple messages, waiting for replies, and manually comparing services
                and schedules across different studios.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Bulan Photography Booking brings photographer discovery, service comparison,
                booking customization, availability, and booking management into one platform —
                so clients and photographers in Bulan don't have to piece it together themselves.
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden border border-primary/15 shadow-xl ring-1 ring-black/5 aspect-[4/5] lg:aspect-square">
              <img
                src="/images/featured-studio-bg.jpg"
                alt="Photography studio in Bulan"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* What You Can Do */}
        <section className="py-20 px-6 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold">What You Can Do</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {capabilities.map((item) => (
                <div key={item.title} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Built for Clients and Photographers */}
        <section className="py-20 px-6 border-b border-border bg-gradient-to-r from-[#3a2418] via-[#4a2e1e] to-[#5a3826]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Built for Clients and Photographers</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div
                  key={role.title}
                  className="bg-white/10 border border-white/15 rounded-2xl p-6 text-center flex flex-col items-center backdrop-blur-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                    <role.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-heading font-semibold text-sm mb-2 text-white">{role.title}</h3>
                  <p className="text-xs text-white/70 leading-relaxed">{role.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meet the Capstone Team */}
        <section className="py-20 px-6 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-1">Meet the Capstone Team</h2>
              <p className="text-xs text-muted-foreground">
                BSIT 3-4 · Sorsogon State University – Bulan Campus
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="bg-card border border-border/50 rounded-xl p-5 text-center card-shadow hover:card-shadow-hover transition-shadow duration-200"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {member.role}
                  </p>
                  <h4 className="font-heading font-semibold text-sm text-foreground">
                    {member.name}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* A Capstone Project */}
        <section className="py-16 px-6 bg-muted/40">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">A Capstone Project</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Developed as a Bachelor of Science in Information Technology capstone project at
              Sorsogon State University – Bulan Campus.
            </p>
            <p className="text-sm font-heading font-semibold text-foreground/80">2026</p>
          </div>
        </section>
      </main>

      {/* Footer — same as Home */}
      <footer className="border-t border-border py-16 px-6">
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
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Bulan</Link></li>
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
          <p className="text-xs text-muted-foreground">© 2026 Bulan Photography Booking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
