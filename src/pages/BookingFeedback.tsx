import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Star, CheckCircle2, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBooking } from "@/hooks/useBookings";
import { feedbackService } from "@/services/feedbackService";

const CRITERIA = [
  { key: "communication", label: "Communication" },
  { key: "punctuality", label: "Punctuality" },
  { key: "quality", label: "Photo Quality" },
  { key: "value", label: "Value for Money" },
] as const;

type CriteriaKey = (typeof CRITERIA)[number]["key"];

export default function BookingFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const [overall, setOverall] = useState(0);
  const [hoverOverall, setHoverOverall] = useState(0);
  const [ratings, setRatings] = useState<Record<CriteriaKey, number>>({
    communication: 0, punctuality: 0, quality: 0, value: 0,
  });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const avgSubRating =
    Object.values(ratings).reduce((a, b) => a + b, 0) / CRITERIA.length;

  const canSubmit = overall > 0 && Object.values(ratings).every((r) => r > 0);

  const submit = async () => {
    if (!id || !canSubmit) return;
    setSubmitting(true);
    await feedbackService.submit({
      bookingId: id,
      photographerName: booking?.photographerName,
      overall,
      ratings,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Thank you for your feedback!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your review helps other clients find great photographers and helps {booking?.photographerName ?? "the studio"} grow.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Bookings</Button>
            <Link to="/explore"><Button>Explore More</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-card border border-border rounded-3xl p-8 space-y-6 animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">Service Completed</p>
            <h1 className="text-2xl font-heading font-bold">How was your experience?</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rate your session with <span className="font-medium text-foreground">{booking?.photographerName ?? "your photographer"}</span>
              {booking?.eventType && <> for the <span className="font-medium text-foreground">{booking.eventType}</span></>}.
            </p>
          </div>

          <div className="text-center py-4 border-y border-border">
            <p className="text-sm font-medium mb-3">Overall Rating</p>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverOverall(n)}
                  onMouseLeave={() => setHoverOverall(0)}
                  onClick={() => setOverall(n)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`Rate ${n} stars`}
                >
                  <Star
                    className={cn(
                      "w-9 h-9 transition-colors",
                      (hoverOverall || overall) >= n
                        ? "fill-accent text-accent"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Rate specific aspects</p>
            {CRITERIA.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRatings((r) => ({ ...r, [c.key]: n }))}
                      aria-label={`${c.label} ${n} stars`}
                    >
                      <Star
                        className={cn(
                          "w-5 h-5 transition-colors",
                          ratings[c.key] >= n ? "fill-accent text-accent" : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {avgSubRating > 0 && (
              <p className="text-[11px] text-muted-foreground text-right">Average: {avgSubRating.toFixed(1)} / 5</p>
            )}
          </div>

          <div>
            <label htmlFor="comment" className="text-sm font-medium block mb-2">
              Share your experience <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="What did you love? What could be better?"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Skip for now</Button>
            <Button onClick={submit} disabled={!canSubmit || submitting} className="gap-1.5">
              <Send className="w-4 h-4" /> {submitting ? "Submitting…" : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
