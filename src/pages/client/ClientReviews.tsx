import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import api, { getApiErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Star, MessageSquare, CheckCircle2, AlertTriangle
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Pagination, PillTabs, usePagination } from "@/components/ListPagination";

type ReviewTab = "pending" | "history";

const PENDING_PAGE_SIZE = 6;
const HISTORY_PAGE_SIZE = 5;

interface WrittenReview {
  id: string;
  bookingId: string;
  photographerId: string;
  photographerName: string;
  rating: number;
  comment: string;
  dateCreated: string;
}

type RawReview = {
  id: number;
  booking_id: number;
  photographer: { id: number; name: string };
  rating: number;
  comment: string;
  created_at: string;
};

function mapReview(raw: RawReview): WrittenReview {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id),
    photographerId: String(raw.photographer.id),
    photographerName: raw.photographer.name,
    rating: raw.rating,
    comment: raw.comment,
    dateCreated: new Date(raw.created_at).toDateString(),
  };
}

export default function Reviews() {
  const { user } = useRole();
  const { data: bookings = [] } = useBookings(user?.email);
  const [activeTab, setActiveTab] = useState<ReviewTab>("pending");

  const [writtenReviews, setWrittenReviews] = useState<WrittenReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    setLoadError(null);
    try {
      const res = await api.get("/client/reviews");
      const list = (res.data?.data ?? res.data ?? []) as RawReview[];
      setWrittenReviews(list.map(mapReview));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Unable to load your reviews."));
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const [ratingInput, setRatingInput] = useState<number>(5);
  const [commentInput, setCommentInput] = useState<string>("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reviews are allowed only for completed bookings
  const completedBookings = bookings.filter(
  (b: any) =>
    b.status === "completed" &&
    b.isReviewable !== false &&
    !(b.nonCompletionReason === "photographer_no_show" && b.nonCompletionState !== "upheld")
);

  // A Client can submit only one review per booking
  const unreviewedBookings = completedBookings.filter(
    (b) => !writtenReviews.some((r) => String(r.bookingId) === String(b.id))
  );

  const selectedBooking = unreviewedBookings.find((b) => String(b.id) === String(selectedBookingId));

  // Only the visible slice of each list is rendered.
  const pendingPager = usePagination(unreviewedBookings, PENDING_PAGE_SIZE);
  const historyPager = usePagination(writtenReviews, HISTORY_PAGE_SIZE);

  // On small screens the form sits below the list; bring it into view on select.
  useEffect(() => {
    if (selectedBookingId) formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedBookingId]);

  const changeTab = (tab: ReviewTab) => {
    setActiveTab(tab);
    setSelectedBookingId(null);
  };

  const handleWriteReview = (bookingId: string) => {
    setSelectedBookingId(String(bookingId));
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

    try {
      const res = await api.post("/client/reviews", {
        booking_id: Number(selectedBookingId),
        rating: ratingInput,
        comment: commentInput,
      });
      const newReview = mapReview((res.data?.data ?? res.data) as RawReview);
      setWrittenReviews((prev) => [newReview, ...prev]);
      toast.success("Review submitted successfully!", { id: loadingToast });
      setSelectedBookingId(null);
      setCommentInput("");
      setActiveTab("history"); // Auto-switch to history to see the new review
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit review."), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const showForm = activeTab === "pending";

  return (
    <DashboardLayout>

      <div className="max-w-4xl mx-auto space-y-5 animate-fade-up pb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rate your experiences and manage reviews for your completed photoshoots.
            </p>
          </div>
          <PillTabs<ReviewTab>
            value={activeTab}
            onChange={changeTab}
            tabs={[
              { key: "pending", label: "Pending Review", count: isLoadingReviews ? undefined : unreviewedBookings.length },
              { key: "history", label: "My Written Reviews", count: isLoadingReviews ? undefined : writtenReviews.length },
            ]}
          />
        </div>

        {/* Main Interface Split — the form column only exists on the Pending tab */}
        <div className={cn("grid grid-cols-1 gap-4", showForm && "md:grid-cols-3")}>

          {/* Left / Main Section: Review Lists */}
          <div className={cn("space-y-2.5", showForm && "md:col-span-2")}>
            {isLoadingReviews ? (
              <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading your reviews…</div>
            ) : loadError ? (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
                <span>{loadError}</span>
                <Button size="sm" variant="outline" onClick={fetchReviews}>Retry</Button>
              </div>
            ) : activeTab === "pending" ? (
              unreviewedBookings.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed p-8 text-center shadow-sm">
                  <CheckCircle2 className="w-9 h-9 text-primary/40 mx-auto mb-2" />
                  <p className="font-medium text-sm">All caught up!</p>
                  <p className="text-xs text-muted-foreground">You do not have any pending reviews to submit.</p>
                </div>
              ) : (
                <>
                  {pendingPager.pageItems.map((b) => {
                    const selected = String(b.id) === String(selectedBookingId);
                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "bg-card border p-3 rounded-xl flex items-center gap-3 shadow-sm transition-colors",
                          selected ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50 hover:border-border"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-heading font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(b.photographerName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-semibold text-sm truncate">{b.photographerName}</h4>
                          <p className="text-xs text-muted-foreground truncate">{b.eventType} &bull; Completed {b.date}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={selected ? "outline" : "default"}
                          className="shrink-0 h-8 text-xs"
                          onClick={() => handleWriteReview(b.id)}
                        >
                          {selected ? "Writing…" : "Write Review"}
                        </Button>
                      </div>
                    );
                  })}
                  <Pagination pagination={pendingPager} />
                </>
              )
            ) : (
              writtenReviews.length === 0 ? (
                <div className="bg-card rounded-xl border border-dashed p-8 text-center shadow-sm">
                  <MessageSquare className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-medium text-sm">No reviews yet</p>
                  <p className="text-xs text-muted-foreground">You haven't submitted any reviews.</p>
                </div>
              ) : (
                <>
                  {historyPager.pageItems.map((rev) => (
                    <div key={rev.id} className="bg-card border border-border/50 p-3.5 rounded-xl space-y-2 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-heading font-semibold text-sm truncate">{rev.photographerName}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("w-3.5 h-3.5", i < rev.rating ? "fill-accent text-accent" : "text-muted/30")} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Booking {rev.bookingId}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{rev.dateCreated}</span>
                      </div>

                      <p className="text-sm text-foreground italic">&ldquo;{rev.comment}&rdquo;</p>
                    </div>
                  ))}
                  <Pagination pagination={historyPager} />
                </>
              )
            )}
          </div>

          {/* Right Section: Form Box (Pending tab only) */}
          {showForm && (
            <div className="md:col-span-1">
              {selectedBookingId ? (
                <form ref={formRef} onSubmit={handleInitiateSubmit} className="bg-card border border-border/60 rounded-xl p-4 space-y-4 shadow-sm md:sticky md:top-6">
                  <div className="border-b border-border/50 pb-2">
                    <h3 className="font-heading font-bold text-sm">Write a Review</h3>
                    {selectedBooking && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {selectedBooking.photographerName} &bull; {selectedBooking.eventType}
                      </p>
                    )}
                  </div>

                  {/* Rating Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Star Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRatingInput(star)}
                          className="hover:scale-110 transition-transform focus:outline-none"
                          aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star className={cn("w-6 h-6 transition-all", star <= ratingInput ? "fill-accent text-accent" : "text-muted-foreground/20")} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Feedback Comments</label>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share your experience about the photo quality, coordination, and timing..."
                      className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="text-xs h-9" onClick={() => setSelectedBookingId(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs h-9">
                      Submit Review
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="bg-muted/30 border border-border/40 rounded-xl p-4 text-center space-y-2 md:sticky md:top-6">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <h4 className="text-sm font-semibold">Writing Reviews</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select a completed booking from the pending list to write a rating and share your experience. Remember, you can only submit one review per booking.
                  </p>
                </div>
              )}
            </div>
          )}
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
