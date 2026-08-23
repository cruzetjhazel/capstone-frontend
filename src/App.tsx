import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToast } from "react-hot-toast"; 
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import toast from "react-hot-toast";
import { FavoritesProvider } from "@/contexts/FavoritesContext";

// --- PUBLIC PAGES IMPORTS ---
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Photographers from "./pages/Photographers";
import PhotographerProfile from "./pages/PhotographerProfile";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// --- SHARED PAGES IMPORTS ---
import ReportProblem from "./pages/ReportProblem";
import MyReports from "./pages/MyReports"; 
import Notifications from "./pages/Notifications";

// --- CLIENT PAGES IMPORTS ---
import Dashboard from "./pages/client/ClientDashboard";
import MyBookings from "./pages/client/ClientMyBookings";
import BookingDetails from "./pages/client/ClientBookingDetails";
import Favorites from "./pages/client/ClientFavorites";
import Reviews from "./pages/client/ClientReviews";
import Profile from "./pages/client/ClientProfile";
import ClientPayments from "./pages/client/ClientPayments"; 
import Booking from "./pages/Booking";
import BookingSent from "./pages/BookingSent"; 
import BookingPay from "./pages/BookingPay";
import BookingReceipt from "./pages/BookingReceipt";
import BookingFeedback from "./pages/BookingFeedback";
import CalendarPage from "./pages/CalendarPage";

// --- STUDIO PAGES IMPORTS ---
import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioBookings from "./pages/studio/StudioBookings";
import StudioEarnings from "./pages/studio/StudioEarnings";
import StudioPortfolio from "./pages/studio/StudioPortfolio";
import StudioSettings from "./pages/studio/StudioSettings";
import StudioAnalytics from "./pages/studio/StudioAnalytics";
import StudioCalendar from "./pages/studio/StudioCalendar";
import StudioClients from "./pages/studio/StudioClients";
import StudioReviews from "./pages/studio/StudioReviews";
import StudioArchive from "./pages/studio/StudioArchive";
import StudioLogs from "./pages/studio/StudioLogs";
import StudioPackages from "./pages/studio/StudioPackages";
import StudioBookingDetails from "./pages/studio/StudioBookingDetails";
import ApplicationStatus from "./pages/studio/ApplicationStatus";

// --- ADMIN PAGES IMPORTS ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayments from "./pages/admin/AdminPayments"; // Added Payments Import
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminReviewApplication from "./pages/admin/AdminReviewApplication";
import AdminSystemLogs from "./pages/admin/AdminSystemLogs"; 
import AdminArchive from "./pages/admin/AdminArchive"; 
import AdminReports from "./pages/admin/AdminReports";

const queryClient = new QueryClient();

// --- THEME ENFORCER COMPONENT ---
function RouteThemeEnforcer() {
  const location = useLocation();
  const { theme, systemTheme } = useTheme();

  const isPublicRoute = 
    ["/", "/explore", "/login", "/register", "/photographers", "/about"].includes(location.pathname) || 
    location.pathname.startsWith("/photographers/");

  useEffect(() => {
    if (isPublicRoute) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    } else {
      const activeTheme = theme === "system" ? systemTheme : theme;
      if (activeTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    }
  }, [location.pathname, theme, systemTheme, isPublicRoute]);

  return null;
}

const ProtectedRoute = ({
  children,
  allowedRole,
  requireApprovedPhotographer = true,
}: {
  children: ReactNode;
  allowedRole: "client" | "studio" | "admin";
  requireApprovedPhotographer?: boolean;
}) => {
  const { user, role, isLoading, consumeJustLoggedOut } = useRole();

  const isBlocked = !isLoading && (!user || role !== allowedRole);
  const roleLabel = allowedRole === "client" ? "client" : allowedRole === "studio" ? "photographer" : "administrator";

  useEffect(() => {
    if (!isBlocked) return;
    if (!user) {
      if (!consumeJustLoggedOut()) {
        toast.error("Please log in to continue.");
      }
    } else {
      toast.error(`This area is for ${roleLabel} accounts only.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== allowedRole) return <Navigate to="/" replace />;
  if (user.accountStatus !== "active") return <Navigate to="/login" replace />;

  // Photographer accounts (role "studio") whose application isn't approved yet
  // get routed to the status page instead of booking-management screens.
  if (allowedRole === "studio" && requireApprovedPhotographer && user.application?.status !== "approved") {
    return <Navigate to="/photographer/status" replace />;
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HotToast position="top-right" reverseOrder={false} /> 
      <BrowserRouter>
        <RouteThemeEnforcer />
        <RoleProvider>
          <FavoritesProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/photographers" element={<Photographers />} />
              <Route path="/photographers/:id" element={<PhotographerProfile />} />
              <Route path="/about" element={<About />} />

              {/* CLIENT ROUTES */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRole="client"><Dashboard /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute allowedRole="client"><MyBookings /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute allowedRole="client"><Favorites /></ProtectedRoute>} />
              <Route path="/reviews" element={<ProtectedRoute allowedRole="client"><Reviews /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRole="client"><Profile /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute allowedRole="client"><ClientPayments /></ProtectedRoute>} />
              <Route path="/report-problem" element={<ProtectedRoute allowedRole="client"><ReportProblem /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRole="client"><MyReports /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute allowedRole="client"><Notifications /></ProtectedRoute>} />
              
              <Route path="/booking/:id" element={<ProtectedRoute allowedRole="client"><Booking /></ProtectedRoute>} />
              <Route path="/booking-sent/:id" element={<ProtectedRoute allowedRole="client"><BookingSent /></ProtectedRoute>} />
              <Route path="/booking/:id/details" element={<ProtectedRoute allowedRole="client"><BookingDetails /></ProtectedRoute>} />
              <Route path="/booking/:id/pay" element={<ProtectedRoute allowedRole="client"><BookingPay /></ProtectedRoute>} />
              <Route path="/booking/:id/receipt" element={<ProtectedRoute allowedRole="client"><BookingReceipt /></ProtectedRoute>} />
              <Route path="/booking/:id/feedback" element={<ProtectedRoute allowedRole="client"><BookingFeedback /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute allowedRole="client"><CalendarPage /></ProtectedRoute>} />
              
              {/* STUDIO ROUTES */}
              <Route path="/studio" element={<ProtectedRoute allowedRole="studio"><StudioDashboard /></ProtectedRoute>} />
              <Route path="/studio/calendar" element={<ProtectedRoute allowedRole="studio"><StudioCalendar /></ProtectedRoute>} />
              <Route path="/studio/bookings" element={<ProtectedRoute allowedRole="studio"><StudioBookings /></ProtectedRoute>} />
              <Route path="/studio/portfolio" element={<ProtectedRoute allowedRole="studio"><StudioPortfolio /></ProtectedRoute>} />
              <Route path="/studio/earnings" element={<ProtectedRoute allowedRole="studio"><StudioEarnings /></ProtectedRoute>} />
              <Route path="/studio/settings" element={<ProtectedRoute allowedRole="studio"><StudioSettings /></ProtectedRoute>} />
              <Route path="/studio/analytics" element={<ProtectedRoute allowedRole="studio"><StudioAnalytics /></ProtectedRoute>} />
              <Route path="/studio/archive" element={<ProtectedRoute allowedRole="studio"><StudioArchive /></ProtectedRoute>} />
              <Route path="/studio/logs" element={<ProtectedRoute allowedRole="studio"><StudioLogs /></ProtectedRoute>} />
              <Route path="/studio/packages" element={<ProtectedRoute allowedRole="studio"><StudioPackages /></ProtectedRoute>} />
              <Route path="/studio/report-problem" element={<ProtectedRoute allowedRole="studio"><ReportProblem /></ProtectedRoute>} />
              <Route path="/studio/reports" element={<ProtectedRoute allowedRole="studio"><MyReports /></ProtectedRoute>} />
              <Route path="/studio/bookings/:id" element={<ProtectedRoute allowedRole="studio"><StudioBookingDetails /></ProtectedRoute>} />
              <Route path="/studio/clients" element={<ProtectedRoute allowedRole="studio"><StudioClients /></ProtectedRoute>} />
              <Route path="/studio/reviews" element={<ProtectedRoute allowedRole="studio"><StudioReviews /></ProtectedRoute>} />
              <Route path="/studio/notifications" element={<ProtectedRoute allowedRole="studio"><Notifications /></ProtectedRoute>} />

              <Route path="/photographer/status"element={<ProtectedRoute allowedRole="studio" requireApprovedPhotographer={false}><ApplicationStatus /></ProtectedRoute>}/>

              {/* ADMIN ROUTES */}
              <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRole="admin"><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/bookings" element={<ProtectedRoute allowedRole="admin"><AdminBookings /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute allowedRole="admin"><AdminPayments /></ProtectedRoute>} />
              <Route path="/admin/verifications" element={<ProtectedRoute allowedRole="admin"><AdminVerifications /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRole="admin"><AdminAnalytics /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRole="admin"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/review/:id" element={<ProtectedRoute allowedRole="admin"><AdminReviewApplication /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute allowedRole="admin"><AdminSystemLogs /></ProtectedRoute>} /> 
              <Route path="/admin/archive" element={<ProtectedRoute allowedRole="admin"><AdminArchive /></ProtectedRoute>} /> 
              <Route path="/admin/reports" element={<ProtectedRoute allowedRole="admin"><AdminReports /></ProtectedRoute>} /> 
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRole="admin"><Notifications /></ProtectedRoute>} /> 
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FavoritesProvider>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;