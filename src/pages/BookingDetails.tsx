import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { usePhotographers } from "@/hooks/usePhotographers";
import toast from "react-hot-toast"; 
import { cn } from "@/lib/utils";
import {
  Calendar, Clock, MapPin, ArrowLeft, Shield,
  Phone, Mail, Award, AlertCircle, X, CalendarPlus, FileX, Edit3, Loader2, Sparkles, Receipt, Check, Star
} from "lucide-react";
import { useState, useMemo } from "react";

type RequestType = "reschedule" | "cancel" | "modify" | null;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

// Aligned with Service Tracker requirements[cite: 24]
const TRACKING_STEPS = [
  { label: "Confirmed", description: "Booking has been confirmed & scheduled" },
  { label: "Upcoming", description: "Preparing for your upcoming event" },
  { label: "Scheduled", description: "Photographer is ready for the event" },
  { label: "In Progress", description: "Event coverage and/or photo editing in progress" },
  { label: "Completed", description: "All services delivered and finished" }
];

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useRole();
  const { data: bookings = [] } = useBookings(user?.email);
  const { data: allPhotographers = [] } = usePhotographers();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestFormType, setRequestFormType] = useState<RequestType>(null);
  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [modificationOption, setModificationOption] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [localActiveRequest, setLocalActiveRequest] = useState(false);

  const booking: any = bookings.find((b) => String(b.id) === String(id));
  const photographer = booking ? allPhotographers.find((p) => String(p.id) === String(booking.photographerId)) : null;

  // Calculate 7-day restriction for modifications[cite: 24]
  const canModifyOrReschedule = useMemo(() => {
    if (!booking?.date) return false;
    const eventDate = new Date(booking.date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [booking?.date]);

  if (!booking) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className="text-muted-foreground">Booking not found or you lack authorized access.</p>
          <Link to="/bookings" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Back to Bookings</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isCustom = booking.packageType === "custom";
  const remainingBalance = booking.status === "completed" ? 0 : booking.subtotal - booking.dueNow;
  const showDirectContact = booking.status === "approved" || booking.status === "paid" || booking.status === "completed" || booking.status === "confirmed";
  
  const hasActiveRequest = booking.hasActiveRequest || localActiveRequest; 

  // Snapshot of custom build configurations[cite: 24]
  const customBuild = booking.customBuild || {
    baseFee: 5000,
    editedPhotos: { label: "500 Edited Photos", price: 2000 },
    photographers: { label: "3 Photographers", price: 3000 },
    rawFiles: { price: 1000 },
    secondLocation: { price: 2000 },
    delivery: { label: "Express Delivery", price: 2000 }
  };

  const handleOpenForm = (type: RequestType) => {
    setRequestFormType(type);
    setIsConfirming(false);
    setReason("");
    setPreferredDate("");
    setModificationOption("");
    setRequestModalOpen(true);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true); 
  };

  const handleFinalSubmit = async () => {
    if (!requestFormType) return;
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLocalActiveRequest(true);
      toast.success(`Your ${requestFormType} request has been sent to the studio for review.`);
      setRequestModalOpen(false);
      setRequestFormType(null);
      setIsConfirming(false);
    } catch (error) {
      console.error("Submission failed", error);
      toast.error("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentStepIndex = (b: any) => {
    if (b.status === "completed") return 4; 
    if (b.trackerStatus === "in progress" || b.status === "editing") return 3;   
    if (b.trackerStatus === "scheduled") return 2;
    if (b.trackerStatus === "upcoming") return 1;
    if (b.status === "confirmed" || b.status === "paid") return 0; 
    return -1; // Not yet in tracker (e.g., pending)
  };

  const currentStep = getCurrentStepIndex(booking);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/bookings">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <span className="text-xs text-muted-foreground">Booking Details</span>
              <h1 className="text-lg font-bold font-heading -mt-1">ID: {booking.id}</h1>
            </div>
          </div>
          
          {hasActiveRequest ? (
            <Button disabled variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 gap-2">
               <AlertCircle className="w-3.5 h-3.5" /> Request Pending
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {booking.status === "pending" && <Button disabled variant="secondary" className="text-xs opacity-70">Waiting for Approval</Button>}
              {booking.status === "approved" && booking.dueNow > 0 && <Link to={`/booking/${booking.id}/pay`}><Button className="text-xs bg-primary">Pay Deposit Online</Button></Link>}
              {booking.status === "paid" && remainingBalance > 0 && <Link to={`/booking/${booking.id}/pay`}><Button className="text-xs bg-primary">Pay Remaining Balance</Button></Link>}
              {booking.status === "completed" && !booking.hasReviewed && (
                <Button className="text-xs bg-primary gap-2">
                  <Star className="w-3.5 h-3.5 fill-current" /> Leave a Review
                </Button>
              )}
            </div>
          )}
        </div>

        {/* --- Service Tracker UI --- */}
        {booking.status !== 'cancelled' && booking.status !== 'pending' && currentStep >= 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 card-shadow mt-4">
            <h3 className="font-heading font-bold text-sm sm:text-base mb-8 text-center text-muted-foreground uppercase tracking-wider">Service Progress</h3>
            
            <div className="relative w-full">
              <div className="absolute top-4 sm:top-5 left-4 sm:left-5 right-4 sm:right-5">
                <div className="h-[2px] w-full bg-muted rounded-full" />
                <div 
                  className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-700 rounded-full" 
                  style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              <div className="relative z-10 flex items-center justify-between w-full">
                {TRACKING_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isActive = idx === currentStep;

                  return (
                    <div key={idx} className="relative flex flex-col items-center group">
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-colors duration-300 bg-card",
                        isCompleted ? "border-primary bg-primary text-primary-foreground" : 
                        "border-muted text-muted-foreground",
                        isActive && "ring-4 ring-primary/20"
                      )}>
                        {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : (idx + 1)}
                      </div>
                      <span className={cn(
                        "absolute top-10 sm:top-12 text-[10px] sm:text-xs whitespace-nowrap font-medium",
                        isActive ? "text-foreground font-bold" : "text-muted-foreground hidden sm:block"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-10 sm:mt-12 text-center bg-muted/30 py-3 rounded-lg border border-border/50">
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Current Status: <span className="text-primary font-bold">{TRACKING_STEPS[currentStep].description}</span>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {booking.eventType}
                    </span>
                    {isCustom && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Custom Package
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-heading font-bold mt-2">
                    {isCustom ? "Customized Package" : booking.packageName}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCustom ? "Built specifically for your event" : `Standard package`} &bull; Provided by {booking.photographerName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Shoot Date</p>
                    <p className="text-muted-foreground text-xs">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <Clock className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Event Time</p>
                    <p className="text-muted-foreground text-xs">{booking.startTime}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sm sm:col-span-2">
                  <MapPin className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Venue Location</p>
                    <p className="text-muted-foreground text-xs">{booking.eventLocation}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-6">
              <h3 className="text-sm font-heading font-semibold mb-4">
                {isCustom ? "Your Customized Package" : "Package Details Snapshot"}
              </h3>
              
              {isCustom ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Edited Photos</span>
                    <span className="font-semibold">{customBuild.editedPhotos?.label || "Standard"}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Photographers</span>
                    <span className="font-semibold">{customBuild.photographers?.label || "1"}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Delivery Speed</span>
                    <span className="font-semibold">{customBuild.delivery?.label || "Standard 30 Days"}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">RAW Files</span>
                    <span className="font-semibold">{customBuild.rawFiles ? "Included" : "Not Included"}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Second Location</span>
                    <span className="font-semibold">{customBuild.secondLocation ? "Included" : "No"}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                   <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Package</span>
                    <span className="font-semibold">{booking.packageName}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Edited Photos</span>
                    <span className="font-semibold">{booking.packagePhotos || "300"}</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">RAW Files</span>
                    <span className="font-semibold">Included</span>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <span className="block text-muted-foreground mb-1">Delivery</span>
                    <span className="font-semibold">30 Days</span>
                  </div>
                </div>
              )}
            </div>

            {booking.status !== "completed" && booking.status !== "cancelled" && (
              <div className="bg-card rounded-2xl border border-border/50 card-shadow p-6">
                <h3 className="text-sm font-heading font-semibold mb-1">Booking Requests</h3>
                
                {hasActiveRequest ? (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="w-full">
                        <p className="text-sm font-bold text-amber-800">Active Request</p>
                        <p className="text-xs text-amber-700/80 mt-1 mb-4">You cannot submit another request until this one has been resolved.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-4">Need to change something? Submit a request to the studio.</p>
                    
                    {!canModifyOrReschedule && (
                      <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>Modifications and rescheduling must be requested at least 7 days before the event date.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button 
                        onClick={() => handleOpenForm("reschedule")} 
                        disabled={!canModifyOrReschedule}
                        variant="outline" 
                        className="w-full text-xs font-semibold h-10 gap-1.5"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" /> Request Reschedule
                      </Button>
                      
                      <Button 
                        onClick={() => handleOpenForm("modify")} 
                        disabled={!canModifyOrReschedule}
                        variant="outline" 
                        className="w-full text-xs font-semibold h-10 gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Modify Booking
                      </Button>

                      <Button 
                        onClick={() => handleOpenForm("cancel")} 
                        variant="outline" 
                        className="w-full text-xs font-semibold h-10 gap-1.5 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
                      >
                        <FileX className="w-3.5 h-3.5" /> Request Cancellation
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-6 space-y-4">
              <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Price & Payment Plan
              </h3>

              <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-3">
                <div className="pb-3 border-b border-dashed border-border/80 space-y-2">
                  
                  {isCustom ? (
                    <>
                      <div className="flex justify-between items-end text-xs">
                        <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">Base Fee</span>
                        <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                        <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.baseFee)}</span>
                      </div>
                      {customBuild.editedPhotos && (
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">{customBuild.editedPhotos.label}</span>
                          <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                          <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.editedPhotos.price)}</span>
                        </div>
                      )}
                      {customBuild.photographers && (
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">{customBuild.photographers.label}</span>
                          <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                          <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.photographers.price)}</span>
                        </div>
                      )}
                      {customBuild.rawFiles && (
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">RAW Files</span>
                          <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                          <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.rawFiles.price)}</span>
                        </div>
                      )}
                      {customBuild.secondLocation && (
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">Second Location</span>
                          <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                          <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.secondLocation.price)}</span>
                        </div>
                      )}
                      {customBuild.delivery && (
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">{customBuild.delivery.label}</span>
                          <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                          <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(customBuild.delivery.price)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between items-end text-xs">
                      <span className="text-muted-foreground shrink-0 relative pr-2 bg-card">Package Base</span>
                      <div className="flex-grow border-b-2 border-dotted border-border/50 mb-1 mx-1" />
                      <span className="font-medium text-foreground shrink-0 pl-2 bg-card">{formatPrice(booking.subtotal)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="font-bold text-foreground">Total Booking Amount</span>
                  <span className="font-bold text-foreground">{formatPrice(booking.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Paid Online (Xendit)</span>
                  <span className="font-medium text-foreground">{booking.status === 'paid' || booking.status === 'completed' || booking.status === 'confirmed' ? formatPrice(booking.dueNow) : formatPrice(0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                  <span className="font-semibold text-foreground">Remaining Balance (Onsite)</span>
                  <span className="font-bold text-primary">{formatPrice(remainingBalance)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 card-shadow p-6 space-y-4">
              <h3 className="text-sm font-heading font-semibold flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" /> Studio Contact
              </h3>

              {showDirectContact ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {/* TODO: usePhotographers() returns the public profile shape,
                        which has no phone field — the "+63 917..." fallback below
                        is a placeholder, not this studio's real number, until the
                        backend actually exposes a contact number here. */}
                    <span className="font-medium">{(photographer as { phone?: string } | null)?.phone || "+63 917 123 4567"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">
                      {(photographer as { email?: string } | null)?.email || `contact@${booking?.photographerName?.toLowerCase()?.replace(/\s+/g, "") || "studio"}.com`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 p-4 rounded-xl text-center space-y-2 border border-border/50">
                  <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-[10px] text-muted-foreground">Contact details are revealed once the booking is approved.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {requestModalOpen && requestFormType && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setRequestModalOpen(false); setRequestFormType(null); setIsConfirming(false); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
            
            {isConfirming ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-heading font-bold mb-2">Confirm Request</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Are you sure you want to submit this {requestFormType} request? 
                  The studio will be notified and your booking status will be placed under review.
                </p>
                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>Back</Button>
                  <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : "Confirm Submit"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInitialSubmit} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-heading font-bold capitalize">Request {requestFormType}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCustom ? "Customized Package" : "Standard Package"} &bull; Booking ID: {booking.id}
                  </p>
                </div>

                <div className="space-y-4">
                  {requestFormType === "reschedule" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">Preferred New Date & Time</label>
                      <input required type="datetime-local" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                  )}

                  {requestFormType === "modify" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">What would you like to modify?</label>
                      <select required value={modificationOption} onChange={(e) => setModificationOption(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Select an option</option>
                        <option value="venue">Venue</option>
                        <option value="addons">Add-ons</option>
                        <option value="contact">Contact Details</option>
                        
                        {isCustom && (
                          <>
                            <option disabled>── Custom Adjustments ──</option>
                            <option value="photos">Change number of edited photos</option>
                            <option value="delivery">Change delivery speed</option>
                            <option value="raw">Add / Remove RAW files</option>
                            <option value="location">Add second location</option>
                            <option value="photographers">Increase photographers</option>
                          </>
                        )}
                        
                        {!isCustom && (
                          <>
                            <option disabled>── Event Adjustments ──</option>
                            <option value="guests">Guest Count</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Reason / Notes</label>
                    <textarea required placeholder="Please explain your request in detail..." value={reason} onChange={(e) => setReason(e.target.value)} className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
                  </div>

                  {requestFormType === "cancel" && (
                    <p className="text-[10px] text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
                      By submitting a cancellation request, you understand that your deposit may be non-refundable according to the studio's cancellation policy.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setRequestModalOpen(false); setRequestFormType(null); }}>Cancel</Button>
                  <Button type="submit" variant={requestFormType === 'cancel' ? 'destructive' : 'default'}>Submit Request</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}