import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcceptSlotOffer, useDeclineSlotOffer } from "@/hooks/useBookingNegotiation";

const formatDeadline = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

/**
 * Client side of a released-slot offer. The client must ACCEPT the offer before they can pay;
 * they can also decline it (the slot then goes to the next waitlisted client).
 */
export function SlotOfferCard({ booking }: { booking: any }) {
  const accept = useAcceptSlotOffer();
  const decline = useDeclineSlotOffer();
  const [confirmDecline, setConfirmDecline] = useState(false);

  const canAccept = !!booking.canAcceptSlotOffer;
  const canDecline = !!booking.canDeclineSlotOffer;
  if (!canAccept && !canDecline) return null;

  const busy = accept.isPending || decline.isPending;
  const deadline = formatDeadline(booking.slotOfferDeadline ?? booking.holdExpiresAt);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      setConfirmDecline(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <CalendarCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {canAccept ? "The schedule you were waiting for is available" : "You accepted this offer"}
          </p>
          <p className="text-xs text-muted-foreground">
            {canAccept
              ? `Accept the offer to reserve the chance to pay for this schedule${deadline ? ` — respond before ${deadline}` : ""}. Payment opens after you accept, and the time is only yours once your payment is verified.`
              : `Complete your payment${deadline ? ` before ${deadline}` : " before the deadline"}. If you no longer want this schedule, you can decline it.`}
          </p>
        </div>
      </div>

      {!confirmDecline ? (
        <div className="flex flex-wrap gap-2">
          {canAccept && (
            <Button size="sm" disabled={busy} onClick={() => run(() => accept.mutateAsync(String(booking.id)), "Offer accepted. You can now pay.")}>
              {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Accept Offer"}
            </Button>
          )}
          {canDecline && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDecline(true)}>
              Decline Offer
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Decline this schedule? Your booking goes back to the waitlist and the slot is offered to the next client. You will not be offered it again automatically.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => run(() => decline.mutateAsync(String(booking.id)), "Offer declined.")}>
              {decline.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, Decline"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDecline(false)}>
              Keep Offer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
