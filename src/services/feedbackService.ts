import api from "@/lib/api";
import type { FeedbackRecord } from "@/data/mockFeedback";

export const feedbackService = {
  async submit(feedback: FeedbackRecord): Promise<void> {
    await api.post("/feedback", feedback);
  },

  async list(): Promise<FeedbackRecord[]> {
    const { data } = await api.get<FeedbackRecord[]>("/feedback");
    return data;
  },
};

export type { FeedbackRecord };
