import { useState } from "react";
import { Link, NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { Bell, Camera, LogOut, User, Menu, X } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { getInitials, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// Client top-nav links. "My Bookings" is intentionally a first-class link here
// (not tucked into the profile dropdown) per the client redesign spec.
const clientLinks = [
  { label: "Home", to: "/dashboard" },
  { label: "Explore", to: "/explore" },
  { label: "My Bookings", to: "/bookings" },
  { label: "About", to: "/about" },
];

export function ClientNavbar() {
  const { user, logout } = useRole();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // NOTE: shape of a notification item (in particular the "unread" field) is
  // assumed here as `read` / `readAt` based on common convention — I don't yet
  // have Notifications.tsx or the useNotifications hook to confirm the exact
  // field name. Adjust the `unreadCount` line below if it differs.
  const { data: notifications = [] } = useNotifications(user?.email) || {};
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: any) => !n.read && !n.readAt).length
    : 0;

  const confirmLogout = async () => {
    try {
      await logout();
      setIsLogoutModalOpen(false);
      navigate("/login");
      toast.success("Successfully logged out. See you next time!");
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 lg:px-8">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight hidden sm:inline">
              SnapBook
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {clientLinks.map((l) => (
              <RouterNavLink
                key={l.to}
                to={l.to}
                end={l.to === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                {l.label}
              </RouterNavLink>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold hover:bg-primary/20 transition-colors overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                  {user?.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.name ?? "Profile"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user?.name)
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-xl">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-semibold leading-none">{user?.name || "Guest"}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />

                {/* Only "My Profile" and "Log Out" live here — no Settings, no My Bookings */}
                <div className="p-1">
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="bg-border/50" />
                <div className="p-1">
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => setIsLogoutModalOpen(true)}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {clientLinks.map((l) => (
                <RouterNavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/dashboard"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )
                  }
                >
                  {l.label}
                </RouterNavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Logout confirmation — same pattern as the old AppSidebar/DashboardHeader */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 m-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-foreground">Log Out</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to log out? You'll need to sign back in to access your account.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
