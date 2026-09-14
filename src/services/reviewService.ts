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

export interface SubmitReviewPayload {
  booking_id: number;
  rating: number;
  comment: string;
}

export const reviewService = {
  list: async (): Promise<PhotographerReview[]> => {
    const res = await api.get("/photographer/reviews");
    return (res.data.data as RawReview[]).map(toReview);
  },

  // Client-side: the client's own submitted reviews. Same ReviewResource
  // shape as the photographer list above, reused via toReview().
  // NOTE: route path assumed as "/client/reviews" to match the naming
  // convention of Client\ReviewController's sibling routes (e.g.
  // /client/bookings). routes/api.php wasn't in the upload — confirm this
  // matches your actual route.
  listMine: async (): Promise<PhotographerReview[]> => {
    const res = await api.get("/client/reviews");
    return (res.data.data as RawReview[]).map(toReview);
  },

  // Client-side: submit a review for a Completed booking. Reuses the
  // existing Client\ReviewController::store endpoint — gated server-side
  // to Completed bookings, one review per booking (§7.24).
  submit: async (payload: SubmitReviewPayload): Promise<PhotographerReview> => {
    const res = await api.post("/client/reviews", payload);
    return toReview(res.data.data);
  },
};