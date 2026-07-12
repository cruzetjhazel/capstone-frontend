import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "completed" | "paid" | "cancelled";

const statusStyles: Record<Status, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-secondary/10 text-secondary",
  completed: "bg-success/10 text-success",
  paid: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
