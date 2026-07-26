import { useState } from "react";
import { 
  CalendarDays, DollarSign, Star, TrendingUp, Clock, Users, CheckCircle, 
  Check, X, AlertCircle, FileText 
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const stats = [
  { label: "Pending Bookings", value: "6", icon: Clock, change: "+3 this week" },
  { label: "This Month Revenue", value: "₱45,280", icon: DollarSign, change: "+18% vs last month" },
  { label: "Completed Sessions", value: "23", icon: CheckCircle, change: "4.9★ avg rating" },
  { label: "Active Clients", value: "14", icon: Users, change: "+2 new this week" },
];

// Initial mock data updated to reflect separate statuses and package types
const initialBookings = [
  { 
    id: "B-001", client: "Emily Watson", event: "Wedding", date: "Mar 28, 2026", time: "2:00 PM", 
    bookingStatus: "pending", paymentStatus: "Pending", serviceTracker: "Upcoming", package: "Fixed: Premium Wedding" 
  },
  { 
    id: "B-002", client: "David Kim", event: "Engagement", date: "Apr 2, 2026", time: "4:00 PM", 
    bookingStatus: "confirmed", paymentStatus: "Partially Paid", serviceTracker: "Scheduled", package: "Custom Package" 
  },
  { 
    id: "B-003", client: "Sarah Chen", event: "Corporate", date: "Apr 5, 2026", time: "9:00 AM", 
    bookingStatus: "pending", paymentStatus: "Pending", serviceTracker: "Upcoming", package: "Fixed: Basic Corporate" 
  },
  { 
    id: "B-004", client: "Tom Brennan", event: "Portrait", date: "Apr 8, 2026", time: "11:00 AM", 
    bookingStatus: "confirmed", paymentStatus: "Fully Paid", serviceTracker: "In Progress", package: "Custom Package" 
  },
];

const reviews = [
  { client: "Lisa Park", rating: 5, text: "Incredible work! The wedding photos exceeded all expectations.", date: "3d ago" },
  { client: "Mark Johnson", rating: 5, text: "Very professional and easy to work with. Highly recommend!", date: "1w ago" },
  { client: "Anna Bell", rating: 4, text: "Great portraits, delivery was slightly delayed but quality was top-notch.", date: "2w ago" },
];

export default function StudioDashboard() {
  const [bookings, setBookings] = useState(initialBookings);
  
  // Modal States
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleOpenAccept = (booking: any) => {
    setSelectedBooking(booking);
    setIsAcceptModalOpen(true);
  };

  const handleOpenReject = (booking: any) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const executeAcceptBooking = () => {
    if (!selectedBooking) return;
    
    setBookings(bookings.map(b => 
      b.id === selectedBooking.id 
        ? { ...b, bookingStatus: "accepted" } 
        : b
    ));
    
    toast.success("Booking accepted! Client notified that payment is required.");
    setIsAcceptModalOpen(false);
    setSelectedBooking(null);
  };

  const executeRejectBooking = () => {
    if (!selectedBooking) return;
    if (!rejectionReason.trim()) {
      toast.error("A rejection reason is strictly required.");
      return;
    }
    
    setBookings(bookings.map(b => 
      b.id === selectedBooking.id 
        ? { ...b, bookingStatus: "rejected" } 
        : b
    ));
    
    toast.success("Booking rejected successfully. Client has been notified.");
    setIsRejectModalOpen(false);
    setSelectedBooking(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Welcome back, Rivera Studio</h1>
          <p className="text-muted-foreground mt-1">Here's your business overview and active bookings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50 hover:card-shadow-hover transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent bookings */}
          <div className="lg:col-span-2 bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Incoming & Active Bookings
              </h3>
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-full">
                {bookings.filter(b => b.bookingStatus === 'pending').length} Pending
              </span>
            </div>
            <div className="divide-y divide-border">
              {bookings.map((b) => (
                <div key={b.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm shrink-0 border border-secondary/20">
                      {b.client.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-sm truncate">{b.client}</p>
                      <p className="text-xs text-muted-foreground truncate flex gap-1.5 items-center">
                        <span className="font-semibold text-foreground/80">{b.event}</span> 
                        <span>•</span> {b.package}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] mt-1">
                        <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10">
                          Payment: {b.paymentStatus}
                        </span>
                        <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                          Tracker: {b.serviceTracker}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="text-xs text-muted-foreground text-left sm:text-right">
                      <p className="font-medium text-foreground">{b.date}</p>
                      <p>{b.time}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={b.bookingStatus as any} />
                      
                      {b.bookingStatus === "pending" && (
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => handleOpenAccept(b)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md transition-colors border border-emerald-200/50"
                            title="Accept Booking"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenReject(b)}
                            className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors border border-destructive/20"
                            title="Reject Booking"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-card rounded-xl card-shadow border border-border/50">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" /> Recent Reviews
              </h3>
            </div>
            <div className="divide-y divide-border">
              {reviews.map((r, i) => (
                <div key={i} className="px-6 py-4 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{r.client}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-accent text-accent" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                  <p className="text-xs text-muted-foreground/70 mt-2">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCEPT BOOKING MODAL */}
        {isAcceptModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-scale-up">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Accept Booking Request</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Are you sure you want to accept the booking for <strong>{selectedBooking.client}</strong>?
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg mt-4 text-left">
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    <strong>Next Step:</strong> The client will be notified to make a payment. The booking will officially become "Confirmed" once the online payment is successfully processed.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => setIsAcceptModalOpen(false)} className="w-full">
                  Cancel
                </Button>
                <Button onClick={executeAcceptBooking} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirm Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT BOOKING MODAL */}
        {isRejectModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-destructive/5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <h3 className="font-heading font-bold text-base text-destructive">Reject Booking</h3>
                </div>
                <button onClick={() => setIsRejectModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are declining the booking request from <strong>{selectedBooking.client}</strong> for {selectedBooking.date}.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="text-xs font-semibold">
                    Reason for Rejection <span className="text-destructive">*</span>
                  </Label>
                  <Textarea 
                    id="rejection-reason"
                    placeholder="e.g., Schedule conflict, out of coverage area, etc."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="resize-none h-24"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Providing a reason is required and will be shared with the client.
                  </p>
                </div>
              </div>
              
              <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={executeRejectBooking} disabled={!rejectionReason.trim()}>
                  Reject Booking
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}