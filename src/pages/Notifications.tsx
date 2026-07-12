import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Bell, Calendar, CreditCard, MessageSquare, Info, Check, CheckCircle, Trash2, Wallet, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications, useNotificationActions } from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notificationService";

type NotifType = AppNotification["type"];

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  booking: { icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
  payment: { icon: CreditCard, color: "text-accent", bg: "bg-accent/10" },
  message: { icon: MessageSquare, color: "text-secondary", bg: "bg-secondary/10" },
  system: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

const filterOptions = ["All", "Booking", "Payment", "Message", "System"] as const;

export default function Notifications() {
  const { user } = useRole();
  const { data: notifications = [], isLoading } = useNotifications(user?.email);
  const { markRead, markAllRead, delete: deleteNotif } = useNotificationActions(user?.email);
  const [filter, setFilter] = useState<string>("All");

  const filtered = notifications.filter((n) => filter === "All" || n.type === filter.toLowerCase());
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()} className="gap-1.5">
              <Check className="w-4 h-4" /> Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border/50 divide-y divide-border overflow-hidden">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading notifications…</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications in this category</p>
            </div>
          ) : (
            filtered.map((n) => {
              const config = typeConfig[n.type];
              return (
                <div key={n.id} className={cn("flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30", !n.read && "bg-primary/[0.02]")}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                    <config.icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={cn("text-sm font-medium", !n.read && "font-semibold")}>{n.title}</h4>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{n.time}</p>
                    {n.bookingId && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {n.action === "pay" && (
                          <Link to={`/booking/${n.bookingId}/pay`}>
                            <Button size="sm" className="gap-1.5 h-8"><Wallet className="w-3.5 h-3.5" /> Pay Balance</Button>
                          </Link>
                        )}
                        <Link to={`/booking/${n.bookingId}/details`}>
                          <Button size="sm" variant="outline" className="gap-1.5 h-8"><FileText className="w-3.5 h-3.5" /> View Request Details</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <button onClick={() => void markRead(n.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Mark as read">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => void deleteNotif(n.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
