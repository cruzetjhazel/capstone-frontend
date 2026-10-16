import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { useAcceptBudgetTerms, useRejectBudgetTerms, useSendBudgetRequest } from "@/hooks/useBookingNegotiation";
import type { BudgetActions, BudgetRequestInfo } from "@/services/negotiationService";

const formatWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

/**
 * Client side of budget negotiation, shown on a booking's details page:
 * send a budget (Pending bookings only), see the photographer's answer, accept or reject the
 * proposed terms. Nothing is discounted automatically: the price only changes when the client
 * accepts the photographer's terms.
 */
export function BudgetRequestPanel({ booking }: { booking: any }) {
  const request: BudgetRequestInfo | null = booking.budgetRequest ?? null;
  const actions: BudgetActions | null = booking.budgetActions ?? null;

  const send = useSendBudgetRequest();
  const accept = useAcceptBudgetTerms();
  const reject = useRejectBudgetTerms();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const listed = Number(booking.subtotal ?? booking.packagePrice ?? 0);
  const canRequest = !!actions?.can_request;

  if (!request && !canRequest) return null;

  const fail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a budget greater than 0.");
    if (listed > 0 && value >= listed) return toast.error("Your budget must be lower than the package price. Book at the listed price instead.");
    try {
      await send.mutateAsync({ bookingId: booking.id, amount: value, note });
      toast.success("Your budget was sent to the photographer.");
      setShowForm(false);
      setAmount("");
      setNote("");
    } catch (error) {
      fail(error);
    }
  };

  const budgetForm = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground" htmlFor="budget-amount">
          Your budget (before platform fee)
        </label>
        <input
          id="budget-amount"
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={listed > 0 ? `Lower than ${formatPrice(listed)}` : "Amount in PHP"}
          className="w-full text-sm p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-[11px] text-muted-foreground">
          The platform fee is added on top of whatever price is agreed. The photographer can accept your budget, offer adjusted terms, or decline. Nothing is discounted unless you accept their terms.
        </p>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        placeholder="Optional note to the photographer…"
        className="w-full text-sm p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={send.isPending}>
          {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Budget"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm(false)} disabled={send.isPending}>Cancel</Button>
      </div>
    </div>
  );

  const header = (
    <div className="flex items-center gap-2">
      <Wallet className="w-4 h-4 text-primary" />
      <p className="text-sm font-semibold">Budget request</p>
    </div>
  );

  // Photographer sent terms: the client decides.
  if (request?.status === "proposed") {
    const fee = request.proposed_total != null && request.proposed_price != null ? request.proposed_total - request.proposed_price : 0;
    const expired = !actions?.can_answer_terms;
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        {header}
        <p className="text-xs text-muted-foreground">
          Listed price {formatPrice(listed)} · your budget {formatPrice(request.budget_amount)}
        </p>
        <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-sm">
          <p className="font-semibold">Photographer's terms</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span>{formatPrice(request.proposed_price ?? 0)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span>{formatPrice(fee)}</span></div>
          <div className="flex justify-between font-semibold border-t border-border pt-2"><span>Total to pay</span><span className="text-primary">{formatPrice(request.proposed_total ?? 0)}</span></div>
          {request.inclusions.length > 0 ? (
            <ul className="space-y-1 pt-1">
              {request.inclusions.map((i, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><span className="font-medium">{i.name}</span>{i.details ? <span className="text-muted-foreground"> — {i.details}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Same package and inclusions as listed.</p>
          )}
          {request.photographer_note && <p className="text-xs italic text-muted-foreground">“{request.photographer_note}”</p>}
        </div>
        {expired ? (
          <p className="text-xs text-destructive">These terms have expired.</p>
        ) : (
          <>
            {request.expires_at && <p className="text-[11px] text-muted-foreground">Respond before {formatWhen(request.expires_at)}. Your booking stays unpaid until you accept.</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={accept.isPending || reject.isPending}
                onClick={async () => {
                  try { await accept.mutateAsync(booking.id); toast.success("Terms accepted."); } catch (e) { fail(e); }
                }}
              >
                {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Accept Terms"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={accept.isPending || reject.isPending}
                onClick={async () => {
                  try { await reject.mutateAsync(booking.id); toast.success("You turned down these terms."); } catch (e) { fail(e); }
                }}
              >
                {reject.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reject Terms"}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Sent, waiting for the photographer.
  if (request?.status === "requested") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        {header}
        <p className="text-xs text-muted-foreground">
          You offered {formatPrice(request.budget_amount)} (before platform fee). Waiting for the photographer to respond. Your booking is still at the listed price {formatPrice(listed)}.
        </p>
      </div>
    );
  }

  // Closed request (declined / rejected / expired / accepted ...) and maybe a new one.
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      {header}
      {request?.status === "declined" && (
        <p className="text-xs text-muted-foreground">
          The photographer declined your budget of {formatPrice(request.budget_amount)}{request.decline_reason ? `: “${request.decline_reason}”` : "."} The booking is still pending at the listed price.
        </p>
      )}
      {request?.status === "rejected" && (
        <p className="text-xs text-muted-foreground">You turned down the photographer's terms. The booking is still pending at the listed price.</p>
      )}
      {request?.status === "accepted" && (
        <p className="text-xs text-muted-foreground">You accepted the negotiated terms ({formatPrice(request.proposed_price ?? 0)} plus platform fee).</p>
      )}
      {(request?.status === "expired" || request?.status === "withdrawn" || request?.status === "superseded") && (
        <p className="text-xs text-muted-foreground">Your last budget request is closed.</p>
      )}

      {canRequest && !showForm && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Can't afford the listed price of {formatPrice(listed)}? Tell the photographer your budget instead of cancelling.
            {actions ? ` You can send ${actions.requests_remaining} more request${actions.requests_remaining === 1 ? "" : "s"} for this booking.` : ""}
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            {request ? "Send a New Budget" : "Send My Budget"}
          </Button>
        </div>
      )}
      {canRequest && showForm && budgetForm}
    </div>
  );
}
