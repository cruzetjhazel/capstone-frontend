import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { usePhotographerBudgetView, useRespondToBudgetRequest } from "@/hooks/useBookingNegotiation";
import type { BudgetInclusion } from "@/services/negotiationService";

const MAX_INCLUSIONS = 15; // keep in sync with BookingBudgetRequest::MAX_INCLUSIONS

const formatWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

/**
 * Photographer side of budget negotiation. Renders nothing when the booking has no budget request.
 * Reads the booking itself (GET /photographer/bookings/{id}) so it does not depend on the
 * list/detail mapping used elsewhere.
 */
export function BudgetResponsePanel({ bookingId }: { bookingId: string | number }) {
  const { data: view } = usePhotographerBudgetView(bookingId);
  const respond = useRespondToBudgetRequest();

  const [mode, setMode] = useState<null | "counter" | "decline">(null);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [inclusions, setInclusions] = useState<BudgetInclusion[]>([{ name: "", details: "" }]);

  const request = view?.budget_request ?? null;
  const actions = view?.budget_actions ?? null;
  const listed = Number(view?.subtotal ?? 0);
  const packageItems = view?.package_snapshot?.included_items;

  // Start the counter from the listed package so "smaller package" is an edit, not a rewrite.
  useEffect(() => {
    if (mode === "counter" && inclusions.length === 1 && !inclusions[0].name && packageItems?.length) {
      setInclusions(packageItems.slice(0, MAX_INCLUSIONS).map((name) => ({ name, details: "" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!request) return null;

  const fail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");

  const send = async (payload: Parameters<typeof respond.mutateAsync>[0]["payload"], success: string) => {
    try {
      await respond.mutateAsync({ bookingId, payload });
      toast.success(success);
      setMode(null);
    } catch (error) {
      fail(error);
    }
  };

  const submitCounter = () => {
    const value = Number(price);
    const cleaned = inclusions
      .map((i) => ({ name: i.name.trim(), details: i.details?.trim() || null }))
      .filter((i) => i.name);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a counter price greater than 0.");
    if (listed > 0 && value > listed) return toast.error(`The counter price cannot be higher than the listed price (${formatPrice(listed)}).`);
    if (cleaned.length === 0) return toast.error("Add at least one inclusion with a name.");
    send({ action: "counter", proposed_price: value, inclusions: cleaned, note: note.trim() || undefined }, "Counter offer sent to the client.");
  };

  const submitDecline = () => {
    if (!reason.trim()) return toast.error("Please give the client a reason.");
    send({ action: "decline", reason: reason.trim() }, "Budget request declined.");
  };

  const shell = "rounded-2xl border p-5 space-y-3";

  if (request.status === "requested" && actions?.can_respond) {
    return (
      <div className={`${shell} border-primary/30 bg-primary/5`}>
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Budget request from {view?.client?.name ?? "the client"}</p>
        </div>
        <div className="text-sm space-y-1">
          <p>Budget: <strong>{formatPrice(request.budget_amount)}</strong> <span className="text-muted-foreground">(before platform fee)</span></p>
          <p className="text-muted-foreground text-xs">Listed price: {formatPrice(listed)}. Nothing changes until the client accepts your terms. You are never required to accept.</p>
          {request.client_note && <p className="text-xs italic text-muted-foreground">“{request.client_note}”</p>}
        </div>

        {mode === null && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={respond.isPending} onClick={() => send({ action: "accept" }, "Budget accepted. The client must confirm before paying.")}>
              {respond.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Accept ${formatPrice(request.budget_amount)}`}
            </Button>
            <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => setMode("counter")}>Counter Offer</Button>
            <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => setMode("decline")}>Decline</Button>
          </div>
        )}

        {mode === "counter" && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Offer a smaller or adjusted package that fits. The client must accept these terms before the booking becomes payable.</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold" htmlFor="counter-price">Your price (before platform fee)</label>
              <input id="counter-price" type="number" min={1} step="any" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder={`Up to ${formatPrice(listed)}`}
                className="w-full text-sm p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Inclusions ({inclusions.length}/{MAX_INCLUSIONS})</p>
              {inclusions.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input value={item.name} maxLength={120} placeholder="e.g. 6 hours coverage"
                    onChange={(e) => setInclusions((list) => list.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                    className="flex-1 text-sm p-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input value={item.details ?? ""} maxLength={500} placeholder="Details (optional)"
                    onChange={(e) => setInclusions((list) => list.map((x, i) => (i === idx ? { ...x, details: e.target.value } : x)))}
                    className="flex-1 text-sm p-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9" disabled={inclusions.length === 1}
                    onClick={() => setInclusions((list) => list.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="gap-1" disabled={inclusions.length >= MAX_INCLUSIONS}
                onClick={() => setInclusions((list) => [...list, { name: "", details: "" }])}>
                <Plus className="w-3.5 h-3.5" /> Add inclusion
              </Button>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Optional note to the client…"
              className="w-full text-sm p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]" />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitCounter} disabled={respond.isPending}>
                {respond.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Counter Offer"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode(null)} disabled={respond.isPending}>Back</Button>
            </div>
          </div>
        )}

        {mode === "decline" && (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            <label className="text-xs font-semibold" htmlFor="decline-reason">Reason for declining <span className="text-destructive">*</span></label>
            <textarea id="decline-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000}
              placeholder="e.g. That is below my minimum for this coverage."
              className="w-full text-sm p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]" />
            <p className="text-[11px] text-muted-foreground">The booking stays pending at the listed price. You can still accept it as is.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={submitDecline} disabled={respond.isPending}>
                {respond.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Decline Budget"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode(null)} disabled={respond.isPending}>Back</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (request.status === "proposed") {
    return (
      <div className={`${shell} border-border bg-card`}>
        <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /><p className="text-sm font-semibold">Waiting for the client</p></div>
        <p className="text-xs text-muted-foreground">
          You offered {formatPrice(request.proposed_price ?? 0)} (+ platform fee = {formatPrice(request.proposed_total ?? 0)}).
          {request.expires_at ? ` The offer expires ${formatWhen(request.expires_at)}.` : ""} You cannot accept this booking at the listed price until the client answers or the offer expires.
        </p>
        {request.inclusions.length > 0 && (
          <ul className="text-xs list-disc pl-5 space-y-0.5">
            {request.inclusions.map((i, idx) => <li key={idx}>{i.name}{i.details ? ` — ${i.details}` : ""}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={`${shell} border-border bg-muted/40`}>
      <p className="text-xs text-muted-foreground">
        Budget request ({formatPrice(request.budget_amount)}): <strong className="capitalize">{request.status}</strong>
        {request.status === "declined" && request.decline_reason ? ` — “${request.decline_reason}”` : ""}.
      </p>
    </div>
  );
}
