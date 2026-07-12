import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedPhotographers } from "@/hooks/usePhotographers";

/** Admin-curated featured studios — only approved profiles marked featured. */
export default function FeaturedStudiosSection() {
  const { data: studios = [], isLoading } = useFeaturedPhotographers();

  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center grayscale-[60%] scale-105"
        style={{ backgroundImage: "url('/images/featured-studio-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(25,30%,6%)]/70 via-[hsl(25,30%,6%)]/55 to-[hsl(25,30%,6%)]/80" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-black pointer-events-none" />
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">Bulan • Sorsogon</p>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white">Featured Photography Studios</h2>
          <p className="text-white/70 mt-2 text-sm">Verified professionals ready to capture your moments</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : studios.length === 0 ? (
          <p className="text-center text-white/60 text-sm py-8">
            Featured studios will appear here once an admin selects approved studios.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {studios.map((studio, i) => (
              <div
                key={studio.id}
                className="bg-white/10 rounded-2xl overflow-hidden border border-white/15 hover:border-white/30 hover:bg-white/15 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-40 bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center">
                  <span className="text-4xl font-heading font-bold text-white/40">{studio.avatar}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-heading font-semibold text-sm text-white">{studio.name}</h3>
                    <div className="flex items-center gap-1 bg-white/10 text-white px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs font-semibold">{studio.rating}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/60 mb-2">{studio.specialty}</p>
                  <div className="flex items-center gap-1 text-xs text-white/50 mb-4">
                    <MapPin className="w-3 h-3" />{studio.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/booking/${studio.id}`}>
                      <Button size="sm" className="text-xs px-4 font-medium">Book</Button>
                    </Link>
                    <Link to={`/photographers/${studio.id}`} className="text-xs text-white/60 hover:text-white transition-colors">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <Link to="/explore" className="text-white/70 hover:text-white text-sm font-medium inline-flex items-center gap-1 transition-colors">
            See more Studios <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
