import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Clock, ArrowRight, CheckCircle2, XCircle,
  AlertCircle, MessageSquare,
  X, Filter, Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PillTabs } from "@/components/ListPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api, { getApiErrorMessage } from "@/lib/api";
import { ApplicationChecklist, buildRevisionNotes, getRevisionItems, type Checklist } from "@/components/admin/ApplicationReviewPanel";

// --- Types mapping to the real backend PhotographerApplicationResource (admin view) ---
export type PhotographerType = "freelancer" | "studio";
export type ApplicationStatus = "draft" | "pending_review" | "revision_requested" | "approved" | "rejected";

export interface ApplicationRecord {
  id: number;
  photographerType: PhotographerType;
  status: ApplicationStatus;
  businessName: string | null;
  location: string | null;
  yearsActive: number | null;
  teamSize: number | null;
  services: string[] | null;
  otherServices: string | null;
  coverageArea: string | null;
  shootingTypes: string[] | null;
  priceMin: string | null;
  priceMax: string | null;
  documentsSubmitted: {
    governmentId: boolean;
    selfieWithId: boolean;
    businessPermit: boolean;
    additionalDocuments: number;
  };
  submittedAt: string | null;
  revisionNotes: string | null;
  rejectionReason: string | null;
  canReapply: boolean;
  applicant: { id: number; name: string; email: string; accountStatus: string } | null;
}

function fromApi(raw: any): ApplicationRecord {
  return {
    id: raw.id,
    photographerType: raw.photographer_type,
    status: raw.status,
    businessName: raw.business_name,
    location: raw.location,
    yearsActive: raw.years_active,
    teamSize: raw.team_size,
    services: raw.services ?? [],
    otherServices: raw.other_services,
    coverageArea: raw.coverage_area,
    shootingTypes: raw.shooting_types ?? [],
    priceMin: raw.price_min,
    priceMax: raw.price_max,
    documentsSubmitted: {
      governmentId: Boolean(raw.documents_submitted?.government_id),
      selfieWithId: Boolean(raw.documents_submitted?.selfie_with_id),
      businessPermit: Boolean(raw.documents_submitted?.business_permit),
      additionalDocuments: raw.documents_submitted?.additional_documents ?? 0,
    },
    submittedAt: raw.submitted_at,
    revisionNotes: raw.revision_notes,
    rejectionReason: raw.rejection_reason,
    canReapply: Boolean(raw.can_reapply),
    applicant: raw.applicant
      ? { id: raw.applicant.id, name: raw.applicant.name, email: raw.applicant.email, accountStatus: raw.applicant.account_status }
      : null,
  };
}

// Handles the response whether the backend wraps the array under
// res.data.data, res.data.data.data, etc. — walks down until it finds
// the actual array, instead of assuming one fixed depth.
function unwrapList(payload: any): any[] {
  let cur = payload;
  for (let i = 0; i < 4 && cur && !Array.isArray(cur); i++) {
    cur = cur.data;
  }
  return Array.isArray(cur) ? cur : [];
}

// Unwraps the success envelope for a single (non-list) resource.
function unwrapObject(payload: any): any {
  let cur = payload;
  for (let i = 0; i < 4 && cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur; i++) cur = cur.data;
  return cur && typeof cur === "object" ? cur : {};
}

type ActionType = "approve" | "reject" | "revise" | null;

export default function AdminVerification() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewApp, setViewApp] = useState<ApplicationRecord | null>(null);

  // The list rows only carry summary data. The modal loads the full record (checklist,
  // documents, portfolio, profile) from the single-application endpoint when it opens.
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailReload, setDetailReload] = useState(0);

  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionNote, setActionNote] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchApplications = async (status: string) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const params = status !== "all" ? { status } : undefined;
      const res = await api.get("/admin/photographer-applications", { params });
      const list = unwrapList(res.data);
      setApps(list.map(fromApi));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Failed to load applications."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    
    fetchApplications(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!viewApp) {
      setChecklist(null);
      setDetailError("");
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    setChecklist(null);

    api.get(`/admin/photographer-applications/${viewApp.id}`)
      .then((res) => {
        if (cancelled) return;
        const next = unwrapObject(res.data)?.checklist ?? null;
        setChecklist(next);
        if (!next) setDetailError("The review checklist is unavailable for this application.");
      })
      .catch((err) => {
        if (!cancelled) setDetailError(getApiErrorMessage(err, "Failed to load the application details."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewApp?.id, detailReload]);

  const filteredApps = apps.filter((app) => {
    const q = searchTerm.toLowerCase();
    return (
      (app.businessName ?? "").toLowerCase().includes(q) ||
      (app.applicant?.name ?? "").toLowerCase().includes(q) ||
      (app.applicant?.email ?? "").toLowerCase().includes(q) ||
      String(app.id).includes(q)
    );
  });

  const autoRevisionText = checklist ? buildRevisionNotes(checklist) : "";
  const revisionItems = checklist ? getRevisionItems(checklist) : { missing: [], flagged: [] };
  const extraNotesLimit = Math.max(0, 1000 - autoRevisionText.length - (autoRevisionText ? 22 : 0));
  const composeRevisionNotes = () => {
    const extra = actionNote.trim();
    const extraBlock = extra ? (autoRevisionText ? `Additional notes:\n${extra}` : extra) : "";
    return [autoRevisionText, extraBlock].filter(Boolean).join("\n\n");
  };

  const handleConfirmAction = async () => {
    if (!viewApp || !actionType) return;

    // Revision message = the automatic checklist summary + the admin's optional extra notes.
    const revisionNotes = actionType === "revise" ? composeRevisionNotes() : "";

    if (actionType === "revise" && !revisionNotes) {
      toast.error("Please add revision instructions for the photographer.");
      return;
    }
    if (actionType === "reject" && !actionNote.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setIsSubmittingAction(true);
    try {
      let res;
      if (actionType === "approve") {
        res = await api.post(`/admin/photographer-applications/${viewApp.id}/approve`);
      } else if (actionType === "reject") {
        res = await api.post(`/admin/photographer-applications/${viewApp.id}/reject`, { reason: actionNote });
      } else {
        res = await api.post(`/admin/photographer-applications/${viewApp.id}/request-revision`, { notes: revisionNotes });
      }

      const updated = fromApi(res.data?.data ?? res.data);
      setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      if (actionType === "approve") toast.success(`Application for "${viewApp.businessName ?? viewApp.applicant?.name}" has been approved.`);
      else if (actionType === "reject") toast.error(`Application for "${viewApp.businessName ?? viewApp.applicant?.name}" has been rejected.`);
      else toast.success(`Revision request sent to "${viewApp.businessName ?? viewApp.applicant?.name}".`);

      setActionType(null);
      setActionNote("");
      setViewApp(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "That action couldn't be completed."));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const statusBadge = (status: ApplicationStatus) => {
    if (status === "pending_review")
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    if (status === "revision_requested")
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200"><AlertCircle className="w-3 h-3 mr-1" /> Revision Requested</Badge>;
    if (status === "approved")
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
    if (status === "rejected")
      return <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 border-rose-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Draft</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up pb-12">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Professional Applications</h1>
            <p className="text-sm text-muted-foreground mt-1">Review, verify, and approve Freelancer and Studio registrations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-sm px-3 py-1">
              {apps.filter((a) => a.status === "pending_review").length} Pending Review
            </Badge>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PillTabs
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={[
              { key: "all", label: "All" },
              { key: "pending_review", label: "Pending Review" },
              { key: "revision_requested", label: "Revision Requested" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
            ]}
            className="self-start"
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name, email, owner..."
              className="pl-9 h-10 rounded-xl bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border/50 uppercase text-xs tracking-wider">
                  <TableHead className="font-semibold px-4 py-3">Applicant / Business</TableHead>
                  <TableHead className="font-semibold px-4 py-3">Type</TableHead>
                  <TableHead className="font-semibold px-4 py-3">Application Status</TableHead>
                  <TableHead className="font-semibold px-4 py-3">Account Status</TableHead>
                  <TableHead className="font-semibold px-4 py-3">Submitted On</TableHead>
                  <TableHead className="font-semibold px-4 py-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading applications…
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && loadError && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-rose-600">
                      {loadError}
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !loadError && filteredApps.map((app) => (
                  <TableRow key={app.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{app.businessName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{app.applicant?.name} • {app.applicant?.email}</p>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${app.photographerType === "studio" ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-200"}`}>
                        {app.photographerType}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-3">{statusBadge(app.status)}</TableCell>

                    <TableCell className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md border uppercase tracking-wider ${
                          app.applicant?.accountStatus?.toLowerCase() === "active"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {app.applicant?.accountStatus ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setViewApp(app)} className="h-8 rounded-lg">
                        Review Details <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!isLoading && !loadError && filteredApps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No applications match the selected filter criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ----------------------------- */}
      {/* DETAILED VERIFICATION MODAL   */}
      {/* ----------------------------- */}
      {viewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative">

            <button
              onClick={() => setViewApp(null)}
              className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground transition-colors p-1 bg-background/50 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-muted/30 px-6 py-5 border-b border-border flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold font-heading">{viewApp.businessName || viewApp.applicant?.name}</h2>
                  <Badge variant="outline" className={`capitalize ${viewApp.photographerType === "studio" ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-200"}`}>
                    {viewApp.photographerType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Application ID: <span className="font-mono">{viewApp.id}</span>
                  {viewApp.applicant && <> • User ID: <span className="font-mono">{viewApp.applicant.id}</span></>}
                  {viewApp.submittedAt && <> • Submitted: {new Date(viewApp.submittedAt).toLocaleString()}</>}
                </p>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">

              {/* Revision / rejection history if any */}
              {viewApp.revisionNotes && (
                <div className="bg-amber-500/10 border border-amber-200 text-amber-900 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Previous Revision Notes Sent to Applicant:
                  </p>
                  <p className="text-sm italic">"{viewApp.revisionNotes}"</p>
                </div>
              )}
              {viewApp.rejectionReason && (
                <div className="bg-rose-500/10 border border-rose-200 text-rose-900 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Rejection Reason:
                  </p>
                  <p className="text-sm italic">"{viewApp.rejectionReason}"</p>
                </div>
              )}

              {detailLoading && (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading application details…
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-rose-600">{detailError}</p>
                  <Button variant="outline" size="sm" onClick={() => setDetailReload((n) => n + 1)}>Try again</Button>
                </div>
              )}

              {!detailLoading && checklist && (
                <ApplicationChecklist
                  applicationId={viewApp.id}
                  checklist={checklist}
                  canReview={viewApp.status === "pending_review"}
                  onChecklistChange={setChecklist}
                />
              )}
            </div>

            <div className="bg-muted/30 px-6 py-4 border-t border-border flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-border"
                onClick={() => setActionType("reject")}
                disabled={viewApp.status === "approved" || viewApp.status === "rejected"}
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject Application
              </Button>

              <Button
                variant="outline"
                className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-border"
                onClick={() => {
                  setActionNote("");
                  setActionType("revise");
                }}
                disabled={viewApp.status === "approved" || viewApp.status === "rejected"}
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Request Revision
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setActionType("approve")}
                disabled={viewApp.status !== "pending_review" || detailLoading || !checklist?.summary.ready_for_approval}
                title={
                  viewApp.status !== "pending_review"
                    ? "Only applications pending review can be approved."
                    : checklist && !checklist.summary.ready_for_approval
                      ? checklist.summary.blockers[0] ?? "Resolve the outstanding items first."
                      : undefined
                }
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Verify
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* CONFIRMATION ACTION MODAL     */}
      {/* ----------------------------- */}
      {actionType && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 relative p-6">
            <button
              onClick={() => { setActionType(null); setActionNote(""); }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isSubmittingAction}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {actionType === "approve" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {actionType === "reject" && <XCircle className="w-5 h-5 text-rose-600" />}
                {actionType === "revise" && <AlertCircle className="w-5 h-5 text-amber-600" />}

                {actionType === "approve" && "Confirm Application Approval"}
                {actionType === "reject" && "Confirm Rejection"}
                {actionType === "revise" && "Request Revisions"}
              </h2>

              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {actionType === "approve" && "Are you sure you want to approve this application? The professional will gain full business dashboard access."}
                {actionType === "reject" && "Provide a reason for rejecting this application. The applicant will be notified."}
                {actionType === "revise" && "Specify the changes or re-uploads required from the applicant before approval."}
              </p>
            </div>

            {actionType === "revise" && (
              <div className="py-2 space-y-4">
                {(revisionItems.missing.length > 0 || revisionItems.flagged.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5">Sent automatically from the checklist</p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                      {revisionItems.missing.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">Missing required ({revisionItems.missing.length})</p>
                          <ul className="space-y-1">
                            {revisionItems.missing.map((m) => (
                              <li key={m} className="flex items-start gap-2 text-xs">
                                <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-px" /> <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {revisionItems.flagged.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-1">Needs revision ({revisionItems.flagged.length})</p>
                          <ul className="space-y-1">
                            {revisionItems.flagged.map((f) => (
                              <li key={f.label} className="flex items-start gap-2 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-px" />
                                <span><span className="font-medium">{f.label}</span>{f.feedback && <span className="text-muted-foreground"> — {f.feedback}</span>}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold mb-1 flex justify-between">
                    <span>
                      Additional notes{" "}
                      {autoRevisionText ? <span className="font-normal text-muted-foreground">(optional)</span> : <span className="text-rose-500">*</span>}
                    </span>
                    <span className="font-normal text-muted-foreground">{actionNote.length}/{extraNotesLimit}</span>
                  </label>
                  <textarea
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Anything else the applicant should know? e.g. Your selfie is blurry, please retake it."
                    value={actionNote}
                    maxLength={extraNotesLimit}
                    onChange={(e) => setActionNote(e.target.value)}
                    disabled={isSubmittingAction}
                  />
                </div>
              </div>
            )}

            {actionType === "reject" && (
              <div className="py-2">
                <label className="text-xs font-semibold mb-1 block">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="E.g., Submitted documents don't meet verification requirements."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  disabled={isSubmittingAction}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setActionType(null); setActionNote(""); }} disabled={isSubmittingAction}>Cancel</Button>
              <Button
                onClick={handleConfirmAction}
                disabled={isSubmittingAction}
                className={
                  actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                  actionType === "reject" ? "bg-rose-600 hover:bg-rose-700 text-white" :
                  "bg-amber-600 hover:bg-amber-700 text-white"
                }
              >
                {isSubmittingAction && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {actionType === "approve" && "Yes, Approve"}
                {actionType === "reject" && "Yes, Reject"}
                {actionType === "revise" && "Send Revision Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}