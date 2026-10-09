import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "completed" | "paid" | "cancelled" | "expired" | "no_show";

const statusStyles: Record<Status, string> = {
  pending: "bg-warning/10 text-warning",
  accepted: "bg-warning/10 text-warning",
  confirmed: "bg-secondary/10 text-secondary",
  completed: "bg-success/10 text-success",
  paid: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
  // Expired is a lapsed hold (nobody actively cancelled it), so it gets its
  // own muted/neutral treatment rather than the destructive red used for
  // cancelled/rejected.
  expired: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, nonCompletionReason }: { status: Status; nonCompletionReason?: string | null }) {
  const label =
    status === "no_show" ? "No Show" :
    status === "cancelled" && nonCompletionReason === "photographer_no_show" ? "Not Completed — No-Show" :
    status === "cancelled" && nonCompletionReason === "client_no_show" ? "Not Completed — Client No-Show" :
    status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        label === status ? "capitalize" : "",
        statusStyles[status]
      )}
    >
      {label}
    </span>
  );
}
