import { Check, Clock, Camera, Wand2, PackageCheck, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Single source of truth for the client-facing Service Progress tracker.
// Used by ClientMyBookings and ClientBookingDetails so both pages always look
// and behave the same. "confirmed_paid" is a frontend-only display stage
// (service_status is still null); the rest map to ServiceTrackerStatus.
export const SERVICE_PROGRESS_STEPS: {
  id: "confirmed_paid" | "upcoming" | "event_day" | "editing" | "delivered" | "completed";
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: "confirmed_paid", label: "Confirmed & Paid", description: "Your booking is confirmed and payment is settled", icon: CheckCircle2 },
  { id: "upcoming", label: "Upcoming", description: "Waiting for your event date to arrive", icon: Clock },
  { id: "event_day", label: "Event Day", description: "It's photoshoot day!", icon: Camera },
  { id: "editing", label: "Editing", description: "Photos are currently being processed", icon: Wand2 },
  { id: "delivered", label: "Delivered", description: "All files have been delivered", icon: PackageCheck },
  { id: "completed", label: "Completed", description: "This booking is concluded", icon: CheckCircle2 },
];

export function getCurrentStepIndex(b: any): number {
  if (b.status === "completed" || b.serviceStatus === "completed") return 5;
  if (b.serviceStatus === "delivered") return 4;
  if (b.serviceStatus === "editing") return 3;
  if (b.serviceStatus === "event_day") return 2;
  if (b.serviceStatus === "upcoming") return 1;
  if (b.status === "confirmed" && (b.paymentStatus === "partially_paid" || b.paymentStatus === "fully_paid")) return 0;
  return -1;
}

export function ServiceProgressTracker({ booking }: { booking: any }) {
  const currentStep = getCurrentStepIndex(booking);
  const lastIdx = SERVICE_PROGRESS_STEPS.length - 1;

  return (
    <div className="relative w-full overflow-x-auto pt-2">
      <div className="flex items-start w-full min-w-[520px] sm:min-w-0">
        {SERVICE_PROGRESS_STEPS.map((step, idx) => {
        const isCurrent = idx === currentStep;
        const isCompleted = idx < currentStep || (isCurrent && (idx === lastIdx || step.id === "delivered"));
        const isActive = isCurrent && !isCompleted;
        // A line is filled only if it leads into a status that has been reached,
        // so it stops at the current status and never extends to the next one.
        const lineFilled = currentStep >= 0 && idx < currentStep;
        const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex flex-col items-center gap-1.5 flex-1">
              {/* Connector: runs from this circle's centre to the next one's */}
              {idx < lastIdx && (
                <div className="absolute top-4 left-1/2 w-full h-[2px] -translate-y-1/2 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-primary rounded-full transition-all duration-700",
                      lineFilled ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}

              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shrink-0",
                  isCompleted ? "border-primary bg-primary text-primary-foreground" :
                  isActive ? "border-primary bg-card text-primary ring-4 ring-primary/15" :
                  "border-border bg-card text-muted-foreground/40"
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
              </div>

              <span
                className={cn(
                  "text-[10px] text-center leading-tight px-0.5",
                  isCurrent ? "text-foreground font-bold" : isCompleted ? "text-foreground/70 font-medium" : "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
