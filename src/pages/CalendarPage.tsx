import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingSlot {
  day: number;
  title: string;
  time: string;
  status: "confirmed" | "pending";
}

const bookings: BookingSlot[] = [
  { day: 3, title: "Wedding — Marcus R.", time: "2:00 PM", status: "confirmed" },
  { day: 7, title: "Portrait — Anya P.", time: "10:00 AM", status: "pending" },
  { day: 12, title: "Corporate — Leo C.", time: "9:00 AM", status: "confirmed" },
  { day: 15, title: "Engagement — Sofia M.", time: "4:00 PM", status: "pending" },
  { day: 22, title: "Product Shoot — James O.", time: "11:00 AM", status: "confirmed" },
];

const unavailable = [5, 6, 13, 14, 20, 21, 27, 28]; // weekends

export default function CalendarPage() {
  const [month] = useState(new Date(2026, 2)); // March 2026
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const monthName = month.toLocaleString("default", { month: "long", year: "numeric" });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium px-3">{monthName}</span>
            <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-3 text-xs font-medium text-muted-foreground text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="min-h-[100px] border-b border-r border-border bg-muted/30" />
            ))}
            {days.map((day) => {
              const booking = bookings.find((b) => b.day === day);
              const isUnavailable = unavailable.includes(day);
              const isToday = day === 21;

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[100px] border-b border-r border-border p-2 transition-colors",
                    isUnavailable && "bg-muted/40",
                    isToday && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                      isUnavailable && "text-muted-foreground/50"
                    )}
                  >
                    {day}
                  </span>
                  {booking && (
                    <div
                      className={cn(
                        "mt-1 px-2 py-1 rounded-md text-xs truncate",
                        booking.status === "confirmed"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      <p className="font-medium truncate">{booking.title}</p>
                      <p className="opacity-70">{booking.time}</p>
                    </div>
                  )}
                  {isUnavailable && !booking && (
                    <p className="text-[10px] text-muted-foreground/40 mt-1">Unavailable</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-primary/10 border border-primary/20" /> Confirmed
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-warning/10 border border-warning/20" /> Pending
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-muted/40 border border-border" /> Unavailable
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
