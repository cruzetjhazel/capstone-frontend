export interface Package {
  // Real backend package id (from the photographer's Package model). Needed
  // by Booking.tsx to (a) query real availability for the correct package
  // and (b) submit package_id on booking creation. Optional here only
  // because this interface still doubles as the shape for mock/demo
  // photographers below, which have no backend row to point to.
  id?: number;
  name: string;
  price: number;
  hours: number;
  photos: number;
  description: string;
  inclusions: string[];
}

export interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
}

export interface BookedSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "2:00 PM"
  eventType: string;
}

/**
 * Per-photographer custom-package pricing.
 * Each photographer/studio can charge differently in their "Build Your Own" customizer.
 * (Editable in Studio/Freelancer → Settings → Custom Pricing.)
 */
export interface CustomRates {
  baseFee: number;
  photoTiers: { label: string; value: number; price: number }[];
  photographerTiers: { label: string; value: number; price: number }[];
  deliveryTiers: { id: string; label: string; price: number }[];
  rawFiles: number;
  secondLocation: number;
  // `type`/`tierName` are additive and optional — confirmed against
  // PublicCustomPackageComponentResource.php, which sends both. Not consumed by
  // any renderer yet, but kept here so the data survives until the "Build Your
  // Own" calculator is updated to actually group by tier instead of flattening.
  extras?: {
    id: string; label: string; price: number; type?: "flat_option" | "tier_option"; tierName?: string | null;
    // Present only on options meant to represent a selectable photography
    // coverage duration (minutes). Booking.tsx uses this — not `type` or
    // `tierName` — to find the client's duration choice and compute the
    // review step's "Estimated end" preview. Mirrors the backend's
    // custom_package_components.duration_minutes column.
    durationMinutes?: number;
  }[];
}

export const defaultCustomRates: CustomRates = {
  baseFee: 1500,
  photoTiers: [
    { label: "50 photos", value: 50, price: 0 },
    { label: "100 photos", value: 100, price: 800 },
    { label: "200 photos", value: 200, price: 2000 },
    { label: "300 photos", value: 300, price: 3200 },
    { label: "Unlimited", value: 999, price: 5000 },
  ],
  photographerTiers: [
    { label: "1 Photographer", value: 1, price: 0 },
    { label: "2 Photographers", value: 2, price: 2000 },
    { label: "3 Photographers", value: 3, price: 4000 },
  ],
  deliveryTiers: [
    { id: "standard", label: "Standard (14 days)", price: 0 },
    { id: "rush", label: "Rush (7 days)", price: 1500 },
    { id: "express", label: "Express (3 days)", price: 3500 },
  ],
  rawFiles: 2000,
  secondLocation: 1200,
};

export interface Photographer {
  id: string;
  name: string;
  type: "Studio" | "Freelancer";
  specialty: string;
  styles?: string[];
  avatarUrl?: string;
  coverUrl?: string;
  rating: number;
  reviews: number;
  priceMin: number;
  priceMax: number;
  location: string;
  avatar: string;
  services: string[];
  about: string;
  packages: Package[];
  bookedSlots: BookedSlot[];
  reviewList: Review[];
  portfolio: string[];
  customRates: CustomRates;
  socials?: { facebook?: string; instagram?: string; website?: string };
  phone?: string;
  email?: string;
  gcashQR?: string;   // mock QR identifier used by payment auto-verify
  gcashName?: string;
  gcashNumber?: string;
}

/** Default mock socials/GCash applied to every photographer that doesn't override. */
export const defaultSocials = {
  facebook: "https://facebook.com/snapbook",
  instagram: "https://instagram.com/snapbook",
  website: "https://snapbook.ph",
};

const studioRates: CustomRates = {
  ...defaultCustomRates,
  baseFee: 2000,
};

const freelancerRates: CustomRates = {
  ...defaultCustomRates,
  baseFee: 1000,
  photographerTiers: [
    { label: "1 Photographer (me)", value: 1, price: 0 },
    { label: "+ 1 assistant", value: 2, price: 1500 },
  ],
};

export const allPhotographers: Photographer[] = [
  {
    id: "1",
    name: "HH Production",
    type: "Studio",
    specialty: "Weddings & Events",
    rating: 5.0,
    reviews: 134,
    priceMin: 3000,
    priceMax: 15000,
    location: "San Francisco, Bulan Sorsogon",
    avatar: "HH",
    services: ["Wedding", "Events", "Debut"],
    about: "HH Production is a premier photography studio in Bulan, Sorsogon specializing in weddings and milestone events. With over 8 years of experience, we deliver cinematic storytelling through every frame.",
    packages: [
      { name: "Basic", price: 3000, hours: 2, photos: 50, description: "Ideal for small intimate events", inclusions: ["Up to 2 hours coverage", "50 edited photos", "Online gallery", "1 photographer"] },
      { name: "Standard", price: 7000, hours: 5, photos: 200, description: "Great for medium-sized celebrations", inclusions: ["Up to 5 hours coverage", "200 edited photos", "Online gallery", "2 photographers", "Same-day edit teaser"] },
      { name: "Premium", price: 15000, hours: 10, photos: 500, description: "Full-day coverage for grand events", inclusions: ["Full-day coverage", "500+ edited photos", "Online gallery", "3 photographers", "Same-day edit video", "Pre-event shoot"] },
    ],
    bookedSlots: [
      { date: "2026-04-20", startTime: "9:00 AM", eventType: "Wedding" },
      { date: "2026-05-03", startTime: "1:00 PM", eventType: "Debut" },
    ],
    reviewList: [
      { id: "r1", name: "Maria Santos", avatar: "MS", rating: 5, date: "March 2026", text: "HH Production captured our wedding beautifully! Very professional team." },
      { id: "r2", name: "Juan Dela Cruz", avatar: "JD", rating: 5, date: "February 2026", text: "Our debut photos turned out amazing." },
    ],
    portfolio: [  "from-primary/10 to-secondary/10","from-secondary/10 to-accent/10","from-accent/10 to-primary/10","from-primary/5 to-accent/5",
      "from-secondary/5 to-primary/5","from-accent/5 to-secondary/5","from-primary/10 to-secondary/10","from-secondary/10 to-accent/10",
      "from-accent/10 to-primary/10","from-primary/5 to-accent/5","from-secondary/5 to-primary/5","from-accent/5 to-secondary/5",],
    customRates: studioRates,
  },
  {
    id: "2",
    name: "KAP Studio",
    type: "Studio",
    specialty: "Portraits & Creative",
    rating: 4.9,
    reviews: 97,
    priceMin: 2500,
    priceMax: 10000,
    location: "Zone 8, Bulan Sorsogon",
    avatar: "KS",
    services: ["Portrait", "Studio", "Graduation"],
    about: "KAP Studio brings creative vision to every portrait session.",
    packages: [
      { name: "Solo Session", price: 2500, hours: 1, photos: 30, description: "Perfect for individual portraits", inclusions: ["1 hour session", "30 edited photos", "Online gallery", "1 outfit change"] },
      { name: "Standard", price: 5000, hours: 3, photos: 100, description: "Great for graduation & creative shoots", inclusions: ["Up to 3 hours coverage", "100 edited photos", "3 outfit changes", "2 locations"] },
      { name: "Premium", price: 10000, hours: 6, photos: 250, description: "Full creative session", inclusions: ["Up to 6 hours coverage", "250 edited photos", "Unlimited outfits", "Multiple locations"] },
    ],
    bookedSlots: [{ date: "2026-04-15", startTime: "10:00 AM", eventType: "Portrait" }],
    reviewList: [{ id: "r1", name: "Liza Cruz", avatar: "LC", rating: 5, date: "March 2026", text: "Amazing creative direction!" }],
    portfolio: ["from-primary/10 to-secondary/10","from-secondary/10 to-accent/10","from-accent/10 to-primary/10","from-primary/5 to-accent/5","from-secondary/5 to-primary/5","from-accent/5 to-secondary/5"],
    customRates: studioRates,
  },
  {
    id: "4",
    name: "Corporate Focus Studio",
    type: "Studio",
    specialty: "Corporate & Events",
    rating: 4.8,
    reviews: 76,
    priceMin: 5000,
    priceMax: 20000,
    location: "Zone 3, Bulan Sorsogon",
    avatar: "CF",
    services: ["Corporate", "Events"],
    about: "Corporate Focus Studio specializes in professional business and corporate event documentation.",
    packages: [
      { name: "Basic", price: 5000, hours: 3, photos: 100, description: "Essential corporate coverage", inclusions: ["Up to 3 hours", "100 edited photos"] },
      { name: "Standard", price: 12000, hours: 5, photos: 200, description: "Full event coverage", inclusions: ["Up to 5 hours coverage", "200 edited photos", "Video highlights"] },
      { name: "Enterprise", price: 20000, hours: 8, photos: 300, description: "Complete corporate documentation", inclusions: ["Full-day coverage", "300 edited photos", "Video highlights"] },
    ],
    bookedSlots: [{ date: "2026-04-28", startTime: "9:00 AM", eventType: "Corporate Event" }],
    reviewList: [{ id: "r1", name: "Mark Lim", avatar: "ML", rating: 5, date: "March 2026", text: "Very professional team!" }],
    portfolio: ["from-primary/10 to-accent/10", "from-accent/10 to-secondary/10", "from-secondary/10 to-primary/10", "from-primary/5 to-secondary/5", "from-accent/5 to-primary/5", "from-secondary/5 to-accent/5"],
    customRates: studioRates,
  },
  {
    id: "5",
    name: "Marco Villanueva",
    type: "Freelancer",
    specialty: "Portraits",
    rating: 4.9,
    reviews: 156,
    priceMin: 1500,
    priceMax: 5000,
    location: "Bulan, Sorsogon",
    avatar: "MV",
    services: ["Portrait", "Couples", "Graduation"],
    about: "Freelance portrait photographer specializing in natural light.",
    packages: [
      { name: "Quick Session", price: 1500, hours: 1, photos: 20, description: "Fast and simple", inclusions: ["1 hour session", "20 edited photos", "Online gallery"] },
      { name: "Standard", price: 3000, hours: 2, photos: 60, description: "Full portrait experience", inclusions: ["Up to 2 hours", "60 edited photos", "2 outfit changes"] },
      { name: "Premium", price: 5000, hours: 4, photos: 120, description: "Extended creative session", inclusions: ["Up to 4 hours", "120 edited photos", "Unlimited outfits", "Multiple locations"] },
    ],
    bookedSlots: [{ date: "2026-04-17", startTime: "9:00 AM", eventType: "Portrait" }],
    reviewList: [{ id: "r1", name: "Sofia Ramos", avatar: "SR", rating: 5, date: "March 2026", text: "My graduation photos were perfect!" }],
    portfolio: ["from-secondary/10 to-accent/10", "from-accent/10 to-primary/10", "from-primary/10 to-secondary/10", "from-accent/5 to-primary/5", "from-secondary/5 to-accent/5", "from-primary/5 to-secondary/5"],
    customRates: freelancerRates,
  },
  {
    id: "6",
    name: "Anna Reyes",
    type: "Freelancer",
    specialty: "Wedding & Events",
    rating: 4.8,
    reviews: 111,
    priceMin: 2000,
    priceMax: 8000,
    location: "Zone 5, Bulan Sorsogon",
    avatar: "AR",
    services: ["Wedding", "Events", "Debut"],
    about: "Freelance wedding and events photographer with a documentary style.",
    packages: [
      { name: "Essentials", price: 2000, hours: 2, photos: 50, description: "Intimate celebrations", inclusions: ["Up to 2 hours", "50 edited photos", "Online gallery"] },
      { name: "Classic", price: 5000, hours: 5, photos: 200, description: "Weddings & debuts", inclusions: ["Up to 5 hours", "200 edited photos", "Pre-event consultation"] },
      { name: "Grand", price: 8000, hours: 8, photos: 400, description: "Full-day documentation", inclusions: ["Full-day coverage", "400 edited photos", "Pre-event shoot", "Same-day edit"] },
    ],
    bookedSlots: [{ date: "2026-04-26", startTime: "9:00 AM", eventType: "Wedding" }],
    reviewList: [{ id: "r1", name: "Rosa Lim", avatar: "RL", rating: 5, date: "March 2026", text: "Anna photographed our wedding beautifully!" }],
    portfolio: ["from-primary/10 to-accent/10", "from-accent/10 to-secondary/10", "from-secondary/10 to-primary/10", "from-primary/5 to-accent/5", "from-secondary/5 to-primary/5", "from-accent/5 to-secondary/5"],
    customRates: freelancerRates,
  },
  {
    id: "7",
    name: "Luis Mendoza",
    type: "Freelancer",
    specialty: "Lifestyle & Travel",
    rating: 4.6,
    reviews: 45,
    priceMin: 1500,
    priceMax: 6000,
    location: "Bulan, Sorsogon",
    avatar: "LM",
    services: ["Lifestyle", "Couples", "Events"],
    about: "Lifestyle photographer capturing everyday moments.",
    packages: [
      { name: "Mini Session", price: 1500, hours: 1, photos: 25, description: "Quick lifestyle shoot", inclusions: ["1 hour session", "25 edited photos", "Online gallery"] },
      { name: "Standard", price: 3500, hours: 3, photos: 80, description: "Extended session", inclusions: ["Up to 3 hours", "80 edited photos", "2 locations"] },
      { name: "Full Day", price: 6000, hours: 6, photos: 200, description: "Full-day adventure", inclusions: ["Full-day coverage", "200 edited photos", "Multiple locations"] },
    ],
    bookedSlots: [{ date: "2026-04-24", startTime: "9:00 AM", eventType: "Couples" }],
    reviewList: [{ id: "r1", name: "Nina Torres", avatar: "NT", rating: 5, date: "February 2026", text: "Great eye for lifestyle photography!" }],
    portfolio: ["from-accent/10 to-secondary/10", "from-secondary/10 to-primary/10", "from-primary/10 to-accent/10", "from-secondary/5 to-primary/5", "from-primary/5 to-accent/5", "from-accent/5 to-secondary/5"],
    customRates: freelancerRates,
  },
  {
    id: "8",
    name: "Bright Lens Studio",
    type: "Studio",
    specialty: "Full Service",
    rating: 5.0,
    reviews: 201,
    priceMin: 4000,
    priceMax: 18000,
    location: "Zone 1, Bulan Sorsogon",
    avatar: "BL",
    services: ["Wedding", "Events", "Portrait", "Corporate"],
    about: "Full-service photography studio for all occasions.",
    packages: [
      { name: "Starter", price: 4000, hours: 3, photos: 80, description: "Small events & portraits", inclusions: ["Up to 3 hours", "80 edited photos", "1 photographer"] },
      { name: "Professional", price: 10000, hours: 6, photos: 300, description: "Complete event coverage", inclusions: ["Up to 6 hours", "300 edited photos", "2 photographers", "Same-day teaser"] },
      { name: "Ultimate", price: 18000, hours: 10, photos: 600, description: "The full experience", inclusions: ["Full-day coverage", "600+ edited photos", "3 photographers", "Same-day edit video", "Pre-event shoot"] },
    ],
    bookedSlots: [{ date: "2026-04-27", startTime: "9:00 AM", eventType: "Wedding" }],
    reviewList: [{ id: "r1", name: "Elena Vargas", avatar: "EV", rating: 5, date: "March 2026", text: "Best studio in Bulan!" }],
    portfolio: ["from-primary/10 to-secondary/10", "from-secondary/10 to-accent/10", "from-accent/10 to-primary/10", "from-primary/5 to-accent/5", "from-secondary/5 to-primary/5", "from-accent/5 to-secondary/5"],
    customRates: studioRates,
  },
];

/** Optional add-ons customers can attach to any package. */
export const addOns = [
  { name: "Drone / Aerial Coverage", price: 1500, description: "Adds aerial photo & video shots of your event" },
  { name: "RAW Files Included", price: 2000, description: "Receive all unedited high-resolution RAW files" },
  { name: "Second Photographer", price: 2000, description: "Adds a 2nd shooter for wider, simultaneous coverage" },
  { name: "Same-Day Edited Highlights", price: 2500, description: "Get 10–15 lightly edited highlight photos within 24 hours" },
  { name: "Pre-Event / On-Site Consultation", price: 800, description: "1-hour planning session to align on shots, schedule, and style" },
  { name: "Hair & Makeup Touch-up Coordination", price: 1200, description: "We coordinate with a local HMUA for on-site touch-ups (artist fee separate)" },
  { name: "Printed Photo Album (20 pages)", price: 3500, description: "Hardcover keepsake album with your favorite shots" },
  { name: "Express 3-Day Delivery", price: 1800, description: "Skip the queue — final edits delivered within 3 business days" },
  { name: "Extended Coverage (per extra hour)", price: 1500, description: "Add an extra hour of on-site coverage beyond your package" },
  { name: "Behind-the-Scenes Video Reel", price: 2200, description: "A short cinematic BTS reel of your event (30–60 sec)" },
];

export const eventTypes = [
  "Wedding", "Debut", "Birthday", "Engagement", "Pre-Nuptial", "Graduation",
  "Family Portrait", "Couples Shoot", "Corporate Event", "Product Shoot", "Other",
];

/** J&T-style booking progress stages (in order). */
export const trackingStages = [
  { id: "event_day", label: "Event Day", description: "Photographer is covering your event" },
  { id: "editing", label: "Editing", description: "Photos are being edited and polished" },
  { id: "delivered", label: "Delivered", description: "Your photos are available in your gallery" },
] as const;
export type TrackingStage = typeof trackingStages[number]["id"];

export const serviceFilters = ["All", "Wedding", "Events", "Portrait", "Couples", "Studio", "Graduation", "Corporate", "Debut", "Lifestyle", "Product"];
export const typeFilters = ["All", "Studio", "Freelancer"];
export const priceFilters = [
  { label: "Any Price", min: 0, max: Infinity },
  { label: "Under ₱3,000", min: 0, max: 3000 },
  { label: "₱3,000–₱5,000", min: 3000, max: 5000 },
  { label: "₱5,000–₱10,000", min: 5000, max: 10000 },
  { label: "₱10,000+", min: 10000, max: Infinity },
];

export const ratingFilters = [
  { label: "Any Rating", min: 0 },
  { label: "4.5+", min: 4.5 },
  { label: "4.7+", min: 4.7 },
  { label: "4.9+", min: 4.9 },
];

export function getPhotographer(id: string): Photographer | undefined {
  return allPhotographers.find((p) => p.id === id);
}

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString()}`;
}