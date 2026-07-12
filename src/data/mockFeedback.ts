export interface FeedbackRecord {
  bookingId: string;
  photographerName?: string;
  overall: number;
  ratings: Record<string, number>;
  comment: string;
  submittedAt: string;
}

let feedbackStore: FeedbackRecord[] = [];

export function mockSaveFeedback(feedback: FeedbackRecord): void {
  feedbackStore = [feedback, ...feedbackStore.filter((f) => f.bookingId !== feedback.bookingId)];
}

export function mockListFeedback(): FeedbackRecord[] {
  return [...feedbackStore];
}

export function mockClearFeedback() {
  feedbackStore = [];
}
