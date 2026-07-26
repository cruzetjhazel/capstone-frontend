import { DashboardLayout } from "@/components/DashboardLayout";
import { Star, MessageSquare, Flag, CornerDownRight, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface Review {
  id: number;
  client: string;
  event: string;
  rating: number;
  date: string;
  text: string;
  reply?: string;
}

const initialReviews: Review[] = [
  { id: 1, client: "Lisa Park", event: "Wedding", rating: 5, date: "Mar 10, 2026", text: "Incredible work! The wedding photos exceeded all expectations.", reply: "Thank you so much, Lisa! It was an absolute honor capturing your special day." },
  { id: 2, client: "Mark Johnson", event: "Corporate", rating: 5, date: "Feb 28, 2026", text: "Very professional and easy to work with. Highly recommend!" },
  { id: 3, client: "Anna Bell", event: "Portrait", rating: 4, date: "Feb 15, 2026", text: "Great portraits, delivery was slightly delayed but quality was top-notch." },
];

const MAX_REPLY_LENGTH = 300;

export default function StudioReviews() {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  
  // Reply States
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewToReplyConfirm, setReviewToReplyConfirm] = useState<number | null>(null);

  // Report States & Confirmation Modal
  const [reviewToReport, setReviewToReport] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportConfirmation, setShowReportConfirmation] = useState(false);

  const handleOpenReply = (id: number) => {
    setReplyingTo(id);
    setReplyText("");
  };

  const confirmSubmitReply = () => {
    if (reviewToReplyConfirm === null || !replyText.trim()) return;
    
    // System restricts professionals to exactly one official reply per review
    setReviews(reviews.map(r => r.id === reviewToReplyConfirm ? { ...r, reply: replyText.trim() } : r));
    setReviewToReplyConfirm(null);
    setReplyingTo(null);
    setReplyText("");
    toast.success("Official reply sent and published.");
  };

  const handleCancelReport = () => {
    setReviewToReport(null);
    setReportReason("");
    setShowReportConfirmation(false);
  };

  const confirmSubmitReport = () => {
    if (reviewToReport === null || !reportReason.trim()) return;

    // Send the report to the backend for Admin review
    toast.success("Review reported to Administrators for investigation.");
    setReviewToReport(null);
    setReportReason("");
    setShowReportConfirmation(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage client feedback and submit official replies.</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            4.9 <Star className="w-4 h-4 fill-primary" /> Average
          </div>
        </div>

        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card rounded-xl card-shadow border border-border/50 p-6">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-sm">{r.client}</h3>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{r.event}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-accent text-accent" : "fill-muted text-muted"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{r.date}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!r.reply && replyingTo !== r.id && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleOpenReply(r.id)}>
                      <MessageSquare className="w-3.5 h-3.5" /> Reply
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setReviewToReport(r.id);
                      setReportReason("");
                      setShowReportConfirmation(false);
                    }}
                  >
                    <Flag className="w-3.5 h-3.5" /> Report
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-card-foreground leading-relaxed">"{r.text}"</p>

              {/* Studio Reply Display */}
              {r.reply && (
                <div className="mt-4 bg-muted/40 p-3.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CornerDownRight className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Studio Response</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{r.reply}</p>
                </div>
              )}

              {/* Reply Input Box with Limiter */}
              {replyingTo === r.id && !r.reply && (
                <div className="mt-4 space-y-3 animate-fade-in bg-muted/20 p-4 rounded-lg border border-border/50">
                  <div className="relative">
                    <Textarea 
                      placeholder="Write your official response... (This will be visible publicly)" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={MAX_REPLY_LENGTH}
                      className="resize-none text-sm bg-background pb-8"
                      rows={4}
                    />
                    <div className={`absolute bottom-2 right-3 text-xs font-medium ${replyText.length >= MAX_REPLY_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {replyText.length} / {MAX_REPLY_LENGTH}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    <Button 
                      size="sm" 
                      onClick={() => setReviewToReplyConfirm(r.id)}
                      disabled={!replyText.trim()}
                    >
                      Publish Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Submitting Reply */}
      {reviewToReplyConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Send Official Reply?</h3>
                  <p className="text-sm text-muted-foreground">Confirm your response.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setReviewToReplyConfirm(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm text-muted-foreground">
              <strong>Note:</strong> You can only submit one official reply per review. Please double-check your response, as it will be publicly visible and cannot be edited later.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setReviewToReplyConfirm(null)}>Cancel</Button>
              <Button variant="default" onClick={confirmSubmitReply}>Confirm & Publish</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Report Reason Input */}
      {reviewToReport !== null && !showReportConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Report Review</h3>
                  <p className="text-sm text-muted-foreground">Send this review to Administrators for review.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={handleCancelReport}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-card-foreground">
                Please provide the reason for reporting this review. Administrators will investigate your claim.
              </p>
              <Textarea 
                placeholder="e.g., Fake booking, inappropriate language, harassment..." 
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="resize-none text-sm bg-background"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCancelReport}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowReportConfirmation(true)}
                disabled={!reportReason.trim()}
              >
                Review Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Report Confirmation Modal */}
      {reviewToReport !== null && showReportConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Confirm Report Submission</h3>
                  <p className="text-sm text-muted-foreground">Please double check your report details.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={handleCancelReport}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Are you sure you want to submit this report? Fraudulent reporting may affect your studio's standing.
              </p>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stated Reason:</p>
                <p className="text-card-foreground italic">"{reportReason}"</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowReportConfirmation(false)}>Back</Button>
              <Button 
                variant="destructive" 
                onClick={confirmSubmitReport}
              >
                Confirm & Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}