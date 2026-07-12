import { Camera, LayoutDashboard, CalendarDays, CreditCard, Bell, Users, Settings, BarChart3, FolderOpen, LogOut, ImageIcon, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole, getRoleLabel } from "@/contexts/RoleContext";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
}

const clientNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Photographers", icon: Users, to: "/photographers" },
  { label: "My Bookings", icon: CalendarDays, to: "/calendar" },
  { label: "Payments", icon: CreditCard, to: "/payments" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
];

const studioNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/studio" },
  { label: "Calendar", icon: CalendarDays, to: "/studio/calendar" },
  { label: "Bookings", icon: FolderOpen, to: "/studio/bookings" },
  { label: "Portfolio", icon: ImageIcon, to: "/studio/portfolio" },
  { label: "Earnings", icon: CreditCard, to: "/studio/earnings" },
  { label: "Analytics", icon: BarChart3, to: "/studio/analytics" },
  { label: "Settings", icon: Settings, to: "/studio/settings" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  { label: "Users", icon: Users, to: "/admin/users" },
  { label: "Verifications", icon: ShieldCheck, to: "/admin/verifications" },
  { label: "Featured Studios", icon: Sparkles, to: "/admin/featured" },
  { label: "All Bookings", icon: CalendarDays, to: "/admin/bookings" },
  { label: "Payments", icon: CreditCard, to: "/admin/payments" },
  { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
  { label: "Settings", icon: Settings, to: "/admin/settings" },
];

export function AppSidebar() {
  const { user, role, logout } = useRole();
  const navigate = useNavigate();

  const navItems = role === "admin" ? adminNav : role === "studio" ? studioNav : clientNav;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Camera className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-heading font-semibold text-lg tracking-tight">SnapBook</span>
      </div>

      {/* Role badge */}
      {role && (
        <div className="px-4 pt-4 pb-2">
          <div className="px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs font-medium text-primary text-center">
            {getRoleLabel(role)}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
          <Search className="w-4 h-4" />
          <span>Search…</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard" || item.to === "/studio" || item.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
            {user?.initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name || "Guest"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
