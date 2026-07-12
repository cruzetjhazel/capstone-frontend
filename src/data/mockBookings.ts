import type { BookingReceipt } from "@/api/types/booking";

export type BookingStatus = "pending" | "approved" | "paid" | "completed" | "cancelled";

export interface BookingAddOn {
  name: string;
  price: number;
  description: string;
}

export interface BookingRecord {
  id: string;
  clientEmail?: string;
  photographerId: string;
  photographerName: string;
  photographerAvatar: string;
  eventType: string;
  date: string;
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
  receipt?: BookingReceipt & { receiptNo?: string; refCode?: string; amountPaid?: number; senderName?: string; paidAt?: string; merchantName?: string; merchantQR?: string; verifiedAt?: string };
}

let bookings: BookingRecord[] = [
  {
    id: "BK-1042",
    clientEmail: "client@example.com",
    photographerId: "1",
    photographerName: "HH Production",
    photographerAvatar: "HH",
    eventType: "Wedding",
    date: "2026-04-20",
    startTime: "9:00 AM",
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
    status: "approved",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
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

export function mockClearBookings() {
  bookings = [];
}
