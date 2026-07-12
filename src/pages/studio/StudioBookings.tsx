import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { BookingTracker } from "@/components/BookingTracker";
import { Check, X, ChevronDown } from "lucide-react";
import { trackingStages, type TrackingStage } from "@/data/photographers";
import { cn } from "@/lib/utils";

interface StudioBooking {
  id: string;
  client: string;
  event: string;
  date: string;
  startTime: string;
  package: string;
  amount: number;
  stage: TrackingStage | "pending";
}

const initial: StudioBooking[] = [
  { id: "BK-001", client: "Emily Watson", event: "Wedding",    date: "Mar 28, 2026", startTime: "2:00 PM",  package: "Premium",  amount: 15000, stage: "pending" },
  { id: "BK-002", client: "David Kim",     event: "Engagement", date: "Apr 2, 2026",  startTime: "4:00 PM",  package: "Standard", amount: 7000,  stage: "pending" },
  { id: "BK-003", client: "Sarah Chen",    event: "Corporate",  date: "Apr 5, 2026",  startTime: "9:00 AM",  package: "Premium",  amount: 15000, stage: "confirmed" },
  { id: "BK-004", client: "Tom Brennan",   event: "Portrait",   date: "Apr 8, 2026",  startTime: "11:00 AM", package: "Basic",    amount: 3000,  stage: "event_day" },
  { id: "BK-005", client: "Mia Lopez",     event: "Birthday",   date: "Apr 12, 2026", startTime: "3:00 PM",  package: "Standard", amount: 7000,  stage: "editing" },
];

export default function StudioBookings() {
  const [bookings, setBookings] = useState(initial);
  const [filter, setFilter] = useState<"All" | "Pending" | "Active" | "Delivered">("All");

  const filtered = bookings.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Pending") return b.stage === "pending";
    if (filter === "Delivered") return b.stage === "delivered";
    return b.stage !== "pending" && b.stage !== "delivered";
  });

  const accept = (id: string) =>
    setBookings(bookings.map((b) => b.id === id ? { ...b, stage: "confirmed" } : b));
  const reject = (id: string) =>
    setBookings(bookings.filter((b) => b.id !== id));
  const advance = (id: string, stage: TrackingStage) =>
    setBookings(bookings.map((b) => b.id === id ? { ...b, stage } : b));

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage requests and track each session's progress.</p>
          </div>
          <div className="flex gap-2">
            {(["All", "Pending", "Active", "Delivered"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((b) => (
            <div key={b.id} className="bg-card rounded-2xl card-shadow border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm">
                    {b.client.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{b.client} <span className="text-xs text-muted-foreground font-mono ml-1">{b.id}</span></p>
                    <p className="text-xs text-muted-foreground">{b.event} · {b.package} · {b.date} {b.startTime}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-heading font-bold text-primary">₱{b.amount.toLocaleString()}</p>
                </div>
              </div>

              {b.stage === "pending" ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm">Awaiting your response to this new request.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => reject(b.id)}>
                      <X className="w-4 h-4" /> Decline
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => accept(b.id)}>
                      <Check className="w-4 h-4" /> Accept
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <BookingTracker currentStage={b.stage as TrackingStage} />
                  <div className="flex items-center justify-end mt-4 gap-2">
                    <Label>Update status:</Label>
                    <select
                      value={b.stage}
                      onChange={(e) => advance(b.id, e.target.value as TrackingStage)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {trackingStages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No bookings in this view.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
