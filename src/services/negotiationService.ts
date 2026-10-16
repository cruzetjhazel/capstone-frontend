import { getAuthToken } from "@/lib/tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export type BudgetRequestStatus =
  | "requested" | "proposed" | "accepted" | "rejected" | "declined" | "expired" | "superseded" | "withdrawn";

export interface BudgetInclusion {
  name: string;
  details?: string | null;
}

export interface BudgetRequestInfo {
  id: number;
  status: BudgetRequestStatus;
  is_open: boolean;
  budget_amount: number;
  client_note: string | null;
  proposed_price: number | null;
  proposed_total: number | null;
  inclusions: BudgetInclusion[];
  photographer_note: string | null;
  decline_reason: string | null;
  expires_at: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface BudgetActions {
  can_request: boolean;
  requests_remaining: number;
  can_respond: boolean;
  can_answer_terms: boolean;
}

/** The parts of the photographer's booking response the budget panel needs. */
export interface PhotographerBudgetView {
  id: number;
  status: string;
  subtotal: string | number;
  total_price: string | number;
  platform_fee?: string | number | null;
  package_snapshot?: { included_items?: string[] } | null;
  client?: { id: number; name: string };
  budget_request: BudgetRequestInfo | null;
  budget_actions: BudgetActions | null;
}

export type BudgetRespondPayload =
  | { action: "accept"; note?: string }
  | { action: "counter"; proposed_price: number; inclusions: BudgetInclusion[]; note?: string }
  | { action: "decline"; reason: string };

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Prefer the specific field message over Laravel's generic "The given data was invalid."
    const fieldErrors = json.errors
      ? Object.values(json.errors).map((msgs) => (msgs as string[]).join(", ")).join(" | ")
      : "";
    throw new Error(fieldErrors || json.message || `Request failed (${response.status}).`);
  }
  return json.data as T;
}

export const negotiationService = {
  // --- client ---
  sendBudget: (bookingId: string | number, budgetAmount: number, note?: string) =>
    call(`/client/bookings/${bookingId}/budget-request`, "POST", {
      budget_amount: budgetAmount,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  acceptTerms: (bookingId: string | number) =>
    call(`/client/bookings/${bookingId}/budget-request/accept`, "POST"),

  rejectTerms: (bookingId: string | number) =>
    call(`/client/bookings/${bookingId}/budget-request/reject`, "POST"),

  // --- photographer ---
  getPhotographerBooking: (bookingId: string | number) =>
    call<PhotographerBudgetView>(`/photographer/bookings/${bookingId}`, "GET"),

  respond: (bookingId: string | number, payload: BudgetRespondPayload) =>
    call(`/photographer/bookings/${bookingId}/budget-request/respond`, "POST", payload),
};