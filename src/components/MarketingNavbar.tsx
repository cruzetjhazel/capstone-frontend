import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu, X, LayoutDashboard, Settings, User, LogOut, Bell, HelpCircle,
  Calendar, Heart, Star, Wallet, Loader2, LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { useRole, getRoleDashboardPath } from "@/contexts/RoleContext";
import { NotificationBell } from "@/components/NotificationBell";
import toast from "react-hot-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Main site nav is the same for everyone — Home / Explore / About.
// Client-only personal features (My Bookings, Favorites, My Reviews,
// Payment History, Help/Report a Problem) live in the profile dropdown
// instead, so the primary navbar stays a clean site nav rather than an
// app-style nav.
const baseNavLinks = [
  { label: "Home", to: "/" },
  { label: "Explore", to: "/explore" },
  { label: "About", to: "/about" },
];

interface Props {
  /** If true, navbar starts solid (use on pages without a dark hero). */
  solid?: boolean;
}

// One dropdown row: highlights itself (tinted background + accent dot) when
// its route is the current page.
function ClientMenuLink({
  to, icon: Icon, label, active,
}: { to: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <DropdownMenuItem
      asChild
      className={cn(active && "bg-primary/10 text-primary focus:bg-primary/15 focus:text-primary")}
    >
      <Link to={to} className="flex items-center">
        <Icon className={cn("w-4 h-4 mr-2", active && "text-primary")} />
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
      </Link>
    </DropdownMenuItem>
  );
}

export default function MarketingNavbar({ solid = false }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(solid);
  const { user, logout } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const toastId = toast.loading("Logging out…");

    try {
      await logout();
      toast.success("Successfully logged out. See you next time!", { id: toastId });
      setIsLogoutModalOpen(false);
      navigate("/login", { replace: true });
    } catch {
      toast.error("Failed to sign out. Please try again.", { id: toastId });
      setIsLoggingOut(false);
    }
  };

  const isClient = user?.role === "client";
  const navLinks = baseNavLinks;

  const isActivePath = (path: string) => location.pathname === path;



  useEffect(() => {
    if (solid) return;
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [solid]);

  const onDark = !scrolled && !solid;

  const settingsPath = user?.role === "studio" ? "/studio/settings"
    : user?.role === "admin" ? "/admin/settings" : "/profile";

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled || solid
          ? "bg-card/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Logo onDark={onDark} />

        <nav className="hidden md:flex items-center gap-6 lg:gap-10">
          {navLinks.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              end={l.to === "/"}
              className={cn(
                "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                onDark
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              activeClassName={cn(
                "after:content-[''] after:absolute after:left-4 after:right-4 after:-bottom-0.5 after:h-[1.5px] after:rounded-full",
                onDark ? "!text-white after:bg-white" : "!text-foreground after:bg-foreground"
              )}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isClient && (
            <div className="hidden md:block">
              <NotificationBell onDark={onDark} />
            </div>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-colors",
                    onDark
                      ? "border-white/30 text-white hover:bg-white/10"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold overflow-hidden">
                    {user.profilePhotoUrl ? (
                      <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <span className="text-sm font-medium">{user.name.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn("w-56", isClient && "w-64")}>
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isClient ? (
                  <>
                    <ClientMenuLink to="/profile" icon={User} label="My Profile" active={isActivePath("/profile")} />
                    <ClientMenuLink to="/bookings" icon={Calendar} label="My Bookings" active={isActivePath("/bookings")} />
                    <ClientMenuLink to="/favorites" icon={Heart} label="Favorites" active={isActivePath("/favorites")} />
                    <ClientMenuLink to="/reviews" icon={Star} label="My Reviews" active={isActivePath("/reviews")} />
                    <ClientMenuLink to="/payments" icon={Wallet} label="Payment History" active={isActivePath("/payments")} />
                    {/* NOTE: routes to the existing /report-problem page for now.
                        Converting this to an overlay too requires ReportProblem.tsx —
                        haven't been sent that file yet. */}
                    <ClientMenuLink to="/report-problem" icon={HelpCircle} label="Help / Report a Problem" active={isActivePath("/report-problem")} />
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={getRoleDashboardPath(user.role)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={settingsPath}>
                        <Settings className="w-4 h-4 mr-2" /> Profile Settings
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsLogoutModalOpen(true)}>
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden md:inline-flex">
                <Button variant="ghost" size="sm" className={cn("font-medium", onDark && "text-white hover:bg-white/10")}>
                  Sign in
                </Button>
              </Link>
              <Link to="/register" className="hidden md:inline-flex">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "font-medium rounded-lg bg-transparent hover:bg-transparent",
                    onDark
                      ? "border-white/50 text-white hover:bg-white/10"
                      : "border-foreground/30 text-foreground hover:bg-muted"
                  )}
                >
                  Create Account
                </Button>
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "md:hidden w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              onDark ? "text-white hover:bg-white/10" : "hover:bg-muted"
            )}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-card border-b border-border animate-fade-in">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link key={l.label} to={l.to} onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {l.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  {isClient ? (
                    <>
                      <Link to="/notifications" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full"><Bell className="w-4 h-4 mr-2" />Notifications</Button>
                      </Link>
                      <Link to="/profile" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/profile") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <User className="w-4 h-4 mr-2" />My Profile
                        </Button>
                      </Link>
                      <Link to="/bookings" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/bookings") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <Calendar className="w-4 h-4 mr-2" />My Bookings
                        </Button>
                      </Link>
                      <Link to="/favorites" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/favorites") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <Heart className="w-4 h-4 mr-2" />Favorites
                        </Button>
                      </Link>
                      <Link to="/reviews" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/reviews") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <Star className="w-4 h-4 mr-2" />My Reviews
                        </Button>
                      </Link>
                      <Link to="/payments" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/payments") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <Wallet className="w-4 h-4 mr-2" />Payment History
                        </Button>
                      </Link>
                      <Link to="/report-problem" onClick={() => setOpen(false)}>
                        <Button
                          variant="outline"
                          className={cn("w-full", isActivePath("/report-problem") && "bg-primary/10 text-primary border-primary/30")}
                        >
                          <HelpCircle className="w-4 h-4 mr-2" />Help / Report a Problem
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={getRoleDashboardPath(user.role)} onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Button>
                      </Link>
                      <Link to={settingsPath} onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full"><Settings className="w-4 h-4 mr-2" />Profile Settings</Button>
                      </Link>
                    </>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => { setOpen(false); setIsLogoutModalOpen(true); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}><Button variant="outline" className="w-full">Sign in</Button></Link>
                  <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full">Create Account</Button></Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isLogoutModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 m-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground">Sign Out</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Are you sure you want to sign out?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
          </div>,
          document.body
        )}
    </header>
  );
}
