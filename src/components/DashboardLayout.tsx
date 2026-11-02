import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { ClientLayout } from "./ClientLayout";
import { useRole } from "@/contexts/RoleContext";
import { getAuthToken } from "@/lib/tokenStorage";
import { ProfileCompletenessModal } from "./ProfileCompletenessModal";
import { useProfileCompleteness, OPEN_COMPLETENESS_EVENT } from "@/hooks/useProfileCompleteness";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role, user } = useRole();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Photographer setup checklist (shared by every photographer page) ----
  const isApprovedStudio = role === "studio" && user?.application?.status === "approved";
  const { data: completeness } = useProfileCompleteness(isApprovedStudio);
  const [completenessOpen, setCompletenessOpen] = useState(false);
  const missingCount = completeness ? completeness.totalCount - completeness.completedCount : 0;

  // Auto-open once per login session, when the photographer lands on the dashboard.
  // Closing it (X, backdrop, "Remind me later") keeps it closed until the next login.
  // The header chip and dashboard banner reopen it any time.
  useEffect(() => {
    if (!isApprovedStudio || !completeness || missingCount === 0) return;
    if (location.pathname !== "/studio") return;
    try {
      const sessionKey = `lensbook:completeness-prompted:${user?.id ?? ""}:${(getAuthToken() ?? "").slice(-16)}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage unavailable: fall through and open once for this page view
    }
    setCompletenessOpen(true);
  }, [isApprovedStudio, completeness, missingCount, location.pathname, user?.id]);

  useEffect(() => {
    const open = () => setCompletenessOpen(true);
    window.addEventListener(OPEN_COMPLETENESS_EVENT, open);
    return () => window.removeEventListener(OPEN_COMPLETENESS_EVENT, open);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Escape key, lock body scroll while open, and auto-close when resizing to desktop
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setSidebarOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [sidebarOpen]);

  if (role === "client") {
    return <ClientLayout>{children}</ClientLayout>;
  }

  return (
    <div className="min-h-screen flex w-full bg-background relative">
      <AppSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
          completeness={isApprovedStudio && completeness && missingCount > 0 ? { completed: completeness.completedCount, total: completeness.totalCount } : undefined}
          onOpenCompleteness={() => setCompletenessOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto [scrollbar-gutter:stable] bg-background lg:rounded-tl-3xl border-l border-t border-border/30">
          {children}
        </main>
      </div>

      {isApprovedStudio && completeness && (
        <ProfileCompletenessModal
          open={completenessOpen}
          onClose={() => setCompletenessOpen(false)}
          data={completeness}
        />
      )}
    </div>
  );
}