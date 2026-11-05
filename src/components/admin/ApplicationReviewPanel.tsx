import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock,
  Download, Eye, FileText, Loader2, Maximize2, MinusCircle, X, ZoomIn, ZoomOut,
} from "lucide-react";

export type ReviewStatus = "pending" | "reviewed" | "needs_revision";
export type RequirementStatus = ReviewStatus | "missing" | "submitted" | "optional";
export type ItemType = "government_id" | "selfie_with_id" | "business_permit" | "additional_document" | "portfolio_image";

export interface ReviewItem {
  type: ItemType; ref: string; label: string; filename: string; extension: string; endpoint: string;
  status: ReviewStatus; feedback: string | null; reviewed_at: string | null; reviewed_by: string | null;
}
export interface Requirement { key: string; label: string; required: boolean; status: RequirementStatus; detail: string }
export interface ChecklistRow {
  key: string; label: string; required: boolean; kind: "field" | "files";
  status: RequirementStatus; value: string | string[] | null; detail: string | null;
  item_type?: ItemType | null; count?: number;
}
export interface ChecklistGroup {
  key: string; label: string; rows: ChecklistRow[];
  required_total: number; required_submitted: number; missing_count: number;
  pending_count: number; reviewed_count: number; needs_revision_count: number;
}
export interface Checklist {
  requirements: Requirement[];
  groups?: ChecklistGroup[];
  items: ReviewItem[];
  problems: string[];
  summary: {
    required_total: number; required_submitted: number; missing_required: string[];
    pending_count: number; needs_revision_count: number; reviewed_count: number; reviewable_total: number;
    ready_for_approval: boolean; blockers: string[];
  };
}

// What the applicant has to fix, taken from the checklist: missing required items first,
// then files an admin flagged for revision.
export function getRevisionItems(checklist: Checklist): { missing: string[]; flagged: { label: string; feedback: string }[] } {
  const missing: string[] = [];
  if (checklist.groups?.length) {
    for (const g of checklist.groups) {
      for (const r of g.rows) {
        if (r.required && r.status === "missing") {
          missing.push(r.kind === "files" && r.detail ? `${r.label} (${r.detail})` : r.detail && r.value ? `${r.label} (${r.detail})` : r.label);
        }
      }
    }
  } else {
    missing.push(...checklist.summary.missing_required);
  }
  const flagged = checklist.items
    .filter((i) => i.status === "needs_revision")
    .map((i) => ({ label: i.label, feedback: i.feedback ?? "" }));
  return { missing, flagged };
}

// The automatic part of the revision message (server limit for the whole message: 1000 chars).
export function buildRevisionNotes(checklist: Checklist): string {
  const { missing, flagged } = getRevisionItems(checklist);
  if (missing.length === 0 && flagged.length === 0) return "";

  const parts: string[] = ["Please complete or fix the following before we can approve your application:"];
  if (missing.length > 0) parts.push("Missing required:\n" + missing.map((m) => `- ${m}`).join("\n"));
  if (flagged.length > 0) parts.push("Needs revision:\n" + flagged.map((i) => `- ${i.label}: ${i.feedback}`).join("\n"));

  const text = parts.join("\n\n");
  return text.length > 1000 ? text.slice(0, 997) + "..." : text;
}

function unwrapObject(payload: any): any {
  let cur = payload;
  for (let i = 0; i < 4 && cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur; i++) cur = cur.data;
  return cur && typeof cur === "object" ? cur : {};
}

const STATUS_META: Record<RequirementStatus, { label: string; className: string; Icon: typeof Clock }> = {
  missing: { label: "Missing", className: "bg-rose-500/10 text-rose-700 border-rose-200", Icon: AlertCircle },
  pending: { label: "Pending Review", className: "bg-amber-500/10 text-amber-700 border-amber-200", Icon: Clock },
  reviewed: { label: "Reviewed", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  needs_revision: { label: "Needs Revision", className: "bg-orange-500/10 text-orange-700 border-orange-200", Icon: AlertCircle },
  submitted: { label: "Submitted", className: "bg-sky-500/10 text-sky-700 border-sky-200", Icon: CheckCircle2 },
  optional: { label: "Optional", className: "bg-muted text-muted-foreground border-border", Icon: MinusCircle },
};

function StatusBadge({ status, optional }: { status: RequirementStatus; optional?: boolean }) {
  if (optional && status === "missing") {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground shrink-0">Not submitted</Badge>;
  }
  const { label, className, Icon } = STATUS_META[status];
  return (
    <Badge variant="secondary" className={`${className} shrink-0`}>
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Badge>
  );
}

function Bar({ value, total, tone = "bg-primary" }: { value: number; total: number; tone?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2 text-center">
      <p className={`text-lg font-bold ${value > 0 ? tone : "text-muted-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// Files sit behind authenticated endpoints, so they are fetched with the bearer
// token as blobs (a plain <img src> or <a href> would carry no Authorization header).
function useProtectedFile(endpoint: string | null) {
  const [state, setState] = useState({ url: null as string | null, isImage: false, loading: !!endpoint, failed: false });

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ url: null, isImage: false, loading: true, failed: false });

    api.get(endpoint, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setState({ url: objectUrl, isImage: String(res.data?.type ?? "").startsWith("image/"), loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, isImage: false, loading: false, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [endpoint]);

  return state;
}

function ItemRow({ item, onOpen }: { item: ReviewItem; onOpen: () => void }) {
  const file = useProtectedFile(item.endpoint);
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-lg border border-border/60 p-2.5">
      <button type="button" onClick={onOpen} className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted/40 border border-border/50 flex items-center justify-center">
        {file.loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {file.url && file.isImage && <img src={file.url} alt={item.label} className="w-full h-full object-cover" />}
        {file.url && !file.isImage && <FileText className="w-6 h-6 text-primary" />}
        {file.failed && <AlertCircle className="w-4 h-4 text-destructive" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.extension.toUpperCase()} · {item.filename}</p>
        {item.status === "needs_revision" && item.feedback && (
          <p className="text-xs text-orange-700 mt-0.5 line-clamp-2">{item.feedback}</p>
        )}
      </div>
      <StatusBadge status={item.status} />
      <Button variant="outline" size="sm" onClick={onOpen}><Eye className="w-3.5 h-3.5 mr-1" /> View</Button>
    </div>
  );
}

function Thumb({ item, onOpen }: { item: ReviewItem; onOpen: () => void }) {
  const file = useProtectedFile(item.endpoint);
  return (
    <button
      type="button"
      onClick={onOpen}
      title={item.label}
      className="relative aspect-square rounded-lg overflow-hidden border border-border/60 bg-muted/30 hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center"
    >
      {file.loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {file.url && <img src={file.url} alt={item.label} className="w-full h-full object-cover" />}
      {file.failed && <AlertCircle className="w-4 h-4 text-destructive" />}
      <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {STATUS_META[item.status].label}
      </span>
    </button>
  );
}

function PreviewModal({
  items, index, onIndex, onClose, canReview, applicationId, onChecklistChange,
}: {
  items: ReviewItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  canReview: boolean;
  applicationId: number;
  onChecklistChange: (c: Checklist) => void;
}) {
  const item = items[index];
  const file = useProtectedFile(item.endpoint);
  const [scale, setScale] = useState<"fit" | number>("fit");
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const total = items.length;

  useEffect(() => {
    setScale("fit");
    setFlagging(false);
    setReason(item.feedback ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.endpoint]);

  const go = (delta: number) => onIndex((index + delta + total) % total);
  const zoomBy = (d: number) => setScale((s) => Math.min(4, Math.max(0.5, (s === "fit" ? 1 : s) + d)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "TEXTAREA";
      if (e.key === "Escape") onClose();
      if (!typing && e.key === "ArrowLeft") go(-1);
      if (!typing && e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const submit = async (status: ReviewStatus, feedback?: string) => {
    setSaving(true);
    try {
      const res = await api.post(`/admin/photographer-applications/${applicationId}/reviews`, {
        item_type: item.type,
        item_ref: item.ref,
        status,
        feedback: feedback ?? null,
      });
      const next = unwrapObject(res.data)?.checklist;
      if (next) onChecklistChange(next);
      toast.success(status === "reviewed" ? "Marked as reviewed." : status === "needs_revision" ? "Flagged for revision." : "Reset to pending.");
      setFlagging(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save the review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-bold text-base">{item.label}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.type === "portfolio_image" ? "Portfolio" : "Verification document"} · {item.filename} · {index + 1} of {total}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Close preview">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Viewer */}
        <div className="relative flex-1 min-h-[40vh] bg-muted/30 flex overflow-auto p-3">
          {file.loading && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground m-auto" />}
          {file.failed && <p className="text-sm text-destructive m-auto">Couldn't load this file.</p>}
          {file.url && file.isImage && (
            <img
              src={file.url}
              alt={item.label}
              style={scale === "fit" ? undefined : { width: `${scale * 100}%`, maxWidth: "none" }}
              className={scale === "fit" ? "max-w-full max-h-[62vh] object-contain m-auto" : "h-auto m-auto"}
            />
          )}
          {file.url && !file.isImage && (
            <iframe src={file.url} title={item.label} className="w-full h-[62vh] bg-white rounded m-auto" />
          )}

          {total > 1 && (
            <>
              <Button variant="secondary" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow" onClick={() => go(-1)} aria-label="Previous">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow" onClick={() => go(1)} aria-label="Next">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-4 space-y-3">
          {item.status === "needs_revision" && item.feedback && (
            <p className="text-xs rounded-md border border-orange-200 bg-orange-500/5 text-orange-800 p-2">
              <span className="font-semibold">Flagged:</span> {item.feedback}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {file.isImage && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setScale("fit")} disabled={scale === "fit"}>
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Fit
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomBy(-0.5)} aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoomBy(0.5)} aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></Button>
                </>
              )}
              <Button variant="outline" size="sm" asChild disabled={!file.url}>
                <a href={file.url ?? undefined} download={`${item.label}.${item.extension}`}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </a>
              </Button>
            </div>

            {canReview && !flagging && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-700 border-orange-300 hover:bg-orange-50"
                  disabled={saving}
                  onClick={() => setFlagging(true)}
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Needs revision
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={saving || item.status === "reviewed"}
                  onClick={() => submit("reviewed")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {item.status === "reviewed" ? "Reviewed" : "Mark as reviewed"}
                </Button>
              </div>
            )}
            {!canReview && <p className="text-xs text-muted-foreground">Reviews are locked: this application isn't pending review.</p>}
          </div>

          {canReview && flagging && (
            <div className="space-y-2">
              <label className="text-xs font-semibold flex justify-between">
                <span>What needs to be fixed?</span>
                <span className="text-destructive">* Required</span>
              </label>
              <Textarea
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The photo is blurry. Please upload a clearer one."
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setFlagging(false)} disabled={saving}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={saving || !reason.trim()}
                  onClick={() => submit("needs_revision", reason.trim())}
                >
                  {saving ? "Saving…" : "Flag for revision"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ApplicationReviewPanel({
  applicationId, checklist, canReview, onChecklistChange,
}: {
  applicationId: number;
  checklist: Checklist;
  canReview: boolean;
  onChecklistChange: (c: Checklist) => void;
}) {
  const [preview, setPreview] = useState<{ group: "documents" | "portfolio"; index: number } | null>(null);
  const { requirements, items, summary } = checklist;

  const documents = items.filter((i) => i.type !== "portfolio_image");
  const portfolio = items.filter((i) => i.type === "portfolio_image");
  const identity = documents.filter((i) => i.type !== "additional_document");
  const additional = documents.filter((i) => i.type === "additional_document");

  const previewList = preview?.group === "portfolio" ? portfolio : documents;
  const open = (group: "documents" | "portfolio", list: ReviewItem[], item: ReviewItem) =>
    setPreview({ group, index: list.indexOf(item) });

  const heading = "font-heading font-bold text-sm border-b border-border/50 pb-2 flex items-center gap-2";
  const card = "bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4";

  return (
    <div className="space-y-6">
      {/* 1. Review summary */}
      <section className={card}>
        <h3 className={heading}><ClipboardCheck className="w-4 h-4 text-primary" /> Application Review Summary</h3>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold">{summary.required_submitted} of {summary.required_total} required items submitted</span>
          </div>
          <Bar value={summary.required_submitted} total={summary.required_total} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold">{summary.reviewed_count} of {summary.reviewable_total} files reviewed</span>
          </div>
          <Bar value={summary.reviewed_count} total={summary.reviewable_total} tone="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Missing required" value={summary.missing_required.length} tone="text-rose-600" />
          <Stat label="Awaiting review" value={summary.pending_count} tone="text-amber-600" />
          <Stat label="Needs revision" value={summary.needs_revision_count} tone="text-orange-600" />
          <Stat label="Reviewed" value={summary.reviewed_count} tone="text-emerald-600" />
        </div>

        {summary.ready_for_approval ? (
          <p className="text-sm rounded-lg border border-emerald-200 bg-emerald-500/5 text-emerald-800 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Ready for approval: every required item is submitted and every file is reviewed.
          </p>
        ) : (
          <div className="text-sm rounded-lg border border-amber-200 bg-amber-500/5 text-amber-900 p-3">
            <p className="font-semibold mb-1">Not ready for approval yet</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {summary.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* 2. Requirements checklist */}
      <section className={card}>
        <h3 className={heading}><ClipboardCheck className="w-4 h-4 text-primary" /> Application Requirements</h3>
        <ul className="divide-y divide-border/50">
          {requirements.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {r.label} {!r.required && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
              </div>
              <StatusBadge status={r.status} optional={!r.required} />
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Identity documents */}
      <section className={card}>
        <h3 className={heading}><FileText className="w-4 h-4 text-primary" /> Identity Verification Documents</h3>
        {identity.length === 0 && <p className="text-xs text-muted-foreground">No identity documents submitted.</p>}
        <div className="space-y-2">
          {identity.map((item) => <ItemRow key={item.type + item.ref} item={item} onOpen={() => open("documents", documents, item)} />)}
        </div>
      </section>

      {/* 4. Additional documents */}
      <section className={card}>
        <h3 className={heading}><FileText className="w-4 h-4 text-primary" /> Additional Supporting Documents ({additional.length})</h3>
        {additional.length === 0 && <p className="text-xs text-muted-foreground">No additional documents submitted.</p>}
        <div className="space-y-2">
          {additional.map((item) => <ItemRow key={item.type + item.ref} item={item} onOpen={() => open("documents", documents, item)} />)}
        </div>
      </section>

      {/* 5. Portfolio */}
      <section className={card}>
        <h3 className={heading}><Camera className="w-4 h-4 text-primary" /> Photography Portfolio ({portfolio.length})</h3>
        {portfolio.length === 0 ? (
          <p className="text-xs text-muted-foreground">No portfolio images submitted.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {portfolio.map((item) => <Thumb key={item.ref} item={item} onOpen={() => open("portfolio", portfolio, item)} />)}
          </div>
        )}
      </section>

      {preview && previewList.length > 0 && (
        <PreviewModal
          items={previewList}
          index={Math.min(preview.index, previewList.length - 1)}
          onIndex={(i) => setPreview({ ...preview, index: i })}
          onClose={() => setPreview(null)}
          canReview={canReview}
          applicationId={applicationId}
          onChecklistChange={onChecklistChange}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped, collapsible checklist used inside the Admin Verifications modal.
// Everything shown here comes from checklist.groups / checklist.items returned by
// the backend; nothing is computed or hard-coded on the client.
// ---------------------------------------------------------------------------

const GROUP_ICONS: Record<string, typeof Clock> = { portfolio: Camera, identity: FileText, business_documents: FileText };

function groupNeedsAttention(g: ChecklistGroup) {
  return g.missing_count > 0 || g.needs_revision_count > 0 || g.pending_count > 0;
}

function RowValue({ row }: { row: ChecklistRow }) {
  if (Array.isArray(row.value)) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {row.value.map((v) => <Badge key={v} variant="outline" className="text-xs font-normal">{v}</Badge>)}
      </div>
    );
  }
  if (row.value) return <p className="text-sm text-foreground break-words whitespace-pre-line mt-0.5">{row.value}</p>;
  return <p className="text-sm text-muted-foreground mt-0.5">{row.detail ?? "—"}</p>;
}

function GroupSection({
  group, items, open, onToggle, onOpenFile, onOpenPortfolio,
}: {
  group: ChecklistGroup;
  items: ReviewItem[];
  open: boolean;
  onToggle: () => void;
  onOpenFile: (item: ReviewItem) => void;
  onOpenPortfolio: (item: ReviewItem) => void;
}) {
  // One badge for the collapsed header: the most urgent thing first.
  const headerStatus: RequirementStatus | null =
    group.missing_count > 0 ? "missing"
    : group.needs_revision_count > 0 ? "needs_revision"
    : group.pending_count > 0 ? "pending"
    : group.reviewed_count > 0 ? "reviewed"
    : group.required_total > 0 ? "submitted"
    : null;
  const Icon = GROUP_ICONS[group.key] ?? ClipboardCheck;

  return (
    <section className={`rounded-xl border bg-background ${group.missing_count > 0 ? "border-rose-300" : "border-border/60"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="font-heading font-bold text-sm flex-1 min-w-0 truncate">{group.label}</span>
        {group.required_total > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">{group.required_submitted}/{group.required_total} required</span>
        )}
        {group.missing_count > 0 && (
          <Badge variant="secondary" className={`${STATUS_META.missing.className} shrink-0`}>{group.missing_count} missing</Badge>
        )}
        {group.missing_count === 0 && headerStatus && <StatusBadge status={headerStatus} />}
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="divide-y divide-border/50 border-t border-border/50">
          {group.rows.map((row) => {
            const files = row.kind === "files" ? items.filter((i) => i.type === row.item_type) : [];
            return (
              <li key={row.key} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {row.label}{" "}
                      <span className="font-normal">({row.required ? "required" : "optional"})</span>
                    </p>
                    {row.kind === "field" ? <RowValue row={row} /> : <p className="text-sm text-muted-foreground mt-0.5">{row.detail}</p>}
                    {row.kind === "field" && row.value && row.detail && (
                      <p className="text-xs text-rose-600 mt-0.5">{row.detail}</p>
                    )}
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                {row.kind === "files" && files.length > 0 && (
                  row.item_type === "portfolio_image" ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {files.map((item) => <Thumb key={item.ref} item={item} onOpen={() => onOpenPortfolio(item)} />)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((item) => <ItemRow key={item.type + item.ref} item={item} onOpen={() => onOpenFile(item)} />)}
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ApplicationChecklist({
  applicationId, checklist, canReview, onChecklistChange,
}: {
  applicationId: number;
  checklist: Checklist;
  canReview: boolean;
  onChecklistChange: (c: Checklist) => void;
}) {
  const groups = checklist.groups ?? [];
  const { summary, items } = checklist;
  const [preview, setPreview] = useState<{ group: "documents" | "portfolio"; index: number } | null>(null);
  // Groups that need attention start open; the rest stay collapsed to keep the modal short.
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const isOpen = (g: ChecklistGroup) => openKeys[g.key] ?? groupNeedsAttention(g);
  const setAll = (value: boolean) => setOpenKeys(Object.fromEntries(groups.map((g) => [g.key, value])));
  const allOpen = groups.length > 0 && groups.every(isOpen);

  const documents = items.filter((i) => i.type !== "portfolio_image");
  const portfolio = items.filter((i) => i.type === "portfolio_image");
  const previewList = preview?.group === "portfolio" ? portfolio : documents;

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Checklist details are unavailable for this application.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" /> Application Completion
          </h3>
          {summary.ready_for_approval ? (
            <Badge variant="secondary" className={STATUS_META.reviewed.className}><CheckCircle2 className="w-3 h-3 mr-1" /> Ready for approval</Badge>
          ) : (
            <Badge variant="secondary" className={STATUS_META.pending.className}><Clock className="w-3 h-3 mr-1" /> Not ready for approval</Badge>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold">{summary.required_submitted} of {summary.required_total} required items submitted</span>
            <span className="text-muted-foreground">
              {summary.required_total > 0 ? Math.round((summary.required_submitted / summary.required_total) * 100) : 0}%
            </span>
          </div>
          <Bar value={summary.required_submitted} total={summary.required_total} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold">{summary.reviewed_count} of {summary.reviewable_total} files reviewed</span>
          </div>
          <Bar value={summary.reviewed_count} total={summary.reviewable_total} tone="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Missing required" value={summary.missing_required.length} tone="text-rose-600" />
          <Stat label="Pending Review" value={summary.pending_count} tone="text-amber-600" />
          <Stat label="Needs Revision" value={summary.needs_revision_count} tone="text-orange-600" />
          <Stat label="Reviewed" value={summary.reviewed_count} tone="text-emerald-600" />
        </div>

        {summary.missing_required.length > 0 && (
          <p className="text-xs rounded-lg border border-rose-200 bg-rose-500/5 text-rose-800 p-2.5">
            <span className="font-semibold">Missing required: </span>{summary.missing_required.join(", ")}
          </p>
        )}
        {!summary.ready_for_approval && summary.blockers.length > 0 && (
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-900">
            {summary.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        {!canReview && (
          <p className="text-xs text-muted-foreground">Item reviews are locked: this application isn't pending review.</p>
        )}
      </section>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAll(!allOpen)}>
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {groups.map((g) => (
        <GroupSection
          key={g.key}
          group={g}
          items={items}
          open={isOpen(g)}
          onToggle={() => setOpenKeys((prev) => ({ ...prev, [g.key]: !isOpen(g) }))}
          onOpenFile={(item) => setPreview({ group: "documents", index: documents.indexOf(item) })}
          onOpenPortfolio={(item) => setPreview({ group: "portfolio", index: portfolio.indexOf(item) })}
        />
      ))}

      {preview && previewList.length > 0 && (
        <PreviewModal
          items={previewList}
          index={Math.min(preview.index, previewList.length - 1)}
          onIndex={(i) => setPreview({ ...preview, index: i })}
          onClose={() => setPreview(null)}
          canReview={canReview}
          applicationId={applicationId}
          onChecklistChange={onChecklistChange}
        />
      )}
    </div>
  );
}
