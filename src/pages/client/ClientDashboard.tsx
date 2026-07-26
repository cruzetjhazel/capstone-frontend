import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Bell, 
  AlertCircle, 
  Wallet, 
  Heart, 
  Star, 
  ShieldAlert, 
  Clock3
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { BookingTracker } from "@/components/BookingTracker";
import { Button } from "@/components/ui/button";
import { type TrackingStage } from "@/data/photographers";
import { usePhotographers } from "@/hooks/usePhotographers";
import { useBookings } from "@/hooks/useBookings";
import { useNotifications } from "@/hooks/useNotifications";
import { useRole } from "@/contexts/RoleContext";
import type { BookingStatus } from "@/services/bookingService";

// Helper to map booking status or tracker stage independently
function stageFromStatus(status?: BookingStatus): TrackingStage {
  if (!status) return "booked";
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
  const { data: allPhotographers = [] } = usePhotographers() || {};
  const { data: bookings = [], isLoading: loadingBookings } = useBookings(user?.email) || {};
  const { data: notifications = [] } = useNotifications(user?.email) || {};

  // Safe Data Summaries with fallbacks
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePhotographers = Array.isArray(allPhotographers) ? allPhotographers : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const activeBookings = safeBookings.filter((b) => b && b.status !== "completed" && b.status !== "cancelled");
  const outstandingPayments = safeBookings.filter((b) => b && b.status === "approved" && (b.dueNow || 0) > 0);
  const completedBookings = safeBookings.filter((b) => b && b.status === "completed");
  const nextBooking = activeBookings.length > 0 ? activeBookings[0] : null;

  const recentNotifications = safeNotifications.slice(0, 3);
  const recommended = safePhotographers.slice(0, 3);

  // Quick Stats
  const stats = [
    { label: "Active Sessions", value: activeBookings.length, color: "text-primary" },
    { label: "Pending Payments", value: outstandingPayments.length, color: "text-amber-500" },
    { label: "Completed", value: completedBookings.length, color: "text-emerald-500" },
    { label: "Eligible Reviews", value: completedBookings.length, color: "text-indigo-500" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up pb-10">
        
        {/* 1. WELCOME BANNER */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-primary/70 mb-1">
                Client Portal • Bulan Sorsogon
              </p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                Welcome back, {user?.name ? user.name.split(" ")[0] : "Client"}!
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                You have <strong className="text-foreground">{activeBookings.length} active booking{activeBookings.length !== 1 ? "s" : ""}</strong> in progress.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/explore">
                <Button size="lg" className="shadow-sm rounded-xl">
                  Explore & Book Session
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. ACTION REQUIRED: OUTSTANDING PAYMENT REMINDER */}
        {outstandingPayments.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap animate-pulse-slow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Payment Required to Confirm Booking</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have {outstandingPayments.length} accepted request{outstandingPayments.length > 1 ? "s" : ""} awaiting initial payment.
                </p>
              </div>
            </div>
            <Link to="/payments">
              <Button size="sm" className="gap-1.5 shadow-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                <Wallet className="w-4 h-4" /> Complete Payment <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* 3. QUICK STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-4 text-center shadow-sm">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-heading ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 4. UPCOMING SESSION TRACKER */}
        {nextBooking && !loadingBookings && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Active Booking Tracking</h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" /> 24h Request Hold System
              </span>
            </div>

            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Details */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase">
                      {nextBooking.eventType || "Photo Session"}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium capitalize">
                      Status: <strong className="text-foreground">{nextBooking.status}</strong>
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-foreground">{nextBooking.photographerName || "Photographer"}</h3>
                  
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-primary" /> {nextBooking.date || "N/A"}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> {nextBooking.startTime || "N/A"}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> <span className="truncate max-w-[140px]">{nextBooking.eventLocation || "Bulan"}</span></span>
                  </div>

                  {/* Payment Breakdown */}
                  {(nextBooking.dueNow || 0) > 0 && (
                    <p className="text-xs text-amber-600 font-medium pt-1">
                      Remaining Balance: ₱{(nextBooking.dueNow || 0).toLocaleString()} (Payable Onsite/Online)
                    </p>
                  )}
                </div>

                {/* Service Tracker */}
                <div className="flex-1 w-full max-w-md bg-muted/20 p-4 rounded-xl border border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 text-center">Service Progress Tracker</p>
                  <BookingTracker currentStage={stageFromStatus(nextBooking.status)} />
                </div>

                {/* Contextual Actions */}
                <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
                  {nextBooking.status === "approved" && (
                    <Link to={`/booking/${nextBooking.id}/pay`}>
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">Pay Deposit</Button>
                    </Link>
                  )}

                  <Link to={`/booking/${nextBooking.id}/details`}>
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. NOTIFICATIONS & RECOMMENDED STUDIOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Notifications */}
          <div className="lg:col-span-1 bg-card rounded-xl border border-border/50 shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Recent Updates
              </h3>
              <Link to="/notifications" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 p-5 space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n, i) => (
                  <div key={n.id || i} className="flex gap-3 text-xs">
                    <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{n.title || "Notification"}</p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{n.description || ""}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Bell className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Local Studios */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Verified Local Studios & Freelancers
              </h3>
              <Link to="/favorites" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> Saved Favorites
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommended.map((r) => (
                <Link key={r.id} to={`/photographers/${r.id}`}
                  className="bg-card rounded-xl border border-border/50 shadow-sm p-4 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-heading font-bold mb-3 group-hover:scale-105 transition-transform">
                    {r.avatar || "P"}
                  </div>
                  <p className="font-heading font-semibold text-sm truncate text-foreground">{r.name || "Studio"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.specialty || "Photography"}</p>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-xs">
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {r.rating || 5.0}
                    </span>
                    <span className="text-muted-foreground font-medium">From ₱{(r.price || 0).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* 6. SYSTEM REPORTING HELPDESK */}
        <div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Having issues with a booking or studio? Submit an official report.</span>
          </div>
          <Link to="/report-problem">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
              Report Problem
            </Button>
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}