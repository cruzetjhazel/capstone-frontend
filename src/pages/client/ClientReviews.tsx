import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import toast, { Toaster } from "react-hot-toast";
import { 
  Star, MessageSquare, CheckCircle2, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewTab = "pending" | "history";

interface WrittenReview {
  id: string;
  bookingId: string;
  photographerId: string;
  photographerName: string;
  rating: number;
  comment: string;
  dateCreated: string;
}

export default function Reviews() {
  const { user } = useRole();
  const { data: bookings = [] } = useBookings(user?.email);
  const [activeTab, setActiveTab] = useState<ReviewTab>("pending");
  
  // Simulated list of written reviews
  const [writtenReviews, setWrittenReviews] = useState<WrittenReview[]>([
    {
      id: "REV-401",
      bookingId: "BK-9921",
      photographerId: "1",
      photographerName: "Marcus Rivera",
      rating: 5,
      comment: "Absolutely incredible output! Marcus made us feel very comfortable during the entire wedding shoot.",
      dateCreated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toDateString()
    },
    {
      id: "REV-402",
      bookingId: "BK-8812",
      photographerId: "2",
      photographerName: "Anya Petrova",
      rating: 4,
      comment: "Great experience. The lighting setups were exceptional.",
      dateCreated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toDateString() 
    }
  ]);

  const [ratingInput, setRatingInput] = useState<number>(5);
  const [commentInput, setCommentInput] = useState<string>("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reviews are allowed only for completed bookings[cite: 20]
  const completedBookings = bookings.filter((b) => b.status === "completed");
  
  // A Client can submit only one review per booking[cite: 20]
  const unreviewedBookings = completedBookings.filter(
    (b) => !writtenReviews.some((r) => String(r.bookingId) === String(b.id))
  );

  const handleWriteReview = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setRatingInput(5);
    setCommentInput("");
  };

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      toast.error("Please provide a written comment for your review.");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndSubmitReview = async () => {
    if (!selectedBookingId) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting your review...");

    // Simulate backend processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetBooking = bookings.find(b => String(b.id) === String(selectedBookingId));
    if (targetBooking) {
      const newReview: WrittenReview = {
        id: `REV-${Math.floor(100 + Math.random() * 900)}`,
        bookingId: selectedBookingId,
        photographerId: targetBooking.photographerId,
        photographerName: targetBooking.photographerName,
        rating: ratingInput,
        comment: commentInput,
        dateCreated: new Date().toDateString()
      };
      
      setWrittenReviews(prev => [newReview, ...prev]);
      toast.success("Review submitted successfully!", { id: loadingToast });
    }

    setIsSubmitting(false);
    setShowConfirmModal(false);
    setSelectedBookingId(null);
    setCommentInput("");
    setActiveTab("history"); // Auto-switch to history to see the new review
  };

  return (
    <DashboardLayout>
      <Toaster position="top-center" />
      
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-12">
        <div>
          <h1 className="text-2xl font-heading font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rate your experiences and manage reviews for your completed photoshoots.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-4">
          <button
            onClick={() => { setActiveTab("pending"); setSelectedBookingId(null); }}
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-all",
              activeTab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            Pending Review ({unreviewedBookings.length})
          </button>
          <button
            onClick={() => { setActiveTab("history"); setSelectedBookingId(null); }}
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-all",
              activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            My Written Reviews ({writtenReviews.length})
          </button>
        </div>

        {/* Main Interface Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left / Main Section: Review Lists */}
          <div className="md:col-span-2 space-y-4">
            {activeTab === "pending" ? (
              unreviewedBookings.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed p-10 text-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                  <p className="font-medium text-sm">All caught up!</p>
                  <p className="text-xs text-muted-foreground">You do not have any pending reviews to submit.</p>
                </div>
              ) : (
                unreviewedBookings.map((b) => (
                  <div key={b.id} className="bg-card border border-border/50 p-5 rounded-xl flex justify-between items-center gap-4 shadow-sm">
                    <div>
                      <h4 className="font-heading font-semibold text-sm">{b.photographerName}</h4>
                      <p className="text-xs text-muted-foreground">{b.eventType} &bull; Completed {b.date}</p>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => handleWriteReview(b.id)}>
                      Write Review
                    </Button>
                  </div>
                ))
              )
            ) : (
              writtenReviews.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed p-10 text-center shadow-sm">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-medium text-sm">No reviews yet</p>
                  <p className="text-xs text-muted-foreground">You haven't submitted any reviews.</p>
                </div>
              ) : (
                writtenReviews.map((rev) => (
                  <div key={rev.id} className="bg-card border border-border/50 p-5 rounded-xl space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-heading font-semibold text-sm">{rev.photographerName}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Booking {rev.bookingId}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{rev.dateCreated}</span>
                    </div>

                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("w-4 h-4", i < rev.rating ? "fill-accent text-accent" : "text-muted/30")} />
                      ))}
                    </div>

                    <p className="text-sm text-foreground italic">&ldquo;{rev.comment}&rdquo;</p>
                  </div>
                ))
              )
            )}
          </div>

          {/* Right Section: Form Box */}
          <div className="md:col-span-1">
            {selectedBookingId && activeTab === "pending" ? (
              <form onSubmit={handleInitiateSubmit} className="bg-card border border-border/60 rounded-xl p-5 space-y-5 shadow-sm sticky top-6">
                <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2">
                  Write a Review
                </h3>

                {/* Rating Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Star Rating</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star className={cn("w-7 h-7 transition-all", star <= ratingInput ? "fill-accent text-accent" : "text-muted-foreground/20")} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Feedback Comments</label>
                  <textarea
                    rows={5}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Share your experience about the photo quality, coordination, and timing..."
                    className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" className="w-full text-xs">
                    Submit Review
                  </Button>
                  <Button type="button" variant="outline" className="w-full text-xs" onClick={() => setSelectedBookingId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-muted/30 border border-border/40 rounded-xl p-6 text-center space-y-3 sticky top-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <h4 className="text-sm font-semibold">Writing Reviews</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a completed booking from the pending list to write a rating and share your experience. Remember, you can only submit one review per booking.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Submit Review?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to submit this review? Once submitted, it will be published to the professional's public profile and cannot be edited.
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={confirmAndSubmitReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Yes, Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}