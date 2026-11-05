import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string; // e.g. "bg-blue-500/10 text-blue-600"
  subtext?: string; // shown as tooltip
  description?: string; // one line: what the card counts
  scope?: string; // badge: "all time", "jan–dec 2026", "current snapshot"
  change?: { text: string; up: boolean }; // optional comparison row
};

export function AdminStatCard({ label, value, icon: Icon, color, subtext, description, scope, change }: AdminStatCardProps) {
  return (
    <div
      className="bg-card rounded-xl border border-border/50 hover:border-border transition-colors px-5 py-3.5 min-w-0"
      title={subtext}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground truncate flex-1">{label}</p>
        <p className="text-xl font-bold tracking-tight tabular-nums pr-1.5">{value}</p>
      </div>

      {(description || scope) && (
        <div classname="mt-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          {description && <p classname="text-[11px] leading-snug text-muted-foreground">{description}</p>}
          {scope && (
            <span classname="shrink-0 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {scope}
            </span>
          )}
        </div>
      )}

      {change && (
        <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-border/40 text-[11px] font-medium">
          <TrendingUp className={cn("w-3.5 h-3.5 shrink-0", change.up ? "text-emerald-500" : "text-red-500 rotate-180")} />
          <span className={cn("truncate", change.up ? "text-emerald-600" : "text-red-500")}>{change.text}</span>
        </div>
      )}
    </div>
  );
}