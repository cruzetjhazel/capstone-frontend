import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon, Camera, MapPin, Clock, ArrowRight,
  Sparkles, Heart, Bell, HandMetal, Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BookingTracker } from "@/components/BookingTracker";
import { Button } from "@/components/ui/button";
import { formatPrice, type TrackingStage } from "@/data/photographers";
import { usePhotographers } from "@/hooks/usePhotographers";
import { useBookings } from "@/hooks/useBookings";
import { useNotifications } from "@/hooks/useNotifications";
import { useRole } from "@/contexts/RoleContext";
import type { BookingStatus } from "@/services/bookingService";

function stageFromStatus(status: BookingStatus): TrackingStage {
  switch (status) {
    case "pending": return "booked";
    case "approved": return "confirmed";
    case "paid": return "confirmed";
    case "completed": return "delivered";
    case "cancelled": return "booked";
    default: return "booked";
  }
}

export default function Dashboard() {
  const { user } = useRole();
  const { data: allPhotographers = [] } = usePhotographers();
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email);
  const { data: notifications = [] } = useNotifications(user?.email);
  const recommended = allPhotographers.slice(0, 3);

  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const recentNotifications = notifications.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-primary/70">Welcome back</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold mt-1 flex items-center gap-2">
                Hi {user?.name.split(" ")[0] ?? "there"}
                <HandMetal className="w-7 h-7 text-primary -rotate-12" />
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You have <strong className="text-foreground">{activeBookings.length} active booking{activeBookings.length !== 1 ? "s" : ""}</strong>. Track your sessions and discover new photographers.
              </p>
            </div>
            <Link to="/explore">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" /> Find a Photographer
              </Button>
            </Link>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg">My Active Bookings</h2>
            <Link to="/calendar" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {loadingBookings ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading bookings…</p>
            ) : activeBookings.map((b) => {
              const photog = allPhotographers.find((p) => p.id === b.photographerId);
              return (
                <div key={b.id} className="bg-card rounded-2xl border border-border/50 card-shadow p-6">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold shrink-0">
                        {photog?.avatar ?? b.photographerAvatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading font-semibold truncate">{b.photographerName}</p>
                        <p className="text-xs text-muted-foreground">{b.eventType} · {b.packageName}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Booking</p>
                      <p className="text-xs font-mono">{b.id}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <BookingTracker currentStage={stageFromStatus(b.status)} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border text-xs">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{b.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{b.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{b.eventLocation}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
                      <p className="font-heading font-bold text-primary">{formatPrice(b.subtotal)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {b.status === "approved" && (
                        <Link to={`/booking/${b.id}/pay`}>
                          <Button size="sm" className="gap-1.5"><Wallet className="w-3.5 h-3.5" /> Pay {formatPrice(b.dueNow)}</Button>
                        </Link>
                      )}
                      <Link to={`/booking/${b.id}/details`}>
                        <Button variant="outline" size="sm">Details</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loadingBookings && activeBookings.length === 0 && (
              <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
                <Camera className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium">No active bookings yet</p>
                <p className="text-sm text-muted-foreground mb-4">Discover talented photographers in Bulan.</p>
                <Link to="/explore"><Button>Explore Photographers</Button></Link>
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl border border-border/50 card-shadow lg:col-span-1">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Updates</h3>
              </div>
              <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {recentNotifications.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No new updates</p>
              ) : (
                recentNotifications.map((n) => (
                  <div key={n.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    {n.action === "pay" && n.bookingId && (
                      <Link to={`/booking/${n.bookingId}/pay`} className="text-xs text-primary font-medium hover:underline mt-1 inline-block">
                        Pay balance →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" /> Recommended for you
              </h3>
              <Link to="/explore" className="text-xs text-primary font-medium hover:underline">See more</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommended.map((r) => (
                <Link key={r.id} to={`/photographers/${r.id}`}
                  className="bg-card rounded-xl border border-border/50 card-shadow p-4 hover:card-shadow-hover transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold mb-3">
                    {r.avatar}
                  </div>
                  <p className="font-heading font-semibold text-sm truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.specialty}</p>
                  <p className="text-xs text-primary font-semibold mt-2">From {formatPrice(r.priceMin)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
