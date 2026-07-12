import { env } from "@/config/env";
import api from "@/lib/api";
import type { FeedbackRecord } from "@/data/mockFeedback";
import { mockSaveFeedback, mockListFeedback } from "@/data/mockFeedback";

export const feedbackService = {
  async submit(feedback: FeedbackRecord): Promise<void> {
    if (env.useMockApi) {
      mockSaveFeedback(feedback);
      return;
    }
    await api.post("/feedback", feedback);
  },

  async list(): Promise<FeedbackRecord[]> {
    if (env.useMockApi) {
      return mockListFeedback();
    }
    const { data } = await api.get<FeedbackRecord[]>("/feedback");
    return data;
  },
};

export type { FeedbackRecord };
