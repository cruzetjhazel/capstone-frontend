import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, Check, CheckCircle, FileText, History, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import {
  useNotifications,
  useNotificationActions,
  useUnreadNotificationCount,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notificationService";

const RECENT_LIMIT = 5;

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function NotificationBell({ onDark = false }: { onDark?: boolean }) {
  const { user, role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications(user?.email);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.email);
  const { markRead, markAllRead } = useNotificationActions(user?.email);

  const recent = notifications.slice(0, RECENT_LIMIT);

  const historyPath =
    role === "studio" ? "/studio/notifications" : role === "admin" ? "/admin/notifications" : "/notifications";

  const detailsPath = (bookingId: string) =>
    role === "studio" ? `/studio/bookings/${bookingId}` : `/booking/${bookingId}/details`;

  // Close on outside click, Escape, and navigation
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const markViewed = async (n: AppNotification) => {
    if (n.read) return;
    try {
      await markRead(n.id);
    } catch {
      /* silent */
    }
  };

  const handleOpen = (n: AppNotification) => {
    markViewed(n);
    if (role === "admin" && n.bookingId) {
      setOpen(false);
      navigate(n.title.includes("Dispute") ? "/admin/reports" : "/admin/bookings");
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative w-9 h-9 rounded-full flex items-center justify-center transition-colors",
          onDark
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-card border border-border/60 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h3 className="text-sm font-heading font-bold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> {markingAll ? "Updating…" : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Recent list */}
          <div className="max-h-[26rem] overflow-y-auto divide-y divide-border/40">
            {recent.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">You're all caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No notifications yet.</p>
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30",
                    n.read ? "opacity-60 bg-muted/20 hover:opacity-100" : "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn("text-sm text-foreground truncate", n.read ? "font-medium" : "font-bold")}>
                          {n.title}
                        </h4>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-1.5 font-mono">
                        {formatFullDate(n.createdAt)} • {n.time}
                      </p>

                      {n.bookingId && role !== "admin" && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {n.action === "pay" && role === "client" && (
                            <Link to={`/booking/${n.bookingId}/pay`} onClick={() => setOpen(false)}>
                              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Wallet className="w-3 h-3" /> Pay Now
                              </span>
                            </Link>
                          )}
                          <Link to={detailsPath(n.bookingId)} onClick={() => setOpen(false)}>
                            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted">
                              <FileText className="w-3 h-3" /> View Details
                            </span>
                          </Link>
                        </div>
                      )}
                    </div>

                    <span
                      className={cn("shrink-0 mt-0.5", n.read ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}
                      title={n.read ? "Read" : "Unread"}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            to={historyPath}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-border/40 text-xs font-semibold text-primary hover:bg-muted/40"
          >
            <History className="w-3.5 h-3.5" /> History — view older &amp; filter
          </Link>
        </div>
      )}
    </div>
  );
}