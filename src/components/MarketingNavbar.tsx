import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LayoutDashboard, Settings, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { useRole, getRoleDashboardPath } from "@/contexts/RoleContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Explore", to: "/explore" },
  { label: "About", to: "/about" },
];

interface Props {
  /** If true, navbar starts solid (use on pages without a dark hero). */
  solid?: boolean;
}

export default function MarketingNavbar({ solid = false }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(solid);
  const { user, logout } = useRole();

  useEffect(() => {
    if (solid) return;
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [solid]);

  const onDark = !scrolled && !solid;

  const settingsPath = user?.role === "studio" ? "/studio/settings"
    : user?.role === "admin" ? "/admin/settings" : "/dashboard";

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
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {getInitials(user.name)}
                  </div>
                  <span className="text-sm font-medium">{user.name.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()}>
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
                  <Link to={getRoleDashboardPath(user.role)} onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Button>
                  </Link>
                  <Link to={settingsPath} onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full"><Settings className="w-4 h-4 mr-2" />Profile Settings</Button>
                  </Link>
                  <Button className="w-full" onClick={() => { void logout(); setOpen(false); }}>
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
    </header>
  );
}
