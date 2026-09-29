import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw,
  FileText, Building2, User, Eye, Camera, Briefcase, Clock, AlertCircle, Loader2,
} from "lucide-react";

type ApplicationStatus = "draft" | "pending_review" | "revision_requested" | "approved" | "rejected";
type DocType = "government-id" | "selfie-with-id" | "business-permit";

interface ApplicationDetail {
  id: number;
  photographerType: "freelancer" | "studio";
  status: ApplicationStatus;
  businessName: string | null;
  location: string | null;
  yearsActive: number | null;
  teamSize: number | null;
  services: string[];
  otherServices: string | null;
  coverageArea: string | null;
  shootingTypes: string[];
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
  applicant: { id: number; name: string; email: string; accountStatus: string } | null;
}

// Unwraps the success envelope for a single (non-list) resource.
function unwrapObject(payload: any): any {
  let cur = payload;
  for (let i = 0; i < 4 && cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur; i++) {
    cur = cur.data;
  }
  return cur && typeof cur === "object" ? cur : {};
}

function fromApi(raw: any): ApplicationDetail {
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
    applicant: raw.applicant
      ? { id: raw.applicant.id, name: raw.applicant.name, email: raw.applicant.email, accountStatus: raw.applicant.account_status }
      : null,
  };
}

const formatMoney = (v: string | null) => (v == null ? "—" : `₱${Number(v).toLocaleString()}`);
const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

function statusBadge(status: ApplicationStatus) {
  if (status === "pending_review")
    return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
  if (status === "revision_requested")
    return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200"><AlertCircle className="w-3 h-3 mr-1" /> Revision Requested</Badge>;
  if (status === "approved")
    return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
  if (status === "rejected")
    return <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 border-rose-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
  return <Badge variant="secondary" className="bg-muted text-muted-foreground">Draft</Badge>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block font-semibold">{label}</span>
      <p className="font-medium">{children || "—"}</p>
    </div>
  );
}

// Documents are stored on a private disk and served through an authenticated
// endpoint, so they must be fetched with the bearer token as a blob (a plain
// <img src> or <a href> would be sent without the Authorization header).
function DocumentCard({
  applicationId, type, title, icon, submitted, tall,
}: {
  applicationId: number;
  type: DocType;
  title: string;
  icon: ReactNode;
  submitted: boolean;
  tall?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(submitted);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!submitted) {
      setLoading(false);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api.get(`/admin/photographer-applications/${applicationId}/documents/${type}`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
        setIsImage(String(res.data?.type ?? "").startsWith("image/"));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId, type, submitted]);

  return (
    <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-border/50 pb-2">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">{icon} {title}</h3>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
            <Eye className="w-3.5 h-3.5" /> View
          </a>
        )}
      </div>

      <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-2 min-h-24">
        {!submitted && <p className="text-xs text-muted-foreground py-6">Not submitted.</p>}
        {submitted && loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {submitted && failed && <p className="text-xs text-destructive py-6">Couldn't load this document.</p>}
        {submitted && url && isImage && (
          <img src={url} alt={title} className={`${tall ? "max-h-72" : "max-h-48"} w-full object-contain rounded`} />
        )}
        {submitted && url && !isImage && (
          <p className="text-xs text-muted-foreground py-6">Preview unavailable — use View to open the file.</p>
        )}
      </div>
    </section>
  );
}

export default function AdminReviewApplication() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [actionType, setActionType] = useState<"approve" | "reject" | "revision" | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    api.get(`/admin/photographer-applications/${id}`)
      .then((res) => {
        if (!cancelled) setApplication(fromApi(unwrapObject(res.data)));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getApiErrorMessage(err, "Failed to load this application."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const closeModal = () => {
    setActionType(null);
    setNote("");
  };

  const handleConfirmAction = async () => {
    if (!application || !actionType) return;

    if ((actionType === "reject" || actionType === "revision") && !note.trim()) {
      toast.error("Please provide a reason or notes for this action.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(`Processing ${actionType === "revision" ? "revision request" : actionType}…`);
    const name = application.businessName ?? application.applicant?.name ?? "this applicant";

    try {
      if (actionType === "approve") {
        await api.post(`/admin/photographer-applications/${application.id}/approve`);
        toast.success(`Application for "${name}" has been approved.`, { id: loadingToast });
      } else if (actionType === "reject") {
        await api.post(`/admin/photographer-applications/${application.id}/reject`, { reason: note });
        toast.error(`Application for "${name}" has been rejected.`, { id: loadingToast });
      } else {
        await api.post(`/admin/photographer-applications/${application.id}/request-revision`, { notes: note });
        toast.success(`Revision request sent to "${name}".`, { id: loadingToast });
      }

      closeModal();
      navigate("/admin/verifications");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "That action couldn't be completed."), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading application…
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || !application) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-24 text-center space-y-4">
          <p className="text-sm text-destructive">{loadError || "Application not found."}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/verifications"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Verifications</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isStudio = application.photographerType === "studio";
  const displayName = application.businessName ?? application.applicant?.name ?? `Application #${application.id}`;
  const canReview = application.status === "pending_review";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-fade-up pb-16">

        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/admin/verifications">
              <ArrowLeft className="w-4 h-4" /> Back to Verifications
            </Link>
          </Button>
          {statusBadge(application.status)}
        </div>

        {/* Page Title & Action Bar */}
        <div className="bg-card border border-border/60 rounded-xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold">{displayName}</h1>
              <Badge variant="secondary" className="capitalize">{application.photographerType}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Application ID: {application.id} • Submitted {formatDate(application.submittedAt)}
            </p>
          </div>

          {canReview && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300"
                onClick={() => setActionType("revision")}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Request Revision
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setActionType("reject")}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setActionType("approve")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Application
              </Button>
            </div>
          )}
        </div>

        {/* Previous review outcome, when there is one */}
        {application.status === "revision_requested" && application.revisionNotes && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-500/5 p-4 text-sm">
            <p className="font-semibold text-blue-700 mb-1">Revision requested</p>
            <p className="text-muted-foreground">{application.revisionNotes}</p>
          </div>
        )}
        {application.status === "rejected" && application.rejectionReason && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-500/5 p-4 text-sm">
            <p className="font-semibold text-rose-700 mb-1">Rejected</p>
            <p className="text-muted-foreground">{application.rejectionReason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="space-y-6 md:col-span-1">
            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Account Basics
              </h3>
              <div className="space-y-3 text-sm">
                <Field label="Full Name">{application.applicant?.name}</Field>
                <Field label="Email">{application.applicant?.email}</Field>
                <Field label="Account Status"><span className="capitalize">{application.applicant?.accountStatus}</span></Field>
              </div>
            </section>

            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Professional Details
              </h3>
              <div className="space-y-3 text-sm">
                <Field label={isStudio ? "Studio Address" : "Based In"}>{application.location}</Field>
                <Field label={isStudio ? "Years Operating" : "Years of Experience"}>
                  {application.yearsActive != null ? `${application.yearsActive} Years` : null}
                </Field>
                {isStudio && <Field label="Team Members">{application.teamSize}</Field>}
                <Field label="Coverage Area">{application.coverageArea}</Field>
                <Field label="Price Range">
                  {formatMoney(application.priceMin)} - {formatMoney(application.priceMax)}
                </Field>

                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block font-semibold">Services Offered</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {application.services.length === 0 && <span className="text-muted-foreground">—</span>}
                    {application.services.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">{service}</Badge>
                    ))}
                  </div>
                  {application.otherServices && (
                    <p className="text-xs text-muted-foreground mt-2">Other: {application.otherServices}</p>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Shooting Types</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {application.shootingTypes.length === 0 && <span className="text-muted-foreground">—</span>}
                    {application.shootingTypes.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs capitalize">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Documents */}
          <div className="space-y-6 md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DocumentCard
                applicationId={application.id}
                type="government-id"
                title="Government ID"
                icon={<FileText className="w-4 h-4 text-primary" />}
                submitted={application.documentsSubmitted.governmentId}
              />
              <DocumentCard
                applicationId={application.id}
                type="selfie-with-id"
                title="Selfie Holding Gov ID"
                icon={<Camera className="w-4 h-4 text-primary" />}
                submitted={application.documentsSubmitted.selfieWithId}
              />
            </div>

            {isStudio && (
              <DocumentCard
                applicationId={application.id}
                type="business-permit"
                title="Business Permit or DTI Registration"
                icon={<Building2 className="w-4 h-4 text-primary" />}
                submitted={application.documentsSubmitted.businessPermit}
                tall
              />
            )}

            {application.documentsSubmitted.additionalDocuments > 0 && (
              <p className="text-xs text-muted-foreground">
                + {application.documentsSubmitted.additionalDocuments} additional document(s) submitted (not previewable here).
              </p>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-xl rounded-xl w-full max-w-md p-6 animate-in zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                {actionType === "approve" && (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                {actionType === "reject" && (
                  <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                {actionType === "revision" && (
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-heading font-bold text-lg">
                    {actionType === "approve" && "Approve Application"}
                    {actionType === "reject" && "Reject Application"}
                    {actionType === "revision" && "Request Revision"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Target: <span className="font-semibold text-foreground">{displayName}</span>
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {actionType === "approve" && "Confirming this will grant verification status and unlock the professional's business dashboard access."}
                  {actionType === "reject" && "Please provide a rejection reason so the applicant is notified accordingly."}
                  {actionType === "revision" && "Specify the revision requirements (e.g., what documents or details need to be updated)."}
                </p>

                {actionType !== "approve" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>{actionType === "revision" ? "Revision Requirements" : "Rejection Reason"}</span>
                      <span className="text-destructive">* Required</span>
                    </label>
                    <Textarea
                      rows={3}
                      placeholder={
                        actionType === "revision"
                          ? "e.g., Selfie with Government ID is blurry. Please upload a clear photo."
                          : "e.g., Business permit expired. Documents failed authenticity verification."
                      }
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  className={
                    actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                    actionType === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" :
                    "bg-amber-600 hover:bg-amber-700 text-white"
                  }
                  onClick={handleConfirmAction}
                >
                  {isSubmitting ? "Processing…" : "Confirm Action"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
