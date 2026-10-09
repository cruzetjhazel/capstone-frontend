import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TrailPayment = {
  createdAt: string;
  matchingStatus: string;
  verifiedAt: string | null;
  verifiedByName: string | null;
};

type Step = { Icon: typeof Clock; label: string; detail: string; state: "done" | "active" | "ok" | "bad" };

const COLORS: Record<Step["state"], string> = {
  done: "text-muted-foreground",
  active: "text-amber-500",
  ok: "text-emerald-500",
  bad: "text-red-500",
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "";

/** Read-only verification trail: Submitted → Awaiting photographer → Verified / Rejected. */
export function PaymentTrail({ payment }: { payment: TrailPayment }) {
  const verified = payment.matchingStatus === "matched" || payment.matchingStatus === "manually_verified";
  const rejected = payment.matchingStatus === "rejected";
  const decided = verified || rejected;

  const who = payment.verifiedByName
    ? `by ${payment.verifiedByName}${payment.verifiedAt ? ` · ${fmt(payment.verifiedAt)}` : ""}`
    : payment.matchingStatus === "matched"
    ? `Automatic match (legacy)${payment.verifiedAt ? ` · ${fmt(payment.verifiedAt)}` : ""}`
    : fmt(payment.verifiedAt);

  const steps: Step[] = [
    { Icon: FileText, label: "Payment submitted", detail: fmt(payment.createdAt), state: "done" },
    {
      Icon: Clock,
      label: "Awaiting photographer confirmation",
      detail: "",
      state: decided ? "done" : "active",
    },
  ];
  if (verified) steps.push({ Icon: CheckCircle2, label: "Verified", detail: who, state: "ok" });
  if (rejected) steps.push({ Icon: XCircle, label: "Rejected", detail: who, state: "bad" });

  return (
    <ol className="mt-2 space-y-1">
      {steps.map((s) => (
        <li key={s.label} className="flex items-start gap-1.5 text-[11px]">
          <s.Icon className={cn("w-3 h-3 mt-0.5 shrink-0", COLORS[s.state])} />
          <span>
            <span className="font-medium text-foreground">{s.label}</span>
            {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}