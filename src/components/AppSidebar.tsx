import { useState, useEffect } from "react";
import { 
  Camera, Loader2, LayoutDashboard, CalendarDays, CreditCard, 
  Settings, BarChart3, FolderOpen, LogOut, Search, ImageIcon, 
  ShieldCheck, Sparkles, Star, Heart, Users, Trash2, ShieldAlert,
  AlertTriangle, ClipboardList, Compass, HelpCircle, ChevronDown, X
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { cn, getInitials } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import toast from "react-hot-toast"; 

interface NavItem {
  label: string;
  icon: any;
  to: string;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

// ----------------------------------------------------
// CLIENT WORKSPACE NAVIGATION (CATEGORIZED)
// ----------------------------------------------------
const clientNav: NavCategory[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
      { label: "Find a Photographer", icon: Compass, to: "/explore" },
      { label: "My Bookings", icon: FolderOpen, to: "/bookings" },
    ]
  },
  {
    title: "PERSONAL",
    items: [
      { label: "Favorites", icon: Heart, to: "/favorites" },
      { label: "Reviews", icon: Star, to: "/reviews" },
      { label: "Payments", icon: CreditCard, to: "/payments" },
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", icon: Settings, to: "/profile" },
    ]
  },
  {
    title: "SUPPORT",
    items: [
      { label: "Help / Report a Problem", icon: HelpCircle, to: "/report-problem" },
    ]
  }
];

// ----------------------------------------------------
// STUDIO / FREELANCER WORKSPACE NAVIGATION (CATEGORIZED)
// ----------------------------------------------------
const studioNav: NavCategory[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/studio" },
      { label: "Calendar", icon: CalendarDays, to: "/studio/calendar" },
      { label: "Bookings", icon: FolderOpen, to: "/studio/bookings" },
    ]
  },
  {
    title: "STUDIO",
    items: [
      { label: "Clients (CRM)", icon: Users, to: "/studio/clients" },
      { label: "Packages", icon: Sparkles, to: "/studio/packages" },
      { label: "Portfolio Showcase", icon: ImageIcon, to: "/studio/portfolio" },
    ]
  },
  {
    title: "FINANCE & INSIGHTS",
    items: [
      { label: "Earnings", icon: CreditCard, to: "/studio/earnings" },
      { label: "Reviews", icon: Star, to: "/studio/reviews" },
      { label: "Analytics", icon: BarChart3, to: "/studio/analytics" },
    ]
  },
  {
    title: "SYSTEM & UTILITIES",
    items: [
      { label: "Safe Archive", icon: Trash2, to: "/studio/archive" },
      { label: "Activity Logs", icon: ShieldAlert, to: "/studio/logs" },
      { label: "Settings", icon: Settings, to: "/studio/settings" },
      { label: "My Reports", icon: ClipboardList, to: "/studio/reports" },
    ]
  }
];

// ----------------------------------------------------
// PLATFORM ADMIN NAVIGATION (CATEGORIZED)
// ----------------------------------------------------
const adminNav: NavCategory[] = [
  {
    title: "PLATFORM CONTROL",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
      { label: "Users", icon: Users, to: "/admin/users" },
      { label: "Verifications", icon: ShieldCheck, to: "/admin/verifications" },
      { label: "Reports & Disputes", icon: AlertTriangle, to: "/admin/reports" },
    ]
  },
  {
    title: "TRANSACTIONS & AUDITS",
    items: [
      { label: "All Bookings", icon: CalendarDays, to: "/admin/bookings" },
      { label: "Payments", icon: CreditCard, to: "/admin/payments" },
    ]
  },
  {
    title: "SYSTEM & UTILITIES",
    items: [
      { label: "Global Archive", icon: Trash2, to: "/admin/archive" },
      { label: "System Logs", icon: ShieldAlert, to: "/admin/logs" },
    ]
  },
  {
    title: "SETTINGS & ANALYTICS",
    items: [
      { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
      { label: "Settings", icon: Settings, to: "/admin/settings" },
    ]
  }
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const { user, role, logout } = useRole();
  const navigate = useNavigate();
  
  // State to control modal visibility
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const navCategories = role === "admin" ? adminNav : role === "studio" ? studioNav : clientNav;

  const confirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const toastId = toast.loading("Logging out…");

    try {
      await logout();
      toast.success("Successfully logged out. See you next time!", { id: toastId });
      setIsLogoutModalOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Failed to sign out. Please try again.", { id: toastId });
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card shrink-0",
          "transition-transform duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between gap-2.5 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight">SnapBook</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Categorized Navigation Menu Group */}
                <nav className="flex-1 min-h-0 px-3 pt-3 pb-2 space-y-2.5 overflow-y-auto scrollbar-none">
          {navCategories.map((category) => (
            <div key={category.title} className="space-y-0.5">
              <p className="px-3 text-[10px] leading-4 font-bold text-muted-foreground/60 tracking-wider">
                {category.title}
              </p>

              <div className="space-y-0.5">
                {category.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard" || item.to === "/studio" || item.to === "/admin"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.name || "Guest"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 m-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-foreground">Sign Out</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to sign out? You will need to log back in to access your dashboard.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing out…
                  </>
                ) : (
                  "Sign Out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}