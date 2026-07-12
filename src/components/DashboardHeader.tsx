import { Bell, Menu, Home } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useRole, getRoleLabel } from "@/contexts/RoleContext";
import { ThemeToggleCompact } from "./ThemeToggle";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/photographers": "Photographers",
  "/calendar": "My Bookings",
  "/payments": "Payments",
  "/notifications": "Notifications",
  "/studio": "Studio Dashboard",
  "/studio/calendar": "Calendar",
  "/studio/bookings": "Bookings",
  "/studio/portfolio": "Portfolio",
  "/studio/earnings": "Earnings",
  "/studio/settings": "Settings",
  "/admin": "Admin Dashboard",
  "/admin/users": "User Management",
  "/admin/bookings": "All Bookings",
  "/admin/payments": "Payments Overview",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Platform Settings",
};

export function DashboardHeader() {
  const { user, role, logout } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-heading font-semibold">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/" className="hidden sm:inline-flex">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
            <Home className="w-4 h-4" /> Homepage
          </Button>
        </Link>
        {role && (
          <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {getRoleLabel(role)}
          </span>
        )}
        <ThemeToggleCompact />
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
          {user?.initials || "?"}
        </div>
      </div>
    </header>
  );
}
