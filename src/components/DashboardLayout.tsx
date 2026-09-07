import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { ClientLayout } from "./ClientLayout";
import { useRole } from "@/contexts/RoleContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { role } = useRole();

  // Clients get the shared top navbar (same MarketingNavbar as the public
  // Home page), no sidebar, no separate dashboard.
  if (role === "client") {
    return <ClientLayout>{children}</ClientLayout>;
  }

  // Studio and admin keep the existing sidebar + header shell, unchanged.
  return (
    <div className="min-h-screen flex w-full bg-background relative">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8 overflow-auto bg-background rounded-tl-3xl border-l border-t border-border/30">
          {children}
        </main>
      </div>
    </div>
  );
}
