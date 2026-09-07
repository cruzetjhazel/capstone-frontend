import { ReactNode } from "react";
import MarketingNavbar from "./MarketingNavbar";

interface ClientLayoutProps {
  children: ReactNode;
}

// Client inner pages (My Bookings, Booking Details, My Profile, Favorites,
// Reviews, Payment History) reuse the SAME navbar as the public Home page —
// just started solid since these pages have no dark hero. No custom navbar,
// no sidebar.
export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <MarketingNavbar solid />
      <main className="flex-1 w-full pt-16">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
