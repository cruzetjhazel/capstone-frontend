import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackingStages, type TrackingStage } from "@/data/photographers";

interface BookingTrackerProps {
  currentStage: TrackingStage | undefined;
  compact?: boolean;
}

/**
 * horizontal progress tracker.
 * Renders whatever stages are in `trackingStages` (currently Confirmed & Paid →
 * Event Day → Editing → Delivered). Pass `currentStage={undefined}` to show no
 * stage as active yet (e.g. before payment is confirmed).
 */
export function BookingTracker({ currentStage, compact = false }: BookingTrackerProps) {
  const currentIdx = trackingStages.findIndex((s) => s.id === currentStage);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {trackingStages.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={stage.id} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={cn(
                    "absolute top-3 right-1/2 w-full h-0.5 -z-0",
                    i <= currentIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                  done && "bg-primary border-primary text-primary-foreground",
                  active && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
                  !done && !active && "bg-card border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {!compact && (
                <p className={cn(
                  "text-[10px] mt-2 text-center leading-tight",
                  active ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {stage.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!compact && currentIdx >= 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          {trackingStages[currentIdx].description}
        </p>
      )}
    </div>
  );
}
