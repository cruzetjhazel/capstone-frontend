import type { AppNotification } from "@/services/notificationService";
import { getPostLoginPath, type User } from "@/contexts/RoleContext";


/** Where "View Details" goes for any notification, based on the user's role and what it is about. */
export function getNotificationLink(n: AppNotification, user: User | null): string {
  if (!user) return "/";

  const text = `${n.title} ${n.description}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  const isPayment = n.type === "payment" || has("refund", "payment");

if (user.role === "admin" || user.accountType === "administrator") {
  const title = n.title.toLowerCase();
  if (n.applicationId) return `/admin/verifications?open=${n.applicationId}`;
  if (n.bookingId) return `/admin/bookings?open=${n.bookingId}`;
  if (title.includes("appeal")) return "/admin/appeals";
  if (title.includes("report") || title.includes("dispute")) return "/admin/reports";
  if (title.includes("payment") || title.includes("refund")) return "/admin/payments";
  if (title.includes("application")) return "/admin/verifications";
  return "/admin";
}

  if (user.role === "studio") {
    if (n.bookingId) return `/studio/bookings/${n.bookingId}`;
    if (has("application")) return getPostLoginPath(user); // draft -> resume, pending/rejected -> status page, approved -> dashboard
    if (has("review")) return "/studio/reviews";
    if (isPayment) return "/studio/earnings";
    return "/studio";
  }

  // client
  if (n.bookingId) return `/booking/${n.bookingId}/details`;
  if (has("welcome")) return "/explore";
  if (isPayment) return "/payments";
  if (has("review")) return "/reviews";
  if (has("report")) return "/reports";
  return "/bookings";
}