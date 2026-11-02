import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Circle, ArrowRight, X, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompletenessItem, CompletenessKey, ProfileCompleteness } from "@/services/photographerProfileService";

/** Where each requirement is fixed. `anchor` is the element id on that page to scroll to. */
const TARGETS: Record<CompletenessKey, { path: string; anchor?: string; action: string }> = {
  verified_email: { path: "/studio/settings", anchor: "account-email", action: "Verify" },
  bio: { path: "/studio/settings", anchor: "bio", action: "Add bio" },
  style: { path: "/studio/settings", anchor: "styles", action: "Pick styles" },
  social_link: { path: "/studio/settings", anchor: "social-links", action: "Add link" },
  profile_photo: { path: "/studio/settings", anchor: "profile-photo", action: "Upload" },
  cover_photo: { path: "/studio/settings", anchor: "cover-photo", action: "Upload" },
  gcash_account_name: { path: "/studio/settings", anchor: "gcash", action: "Add name" },
  gcash_account_number: { path: "/studio/settings", anchor: "gcash", action: "Add number" },
  active_package: { path: "/studio/packages", action: "Add package" },
  portfolio_photos: { path: "/studio/portfolio", action: "Upload" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  data: ProfileCompleteness;
}

export function ProfileCompletenessModal({ open, onClose, data }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const incomplete = data.items.filter((i) => !i.complete);
  const allDone = incomplete.length === 0;

  const go = (item: CompletenessItem) => {
    const target = TARGETS[item.key];
    onClose();
    navigate(target.anchor ? `${target.path}#${target.anchor}` : target.path);
    // Already on that page: the route doesn't remount, so scroll directly.
    if (target.anchor) {
      window.setTimeout(() => {
        document.getElementById(target.anchor!)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completeness-title"
    >
      <div
        className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="profile-completeness-title" className="text-lg font-heading font-bold">
                {allDone ? "You're all set" : "Complete your profile"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {allDone
                  ? "Your studio is complete and clients can book you."
                  : "Clients can't find or book you in Explore until every item below is done. Fill them in whenever you're ready."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span>{data.completedCount}/{data.totalCount} completed</span>
              <span className="text-muted-foreground">{data.percentage}%</span>
            </div>
            <div
              className="h-2 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={data.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="px-6 space-y-1.5">
          {data.items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                item.complete ? "border-border/40 bg-muted/20" : "border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  item.complete ? "bg-primary text-primary-foreground" : "border-2 border-amber-400 text-transparent"
                )}
              >
                {item.complete ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.complete && "text-muted-foreground line-through decoration-1")}>
                  {item.label}
                </p>
                {!item.complete && item.detail && (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                )}
              </div>
              {!item.complete && (
                <Button type="button" size="sm" variant="outline" className="shrink-0 h-8 text-xs gap-1" onClick={() => go(item)}>
                  {TARGETS[item.key].action} <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        <div className="p-6 pt-5 flex flex-col gap-2">
          {allDone ? (
            <Button onClick={onClose} className="w-full gap-2">
              <PartyPopper className="w-4 h-4" /> Done
            </Button>
          ) : (
            <>
              <Button onClick={() => go(incomplete[0])} className="w-full">
                Complete Profile
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Remind me later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
