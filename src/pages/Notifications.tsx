import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Calendar,
  CreditCard,
  MessageSquare,
  Info,
  Check,
  CheckCircle,
  Wallet,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications, useNotificationActions } from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notificationService";

type NotifType = AppNotification["type"];

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  booking: { icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
  payment: { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  message: { icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  system: { icon: Info, color: "text-amber-500", bg: "bg-amber-500/10" },
};

const filterOptions = ["All", "Booking", "Payment", "Message", "System"] as const;

export default function Notifications() {
  const { user } = useRole();
  const { data: notifications = [], isLoading } = useNotifications(user?.email);
  const { markRead, markAllRead } = useNotificationActions(user?.email);
  const [filter, setFilter] = useState<string>("All");

  const [markAllModalOpen, setMarkAllModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = notifications.filter((n) => filter === "All" || n.type === filter.toLowerCase());
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markRead(id);
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleConfirmMarkAllRead = async () => {
    setIsSubmitting(true);
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
      setMarkAllModalOpen(false);
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-10">

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkAllModalOpen(true)}
              className="gap-1.5 rounded-xl border-border/60 hover:bg-muted"
            >
              <Check className="w-4 h-4 text-primary" /> Mark all as read
            </Button>
          )}
        </div>

        {/* CATEGORY FILTERS */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS LIST CONTAINER */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm divide-y divide-border/40 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading notification feed...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no updates under the "{filter}" category right now.
              </p>
            </div>
          ) : (
            filtered.map((n) => {
              const config = typeConfig[n.type] || typeConfig.system;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30",
                    !n.read && "bg-primary/[0.03]"
                  )}
                >
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs",
                      config.bg
                    )}
                  >
                    <config.icon className={cn("w-5 h-5", config.color)} />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          "text-sm text-foreground",
                          !n.read ? "font-bold" : "font-medium"
                        )}
                      >
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {n.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-2 font-mono">
                      {n.time}
                    </p>

                    {/* Contextual Quick Actions */}
                    {n.bookingId && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {n.action === "pay" && (
                          <Link to={`/booking/${n.bookingId}/pay`}>
                            <Button size="sm" className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                              <Wallet className="w-3.5 h-3.5" /> Pay Deposit / Balance
                            </Button>
                          </Link>
                        )}
                        <Link to={`/booking/${n.bookingId}/details`}>
                          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-lg">
                            <FileText className="w-3.5 h-3.5" /> View Details
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Actions (Mark Read) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: MARK ALL AS READ */}
      <Dialog open={markAllModalOpen} onOpenChange={setMarkAllModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-base">
              <CheckCircle className="w-5 h-5" /> Mark All as Read
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Would you like to clear all unread notification badges in your account history?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkAllModalOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmMarkAllRead}
              disabled={isSubmitting}
              className="rounded-xl text-xs bg-primary text-primary-foreground"
            >
              {isSubmitting ? "Updating..." : "Mark All Read"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}