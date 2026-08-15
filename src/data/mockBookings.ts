// src/data/mockBookings.ts

// Kept in sync with the real backend BookingStatus enum (see
// AcceptBookingAction/RejectBookingAction/ExpireStaleBookingHoldsAction on
// the API side) — this used to drift ("approved"/"paid" were never real
// statuses the API returns), which meant bookingService.ts's `as BookingStatus`
// cast on live API responses was silently unchecked. Fixed to match.
export type BookingStatus = "pending" | "accepted" | "confirmed" | "rejected" | "cancelled" | "completed" | "expired";

// New: track where the creative production is at!
export type ServiceStatus = "not_started" | "ongoing" | "for_client_review" | "completed";

export interface BookingAddOn {
  name: string;
  price: number;
  description: string;
}

export interface RequestRecord {
  status: "none" | "pending" | "approved" | "rejected";
  details?: string;
  requestedAt?: string;
  // Specific to reschedule
  date?: string;
  startTime?: string;
}

export interface BookingRecord {
  id: string;
  clientEmail?: string;
  photographerId: string;
  photographerName: string;
  photographerAvatar: string;
  eventType: string;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  eventLocation: string;
  guestCount: string;
  notes: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  packageName: string;
  packagePrice: number;
  packagePhotos: number;
  addOns: BookingAddOn[];
  subtotal: number;
  dueNow: number;
  balance: number;
  paymentOption: string;
  status: BookingStatus;
  createdAt: string;
  
  // New State & Request management properties
  serviceStatus: ServiceStatus; 
  hasReviewed?: boolean;
  cancellationRequest?: RequestRecord;
  rescheduleRequest?: RequestRecord;
  modificationRequest?: RequestRecord;
  revisionRequest?: RequestRecord;

  receipt?: any;
}

// Update seed data with future events & varying service statuses for testing
let bookings: BookingRecord[] = [
  {
    id: "BK-1042",
    clientEmail: "client@example.com",
    photographerId: "1",
    photographerName: "HH Production",
    photographerAvatar: "HH",
    eventType: "Wedding",
    date: "2026-10-20", // Moved to a future date so it can be rescheduled!
    startTime: "09:00",
    eventLocation: "St. Anthony Church, Bulan",
    guestCount: "150",
    notes: "",
    contactName: "Jane Client",
    contactPhone: "+63 912 345 6789",
    contactEmail: "client@example.com",
    packageName: "Premium",
    packagePrice: 15000,
    packagePhotos: 500,
    addOns: [],
    subtotal: 15000,
    dueNow: 4500,
    balance: 10500,
    paymentOption: "Downpayment (30%)",
    status: "accepted", // Accepted status allows "Pay Now" and "Reschedule"
    serviceStatus: "not_started",
    createdAt: new Date().toISOString(),
  },
  {
    id: "BK-1043",
    clientEmail: "client@example.com",
    photographerId: "1",
    photographerName: "HH Production",
    photographerAvatar: "HH",
    eventType: "Debut",
    date: "2026-07-10", // Completed Event
    startTime: "16:00",
    eventLocation: "Bulan Sorsogon Civic Center",
    guestCount: "100",
    notes: "Please capture creative group poses.",
    contactName: "Jane Client",
    contactPhone: "+63 912 345 6789",
    contactEmail: "client@example.com",
    packageName: "Standard",
    packagePrice: 8000,
    packagePhotos: 250,
    addOns: [],
    subtotal: 8000,
    dueNow: 2400,
    balance: 5600,
    paymentOption: "Downpayment (30%)",
    status: "confirmed",
    serviceStatus: "for_client_review", // Trigger revision option!
    createdAt: new Date().toISOString(),
  }
];

export function mockListBookings(clientEmail?: string): BookingRecord[] {
  if (!clientEmail) return [...bookings];
  return bookings.filter((b) => !b.clientEmail || b.clientEmail === clientEmail);
}

export function mockGetBooking(id: string): BookingRecord | undefined {
  return bookings.find((b) => b.id === id);
}

export function mockSaveBooking(booking: BookingRecord): BookingRecord {
  bookings = [booking, ...bookings.filter((b) => b.id !== booking.id)];
  return booking;
}

export function mockUpdateBooking(id: string, patch: Partial<BookingRecord>): BookingRecord | undefined {
  let updated: BookingRecord | undefined;
  bookings = bookings.map((b) => {
    if (b.id !== id) return b;
    updated = { ...b, ...patch };
    return updated;
  });
  return updated;
}