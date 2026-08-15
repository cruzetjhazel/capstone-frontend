import { useState } from "react";
import { Bell, Menu, Home, LogOut, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useRole } from "@/contexts/RoleContext";
import { getInitials } from "@/lib/utils";
import { ThemeToggleCompact } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast"; // Hot toast imported here

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/photographers": "Photographers",
  "/calendar": "My Bookings",
  "/payments": "Payments",
  "/notifications": "Notifications",
  "/studio": "Studio Dashboard",
  "/studio/calendar": "Calendar Matrix",
  "/studio/bookings": "Bookings",
  "/studio/portfolio": "Portfolio Showcase",
  "/studio/earnings": "Earnings",
  "/studio/settings": "Settings",
  "/studio/clients": "Client Directory (CRM)",
  "/studio/reviews": "Client Feedback Reviews",
  "/studio/documents": "Contracts & Invoices",
  "/studio/archive": "Safe Archive & Trash",
  "/studio/logs": "Activity & Audit Logs",
  "/studio/notifications": "Notifications",
  "/admin": "Admin Dashboard",
  "/admin/users": "User Management",
  "/admin/bookings": "All Bookings",
  "/admin/payments": "Payments Overview",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Platform Settings",
  "/admin/notifications": "Notifications",
};

export function DashboardHeader() {
  const { user, role, logout } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const title = pageTitles[location.pathname] || "Dashboard";

  const confirmLogout = async () => {
    try {
      await logout();
      setIsLogoutModalOpen(false);
      navigate("/login");
      toast.success("Successfully logged out. See you next time!"); // Hot toast success
    } catch (error) {
      toast.error("Failed to sign out. Please try again."); // Hot toast error
    }
  };

  const getProfilePath = () => {
    if (role === "studio") return "/studio/settings";
    if (role === "admin") return "/admin/settings";
    return "/profile";
  };

  const getNotificationPath = () => {
    if (role === "studio") return "/studio/notifications";
    if (role === "admin") return "/admin/notifications";
    return "/notifications";
  };

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 lg:px-8 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-heading font-semibold">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {role && (
            <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {role === "studio" ? "Booking Management" : role === "admin" ? "Admin Control" : "Client Portal"}
            </span>
          )}
          
          <ThemeToggleCompact />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative" 
            onClick={() => navigate(getNotificationPath())}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background overflow-hidden">
                {user?.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} alt={user.name ?? "Profile"} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-xl">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1.5">
                  <p className="text-sm font-semibold leading-none">{user?.name || "Guest User"}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              
              <div className="p-1">
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate("/")}>
                  <Home className="w-4 h-4 mr-2" />
                  Homepage
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => navigate(getProfilePath())}>
                  <User className="w-4 h-4 mr-2" />
                  Profile View
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-border/50" />
              
              <div className="p-1">
                <DropdownMenuItem 
                  className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive" 
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 m-4">
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
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}