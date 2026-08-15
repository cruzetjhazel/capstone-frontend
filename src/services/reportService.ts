import api, { getApiErrorMessage } from "@/lib/api";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "closed";
export type ReportTarget = "client" | "studio" | "booking" | "payment" | "bug" | "other";
export type ReportSeverity = "low" | "medium" | "high" | "urgent";
export type ReportRequestedAction = "investigate" | "refund" | "cancel" | "warn" | "remove_review" | "other";

export interface ReportAttachment {
  url: string;
  original_name: string;
  mime_type: string;
}

export interface ReportNote {
  id: number;
  note: string;
  date: string;
}

export interface Report {
  id: string; // display reference code, e.g. "RPT-00042"
  status: ReportStatus;
  date: string; // formatted submission date, e.g. "July 18, 2026"
  target: ReportTarget;
  referenceId: string; // "N/A" when none was provided
  reason: string;
  details: string;
  expectedOutcome: string; // human label, e.g. "Refund Request"
  attachments: ReportAttachment[];
  adminNotes: { date: string; note: string }[];
}

type RawReport = {
  id: number;
  reference_code: string;
  target_type: ReportTarget;
  reference_id: string | null;
  reason: string;
  severity: ReportSeverity;
  details: string;
  requested_action: ReportRequestedAction;
  status: ReportStatus;
  attachments: ReportAttachment[] | null;
  notes: { id: number; note: string; created_at: string }[];
  created_at: string;
  resolved_at: string | null;
};

const REQUESTED_ACTION_LABELS: Record<ReportRequestedAction, string> = {
  investigate: "Investigate User",
  refund: "Refund Request",
  cancel: "Cancel Booking",
  warn: "Warn User",
  remove_review: "Remove Review",
  other: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function toReport(raw: RawReport): Report {
  return {
    id: raw.reference_code,
    status: raw.status,
    date: formatDate(raw.created_at),
    target: raw.target_type,
    referenceId: raw.reference_id ?? "N/A",
    reason: raw.reason,
    details: raw.details,
    expectedOutcome: REQUESTED_ACTION_LABELS[raw.requested_action] ?? raw.requested_action,
    attachments: raw.attachments ?? [],
    adminNotes: raw.notes.map((n) => ({ date: formatDate(n.created_at), note: n.note })),
  };
}

export interface SubmitReportPayload {
  target_type: ReportTarget;
  reference_id?: string;
  reason: string;
  severity: ReportSeverity;
  details: string;
  requested_action: ReportRequestedAction;
  evidence?: File[];
}

/** role: "client" or "studio" (matches RoleContext's `role` value). */
function basePath(role: string): string {
  return role === "studio" ? "/photographer/reports" : "/client/reports";
}

export const reportService = {
  list: async (role: string): Promise<Report[]> => {
    const res = await api.get(basePath(role));
    return (res.data.data as RawReport[]).map(toReport);
  },

  submit: async (role: string, payload: SubmitReportPayload): Promise<Report> => {
    const formData = new FormData();
    formData.append("target_type", payload.target_type);
    if (payload.reference_id) formData.append("reference_id", payload.reference_id);
    formData.append("reason", payload.reason);
    formData.append("severity", payload.severity);
    formData.append("details", payload.details);
    formData.append("requested_action", payload.requested_action);
    (payload.evidence ?? []).forEach((file) => formData.append("evidence[]", file));

    const res = await api.post(basePath(role), formData);
    return toReport(res.data.data as RawReport);
  },
};

export { getApiErrorMessage };