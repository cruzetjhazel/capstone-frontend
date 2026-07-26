import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Clock, ArrowRight, CheckCircle2, XCircle,
  MapPin, Mail, Camera,
  FileText, ShieldCheck, User,
  DollarSign, Eye, AlertCircle, MessageSquare, Compass,
  X, Check, Filter, Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api, { getApiErrorMessage } from "@/lib/api";

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

type ActionType = "approve" | "reject" | "revise" | null;
type DocType = "government-id" | "selfie-with-id" | "business-permit";

export default function AdminVerification() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewApp, setViewApp] = useState<ApplicationRecord | null>(null);

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

  const filteredApps = apps.filter((app) => {
    const q = searchTerm.toLowerCase();
    return (
      (app.businessName ?? "").toLowerCase().includes(q) ||
      (app.applicant?.name ?? "").toLowerCase().includes(q) ||
      (app.applicant?.email ?? "").toLowerCase().includes(q) ||
      String(app.id).includes(q)
    );
  });

  const handleConfirmAction = async () => {
    if (!viewApp || !actionType) return;

    if (actionType === "revise" && !actionNote.trim()) {
      toast.error("Please provide clear revision instructions for the photographer.");
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
        res = await api.post(`/admin/photographer-applications/${viewApp.id}/request-revision`, { notes: actionNote });
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

  const viewDocument = async (applicationId: number, type: DocType, label: string) => {
    try {
      const res = await api.get(`/admin/photographer-applications/${applicationId}/documents/${type}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Couldn't open ${label}.`));
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
      <div className="max-w-7xl mx-auto animate-fade-up pb-12">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Professional Applications</h1>
            <p className="text-muted-foreground mt-1">Review, verify, and approve Freelancer and Studio registrations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-sm px-3 py-1">
              {apps.filter((a) => a.status === "pending_review").length} Pending Review
            </Badge>
          </div>
        </div>

        {/* Search, Filter Bar & Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">

            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name, email, owner..."
                className="pl-9 bg-background h-10 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                className="bg-background border border-border rounded-lg text-sm px-3 py-2 focus:ring-1 focus:ring-primary outline-none w-full sm:w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Application Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="revision_requested">Revision Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/10 uppercase text-xs tracking-wider">
                  <TableHead className="font-semibold px-5 py-3.5">Applicant / Business</TableHead>
                  <TableHead className="font-semibold px-5 py-3.5">Type</TableHead>
                  <TableHead className="font-semibold px-5 py-3.5">Application Status</TableHead>
                  <TableHead className="font-semibold px-5 py-3.5">Account Status</TableHead>
                  <TableHead className="font-semibold px-5 py-3.5">Submitted On</TableHead>
                  <TableHead className="font-semibold px-5 py-3.5 text-right">Action</TableHead>
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
                    <TableCell className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-foreground">{app.businessName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{app.applicant?.name} • {app.applicant?.email}</p>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-3.5">
                      <Badge variant="outline" className={`capitalize ${app.photographerType === "studio" ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-200"}`}>
                        {app.photographerType}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-3.5">{statusBadge(app.status)}</TableCell>

                    <TableCell className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border uppercase tracking-wider">
                        {app.applicant?.accountStatus ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-3.5 text-right">
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

            <div className="overflow-y-auto p-6 space-y-8">

              {/* Identity document checklist — this is the data the backend actually exposes for review */}
              <div className="p-4 rounded-xl border bg-muted/10 border-border">
                <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Identity Verification Documents
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                    <span className="text-xs flex items-center gap-2">
                      {viewApp.documentsSubmitted.governmentId ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                      Government ID
                    </span>
                    {viewApp.documentsSubmitted.governmentId && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewDocument(viewApp.id, "government-id", "Government ID")}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                    <span className="text-xs flex items-center gap-2">
                      {viewApp.documentsSubmitted.selfieWithId ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                      Selfie Holding ID
                    </span>
                    {viewApp.documentsSubmitted.selfieWithId && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewDocument(viewApp.id, "selfie-with-id", "Selfie Holding ID")}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    )}
                  </div>
                  {viewApp.photographerType === "studio" && (
                    <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                      <span className="text-xs flex items-center gap-2">
                        {viewApp.documentsSubmitted.businessPermit ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                        Business Permit / DTI
                      </span>
                      {viewApp.documentsSubmitted.businessPermit && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewDocument(viewApp.id, "business-permit", "Business Permit")}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      )}
                    </div>
                  )}
                  {viewApp.documentsSubmitted.additionalDocuments > 0 && (
                    <div className="flex items-center p-3 border border-border rounded-xl bg-background">
                      <span className="text-xs flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {viewApp.documentsSubmitted.additionalDocuments} additional document(s) submitted
                      </span>
                    </div>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                    <User className="w-4 h-4" /> Applicant & Business Profile
                  </h3>

                  <div className="bg-muted/20 p-4 rounded-xl border border-border/50 space-y-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Account Owner Full Name</p>
                      <p className="text-sm font-medium text-foreground">{viewApp.applicant?.name ?? "—"}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-0.5">Email Address</p>
                      <p className="font-medium flex items-center gap-1 break-all"><Mail className="w-3 h-3 text-muted-foreground shrink-0" /> {viewApp.applicant?.email ?? "—"}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-0.5">Location</p>
                      <p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground shrink-0" /> {viewApp.location || "—"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-2">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Years Active</p>
                        <p className="font-medium text-foreground">{viewApp.yearsActive ?? "—"}</p>
                      </div>
                      {viewApp.photographerType === "studio" && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Team Size</p>
                          <p className="font-medium text-foreground">{viewApp.teamSize ?? "—"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                    <Camera className="w-4 h-4" /> Service Offerings & Pricing
                  </h3>

                  <div className="bg-muted/20 p-4 rounded-xl border border-border/50 space-y-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Services Offered</p>
                      <div className="flex flex-wrap gap-1">
                        {(viewApp.services ?? []).map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-background border border-border rounded font-medium">{s}</span>
                        ))}
                        {viewApp.otherServices && (
                          <span className="px-2 py-0.5 bg-background border border-border rounded font-medium">{viewApp.otherServices}</span>
                        )}
                        {(viewApp.services ?? []).length === 0 && !viewApp.otherServices && "—"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground mb-1">Shooting Types</p>
                        <div className="flex flex-wrap gap-1">
                          {(viewApp.shootingTypes ?? []).map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-background border border-border rounded font-medium">{t}</span>
                          ))}
                          {(viewApp.shootingTypes ?? []).length === 0 && "—"}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Coverage Area</p>
                        <p className="font-medium flex items-center gap-1"><Compass className="w-3 h-3 text-muted-foreground" /> {viewApp.coverageArea || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-0.5">Base Price Range</p>
                      <p className="text-sm font-semibold text-emerald-600 flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        {viewApp.priceMin && viewApp.priceMax
                          ? `₱${Number(viewApp.priceMin).toLocaleString()} – ₱${Number(viewApp.priceMax).toLocaleString()}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                onClick={() => setActionType("revise")}
                disabled={viewApp.status === "approved" || viewApp.status === "rejected"}
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Request Revision
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setActionType("approve")}
                disabled={viewApp.status === "approved" || viewApp.status === "rejected"}
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

            {(actionType === "revise" || actionType === "reject") && (
              <div className="py-2">
                <label className="text-xs font-semibold mb-1 block">
                  {actionType === "revise" ? "Revision Instructions" : "Rejection Reason"} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={actionType === "revise"
                    ? "E.g., Your business permit document is expired. Please re-upload a valid business permit."
                    : "E.g., Submitted documents don't meet verification requirements."}
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