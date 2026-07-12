import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Photographers from "./pages/Photographers";
import PhotographerProfile from "./pages/PhotographerProfile";
import Booking from "./pages/Booking";
import BookingSent from "./pages/BookingSent";
import BookingDetails from "./pages/BookingDetails";
import BookingPay from "./pages/BookingPay";
import BookingReceipt from "./pages/BookingReceipt";
import BookingFeedback from "./pages/BookingFeedback";
import CalendarPage from "./pages/CalendarPage";
import Payments from "./pages/Payments";
import Notifications from "./pages/Notifications";


import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioBookings from "./pages/studio/StudioBookings";
import StudioEarnings from "./pages/studio/StudioEarnings";
import StudioPortfolio from "./pages/studio/StudioPortfolio";
import StudioSettings from "./pages/studio/StudioSettings";
import StudioAnalytics from "./pages/studio/StudioAnalytics";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminFeatured from "./pages/admin/AdminFeatured";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Client routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/photographers" element={<Photographers />} />
            <Route path="/photographers/:id" element={<PhotographerProfile />} />
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/booking-sent/:id" element={<BookingSent />} />
            <Route path="/booking/:id/details" element={<BookingDetails />} />
            <Route path="/booking/:id/pay" element={<BookingPay />} />
            <Route path="/booking/:id/receipt" element={<BookingReceipt />} />
            <Route path="/booking/:id/feedback" element={<BookingFeedback />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/notifications" element={<Notifications />} />

            {/* Studio routes */}
            <Route path="/studio" element={<StudioDashboard />} />
            <Route path="/studio/calendar" element={<CalendarPage />} />
            <Route path="/studio/bookings" element={<StudioBookings />} />
            <Route path="/studio/portfolio" element={<StudioPortfolio />} />
            <Route path="/studio/earnings" element={<StudioEarnings />} />
            <Route path="/studio/settings" element={<StudioSettings />} />
            <Route path="/studio/analytics" element={<StudioAnalytics />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/verifications" element={<AdminVerifications />} />
            <Route path="/admin/featured" element={<AdminFeatured />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
