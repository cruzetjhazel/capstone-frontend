import api from "@/lib/api";

export interface PhotographerReview {
  id: string;
  bookingId: string;
  clientName: string;
  eventType: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  reportedAt: string | null;
  createdAt: string;
}

type RawReview = {
  id: number;
  booking_id: number;
  client: { id: number; name: string };
  photographer: { id: number; name: string };
  event_type: string;
  rating: number;
  comment: string;
  reply: string | null;
  replied_at: string | null;
  reported_at: string | null;
  created_at: string;
};

function toReview(raw: RawReview): PhotographerReview {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id),
    clientName: raw.client.name,
    eventType: raw.event_type,
    rating: raw.rating,
    comment: raw.comment,
    reply: raw.reply,
    repliedAt: raw.replied_at,
    reportedAt: raw.reported_at,
    createdAt: raw.created_at,
  };
}

export const reviewService = {
  list: async (): Promise<PhotographerReview[]> => {
    const res = await api.get("/photographer/reviews");
    return (res.data.data as RawReview[]).map(toReview);
  },
};