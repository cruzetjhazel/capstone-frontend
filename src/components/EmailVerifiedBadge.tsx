import { BadgeCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmailVerifiedBadge({
  verified,
  className,
}: {
  verified?: boolean | null;
  className?: string;
}) {
  if (verified === undefined || verified === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        verified
          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
        className
      )}
    >
      {verified ? <BadgeCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {verified ? "Email verified" : "Not verified"}
    </span>
  );
}