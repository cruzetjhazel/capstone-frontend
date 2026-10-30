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
import { Pagination, PillTabs, usePagination } from "@/components/ListPagination";
import { useNotifications, useNotificationActions } from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notificationService";

type NotifType = AppNotification["type"];

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  booking: { icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
  payment: { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  message: { icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  system: { icon: Info, color: "text-amber-500", bg: "bg-amber-500/10" },
};

const filterOptions = ["All", "Booking", "Payment", "System"] as const;

const PAGE_SIZE = 8;

type StatusView = "all" | "unread" | "read";

export default function Notifications() {
  const { user, role } = useRole();
  const [limit, setLimit] = useState(50);
  const { data: notifications = [], isLoading, isFetching } = useNotifications(user?.email, limit);
  const canLoadMore = notifications.length >= limit;
  const { markRead, markAllRead } = useNotificationActions(user?.email);
  const [filter, setFilter] = useState<string>("All");
  const [statusView, setStatusView] = useState<StatusView>("all");

  const [markAllModalOpen, setMarkAllModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

  const filtered = notifications.filter(
    (n) =>
      (filter === "All" || n.type === filter.toLowerCase()) &&
      (statusView === "all" || (statusView === "unread" ? !n.read : n.read))
  );

  // Page through the fetched notifications; resets when a filter changes.
  const pager = usePagination(filtered, PAGE_SIZE, `${filter}|${statusView}`);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markRead(id);
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to update notification");
    }
  };

  // Opening a notification (clicking the row or its action buttons) marks it read.
  const markViewed = async (n: AppNotification) => {
    if (n.read) return;
    try {
      await markRead(n.id);
    } catch {
      /* silent — the user can still mark it manually */
    }
  };

  // Clients and photographers have different booking-details routes.
  const detailsPath = (bookingId: string) =>
    role === "studio" ? `/studio/bookings/${bookingId}` : `/booking/${bookingId}/details`;

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
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-up pb-8">

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

        {/* STATUS TABS + CATEGORY FILTERS */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
        <PillTabs<StatusView>
          value={statusView}
          onChange={setStatusView}
          tabs={[
            { key: "all", label: "All", count: notifications.length },
            { key: "unread", label: "Unread", count: unreadCount },
            { key: "read", label: "Read", count: readCount },
          ]}
        />
        <div className="flex gap-1.5 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-semibold transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        </div>

        {/* NOTIFICATIONS LIST CONTAINER */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm divide-y divide-border/40 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading notification feed...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no {statusView === "all" ? "" : `${statusView} `}updates under the "{filter}" category right now.
              </p>
            </div>
          ) : (
            pager.pageItems.map((n) => {
              const config = typeConfig[n.type] || typeConfig.system;
              return (
                <div
                  key={n.id}
                  onClick={() => markViewed(n)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/30",
                    n.read ? "opacity-60 bg-muted/20 hover:opacity-100" : "bg-primary/[0.03]"
                  )}
                >
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs",
                      config.bg
                    )}
                  >
                    <config.icon className={cn("w-4 h-4", config.color)} />
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
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">
                      {n.time}
                    </p>

                    {/* Contextual Quick Actions */}
                    {n.bookingId && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {n.action === "pay" && role === "client" && (
                          <Link to={`/booking/${n.bookingId}/pay`}>
                            <Button size="sm" className="gap-1.5 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                              <Wallet className="w-3.5 h-3.5" /> Pay Deposit / Balance
                            </Button>
                          </Link>
                        )}
                        <Link to={role === "admin" ? (n.title.includes("Dispute") ? "/admin/reports" : "/admin/bookings") : detailsPath(n.bookingId)}>
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs rounded-lg">
                            <FileText className="w-3.5 h-3.5" /> View Details
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Actions (Mark Read) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {n.read ? (
                      <span
                        className="w-8 h-8 flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                        title="Read"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleMarkAsRead(e, n.id)}
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

        {!isLoading && (
          <Pagination
            pagination={pager}
            extra={
              canLoadMore && pager.page === pager.totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit((l) => l + 50)}
                  disabled={isFetching}
                  className="rounded-xl text-xs h-8"
                >
                  {isFetching ? "Loading…" : "Load older notifications"}
                </Button>
              ) : undefined
            }
          />
        )}
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