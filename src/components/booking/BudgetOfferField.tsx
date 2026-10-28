import { useEffect, useState } from "react";
import { ChevronDown, Info, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/data/photographers";
import { cn } from "@/lib/utils";

/** Short hint shown on the first booking step, so clients know about negotiation BEFORE booking. */
export function NegotiationBanner() {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p>
        <span className="font-semibold">Tight budget?</span> You can offer your own price on the last step of this booking.
        The photographer can accept it, suggest an adjusted package that fits, or decline. Nothing changes until you agree to their terms.
      </p>
    </div>
  );
}

interface Props {
  /** Package + selected add-ons, before the platform fee (the number the budget is compared with). */
  subtotal: number;
  platformFee?: number;
  budget: string;
  note: string;
  onBudgetChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}

/**
 * Optional budget offer on the Review step. Collapsed by default so it does not compete with
 * the main action; it opens by itself when the client has typed an amount or the amount is invalid.
 * Leaving it empty books at the listed price.
 */
export function BudgetOfferField({ subtotal, platformFee = 0, budget, note, onBudgetChange, onNoteChange }: Props) {
  const trimmed = budget.trim();
  const value = Number(trimmed);

  let error: string | null = null;
  if (trimmed !== "") {
    if (!Number.isFinite(value) || value <= 0) error = "Enter an amount greater than ₱0.";
    else if (subtotal > 0 && value >= subtotal) error = `Your offer must be lower than ${formatPrice(subtotal)}. To book at the listed price, clear this field.`;
  }

  // The message is sent together with the offer, so it needs a valid amount first.
  const noteLocked = trimmed === "" || !!error;

  const [open, setOpen] = useState(trimmed !== "");
  useEffect(() => { if (error) setOpen(true); }, [error]);

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Wallet className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">Have a different budget? Make an offer (optional)</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {!open && trimmed !== "" && !error && (
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">Offer: {formatPrice(value)}</span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            Your offer covers the whole booking: the package and any add-ons you selected ({formatPrice(subtotal)}).
            The photographer can accept it, counter with a smaller or adjusted package, or decline with a reason. The listed price
            does not change unless you accept their terms, and you pay nothing until then.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="budget-offer" className="text-xs font-semibold">Your budget (before platform fee)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₱</span>
              <input
                id="budget-offer"
                type="number"
                min={1}
                step="any"
                inputMode="decimal"
                value={budget}
                onChange={(e) => onBudgetChange(e.target.value)}
                placeholder="0"
                aria-invalid={!!error}
                className={cn(
                  "flex h-10 w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  error ? "border-destructive" : "border-input"
                )}
              />
            </div>
            {error ? (
              <p className="text-[11px] text-destructive">{error}</p>
            ) : trimmed !== "" ? (
              <p className="text-[11px] text-muted-foreground">
                If the photographer accepts: {formatPrice(value)} + {formatPrice(platformFee)} platform fee = <span className="font-medium text-foreground">{formatPrice(value + platformFee)}</span> to pay.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Must be lower than {formatPrice(subtotal)}. The {formatPrice(platformFee)} platform fee is added on top. Leave empty to book at the listed price.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="budget-note" className="text-xs font-semibold">Message to the photographer (optional)</Label>
              <span className="text-[11px] text-muted-foreground">{note.length}/1000</span>
            </div>
            <Textarea
              id="budget-note"
              value={note}
              maxLength={1000}
              disabled={noteLocked}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={noteLocked ? "Enter your budget above to add a message." : "e.g. I only need coverage for the ceremony."}
              className="min-h-[64px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Sent together with your offer, so the photographer can see why this is your budget.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
