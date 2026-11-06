import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportService, getApiErrorMessage, type ReportTarget, type ReportSeverity, type ReportRequestedAction } from "@/services/reportService";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useBookings } from "@/hooks/useBookings";
import { RecordPicker, type PickerOption } from "@/components/reporting/RecordPicker";
import { ReportingNav, getReportsRoute } from "@/components/reporting/ReportingNav";
import { 
  AlertTriangle, Send, UploadCloud, 
  CheckCircle2, AlertCircle, FileText, X, ClipboardList, Loader2, ShieldCheck
} from "lucide-react";

// One style for every input/select so the whole form lines up.
const FIELD_CLASS =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:bg-muted";
const LABEL_CLASS = "text-xs font-semibold flex items-center justify-between min-h-[16px]";
const ATTACHMENT_MAX_FILES = 3;
const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
const ATTACHMENT_EXTENSIONS = ["png", "jpg", "jpeg", "pdf"];

// Reasons shown to clients, per subject (photographers keep their own list below).
// The booking list keeps "Photographer no-show (didn't appear)" exactly, because the no-show shortcut pre-selects it.
const CLIENT_REASONS: Record<string, string[]> = {
  studio: ["Unresponsive photographer", "Misleading information", "Unprofessional behavior", "Suspected scam / fraud", "Other"],
  booking: ["Photographer no-show (didn't appear)", "Service not delivered", "Booking dispute", "Incorrect booking details", "Other"],
  payment: ["Payment not reflected", "Incorrect amount", "Duplicate payment", "Refund concern", "Other"],
  bug: ["Technical error", "Page not working", "Submission problem", "Other"],
  other: ["Other"],
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  pending_match: "Pending",
  matched: "Matched",
  not_matched: "Not matched",
  manually_verified: "Verified",
  rejected: "Rejected",
};

type ClientPaymentRow = {
  id: number;
  booking_id: number;
  amount: number | string;
  reference_number: string | null;
  matching_status: string;
  payment_date: string;
};

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const bookingRef = (id: string | number) => `BK-${String(id).padStart(4, "0")}`;
const formatPeso = (n: number | string) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatShortDate = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function ReportProblem() {
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL Pre-fill Logic (System Requirement: Pre-populated booking reference)
  const [prefilledBooking, setPrefilledBooking] = useState<string | null>(searchParams.get("bookingId"));
  // Client protection: a booking's "Report a no-show" button links here with
  // ?bookingId=X&noShow=1 — this pre-selects the no-show reason and a
  // refund request so the client doesn't have to hunt through the generic
  // report form during what's already a stressful situation.
  const isNoShowShortcut = searchParams.get("noShow") === "1";
  // Profile links here with ?change=phone or ?change=email to request an account-detail change.
  const changeField = searchParams.get("change");
  const isChangeRequest = changeField === "phone" || changeField === "email";
  const changeLabel = changeField === "email" ? "Email address" : "Contact number";

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Field State
  const [target, setTarget] = useState(prefilledBooking ? "booking" : isChangeRequest ? "other" : "");
  const [reason, setReason] = useState(
    isNoShowShortcut ? "Photographer no-show (didn't appear)" : isChangeRequest ? "Other" : ""
  );
  const [otherReason, setOtherReason] = useState(isChangeRequest ? `${changeLabel} change request` : "");
  const [referenceId, setReferenceId] = useState(prefilledBooking || "");
  const [details, setDetails] = useState(
    isChangeRequest
      ? `I would like to change my registered ${changeLabel.toLowerCase()}.\n\nNew ${changeLabel.toLowerCase()}: \nReason for the change: `
      : ""
  );
  const [resolution, setResolution] = useState(isNoShowShortcut ? "refund" : isChangeRequest ? "other" : "");
  const [resolutionOther, setResolutionOther] = useState(isChangeRequest ? `${changeLabel} change` : "");
  const [files, setFiles] = useState<File[]>([]);

  // --- Client record pickers (clients only; photographers keep the typed field) ---
  const isClientReporter = role !== "studio";
  const [referenceOption, setReferenceOption] = useState<PickerOption | null>(null);
  const [photographerQuery, setPhotographerQuery] = useState("");
  const [debouncedPhotographerQuery, setDebouncedPhotographerQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPhotographerQuery(photographerQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [photographerQuery]);

  // /client/bookings and /client/payments only ever return the logged-in client's own records.
  const { data: clientBookings = [], isLoading: bookingsLoading } = useBookings(
    undefined,
    isClientReporter && target === "booking",
  );
  const { data: clientPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["client-payments-for-report"],
    queryFn: async () => (await api.get("/client/payments")).data.data as ClientPaymentRow[],
    enabled: isClientReporter && target === "payment",
    staleTime: 30_000,
  });
  const { data: photographerResults = [], isFetching: photographersLoading } = useQuery({
    queryKey: ["report-photographers", debouncedPhotographerQuery],
    queryFn: async () =>
      (await api.get("/client/reports/photographers", { params: { search: debouncedPhotographerQuery || undefined } }))
        .data.data as { id: number; name: string; type: string }[],
    enabled: isClientReporter && target === "studio",
    staleTime: 60_000,
  });

  const bookingOptions: PickerOption[] = clientBookings.map((b) => ({
    value: String(b.id),
    label: `${bookingRef(b.id)} · ${b.photographerName}`,
    description: `${titleCase(String(b.eventType))} · ${formatShortDate(b.date)} · ${titleCase(String(b.status))}`,
  }));
  const paymentOptions: PickerOption[] = clientPayments.map((p) => ({
    value: String(p.id),
    label: `${p.reference_number ?? `Payment #${p.id}`} · ${formatPeso(p.amount)}`,
    description: `${bookingRef(p.booking_id)} · ${PAYMENT_STATUS_LABELS[p.matching_status] ?? titleCase(p.matching_status)} · ${formatShortDate(p.payment_date)}`,
  }));
  const photographerOptions: PickerOption[] = photographerResults.map((p) => ({
    value: String(p.id),
    label: p.name,
    description: p.type,
  }));
  const prefilledOption = prefilledBooking ? bookingOptions.find((o) => o.value === prefilledBooking) ?? null : null;

  const handleRecordSelect = (opt: PickerOption | null) => {
    setReferenceOption(opt);
    setReferenceId(opt?.value ?? "");
  };

  const pickerConfig =
    target === "booking"
      ? { options: bookingOptions, loading: bookingsLoading, placeholder: "Select a booking", searchPlaceholder: "Search by photographer, event or date...", emptyText: "No bookings found." }
      : target === "payment"
      ? { options: paymentOptions, loading: paymentsLoading, placeholder: "Select a payment", searchPlaceholder: "Search by reference or amount...", emptyText: "No payments found." }
      : { options: photographerOptions, loading: photographersLoading, placeholder: "Search for a photographer or studio", searchPlaceholder: "Type a name...", emptyText: "No photographer found.", onSearchChange: setPhotographerQuery };

  // System Requirement: Dynamic Target Options based on Role (Studio/Freelancer vs Client)
  const targetOptions = role === "studio"
    ? [
        { value: "client", label: "Client" },
        { value: "booking", label: "Booking" },
        { value: "payment", label: "Payment" },
        { value: "bug", label: "Platform Bug" },
        { value: "other", label: "Other" }
      ]
    : [
        { value: "studio", label: "Studio / Professional" },
        { value: "booking", label: "Booking" },
        { value: "payment", label: "Payment" },
        { value: "bug", label: "Platform Bug" },
        { value: "other", label: "Other" }
      ];

  // System Requirement: Dynamic Reasons mapped strictly to System Specifications
  const getReasonOptions = () => {
    if (role !== "studio") return CLIENT_REASONS[target] ?? ["Other"];
    switch (target) {
      case "client":
      case "studio":
        return [
          "Didn't appear (No-show)",
          "Unresponsive",
          "Harassment / Inappropriate behavior",
          "Suspected scam / fraud",
          "Other"
        ];
      case "booking":
        return [
          "Photographer no-show (didn't appear)",
          "Fake booking",
          "Unfair cancellation",
          "Severe quality issues",
          "Other booking dispute",
          "Other"
        ];
      case "payment":
        return [
          "Payment dispute",
          "Refund requested",
          "Missing payout",
          "Unexpected charge",
          "Other"
        ];
      case "bug":
        return [
          "Login problem",
          "Website error",
          "App crash",
          "Other technical issue",
          "Other"
        ];
      default:
        return ["Other"];
    }
  };

  // Requirement: Auto-hide and dynamically name the reference field
  const showReferenceField = isClientReporter
    ? ["booking", "payment", "studio"].includes(target)
    : ["booking", "payment", "client", "studio"].includes(target);
  // Booking was already required by the backend; clients must also pick the photographer they report.
  const isRecordRequired = isClientReporter && (target === "booking" || target === "studio");
  const getReferenceLabel = () => {
    if (isClientReporter) {
      if (target === "booking") return "Booking";
      if (target === "payment") return "Payment";
      if (target === "studio") return "Photographer / Studio";
    }
    if (target === "booking") return "Booking ID";
    if (target === "payment") return "Transaction ID";
    if (target === "client" || target === "studio") return "User ID";
    return "Reference ID";
  };

  // Reset dependent fields when target changes
  useEffect(() => {
    if (!prefilledBooking && !isNoShowShortcut && !isChangeRequest) {
      setReason("");
      setOtherReason("");
      setReferenceId("");
      setReferenceOption(null);
      setPhotographerQuery("");
    }
  }, [target, prefilledBooking, isNoShowShortcut, isChangeRequest]);

  // "Other" subject has only one possible reason, so pick it for the person instead of making them choose.
  useEffect(() => {
    if (target === "other" && !isChangeRequest) setReason("Other");
  }, [target, isChangeRequest]);

  // Hide + clear the custom "Please specify" value whenever Reason moves off "Other"
  useEffect(() => {
    if (reason !== "Other") {
      setOtherReason("");
    }
  }, [reason]);

  const clearPrefill = () => {
    setPrefilledBooking(null);
    setTarget("");
    setReferenceId("");
    searchParams.delete("bookingId");
    setSearchParams(searchParams);
    toast.success("Cleared pre-filled booking selection");
  };

  // Attachments: PNG/JPG/JPEG/PDF only, max 3 files, 2 MB each (the server enforces the same rules).
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const accepted: File[] = [];
    const slotsLeft = ATTACHMENT_MAX_FILES - files.length;
    let limitShown = false;

    for (const file of Array.from(e.target.files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const typeOk = ["image/png", "image/jpeg", "application/pdf"].includes(file.type);
      if (!ATTACHMENT_EXTENSIONS.includes(ext) && !typeOk) {
        toast.error(`${file.name} isn't supported. Please attach a PNG, JPG, JPEG or PDF file.`);
        continue;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`${file.name} is larger than 2 MB. Please choose a smaller file.`);
        continue;
      }
      if (accepted.length >= slotsLeft) {
        if (!limitShown) toast.error(`You can attach up to ${ATTACHMENT_MAX_FILES} files per report.`);
        limitShown = true;
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
    e.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Submission Workflow — single-step submit, no extra confirmation gate.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!target || !reason || !details || !resolution) {
      toast.error("Please fill out all required fields.");
      return;
    }
    if (reason === "Other" && !otherReason.trim()) {
      toast.error("Please specify a reason.");
      return;
    }
    if (resolution === "other" && !resolutionOther.trim()) {
      toast.error("Please tell us what kind of help you need.");
      return;
    }
    if (isRecordRequired && !referenceId) {
      toast.error(target === "studio" ? "Please select the photographer or studio you are reporting." : "Please select the booking you are reporting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const report = await reportService.submit(role, {
        target_type: target as ReportTarget,
        reference_id: referenceId || undefined,
        reason: reason === "Other" ? otherReason : reason,
        // Severity is no longer collected from the user — reason, description, and
        // requested action give admins enough to triage priority themselves.
        // Sending a neutral default here only to satisfy reportService's current
        // request shape; drop this line entirely once `severity` is optional
        // (or removed) on that type.
        severity: "medium" as ReportSeverity,
        // The API has no field for a custom action, so it travels with the description.
        details: resolution === "other" ? `${details}\n\nRequested action: ${resolutionOther.trim()}` : details,
        requested_action: resolution as ReportRequestedAction,
        evidence: files,
      });
      setReferenceNumber(report.id);
      setIsSuccess(true);
      toast.success("Report submitted successfully.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Submission failed. Please check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------
  // SUCCESS VIEW
  // -----------------------------------------------------------
  if (isSuccess) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto animate-fade-up py-8 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-heading font-bold text-foreground">Report submitted</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Our Trust & Safety team has received your report and will begin reviewing it shortly.
            </p>
          </div>
          
          <div className="w-full bg-card border border-border/50 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Report Reference</p>
                <p className="font-mono font-bold text-primary text-base">{referenceNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Status</p>
                <p className="font-semibold text-amber-600 flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-4 h-4" /> Pending Review
                </p>
              </div>
              <div className="space-y-1 col-span-2 border-t border-border/50 pt-3 mt-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Response Time</p>
                <p className="text-sm font-medium">24–48 hours</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate(role === "studio" ? "/studio" : "/dashboard")}
              className="w-full sm:w-auto rounded-xl"
            >
              Return to Dashboard
            </Button>
            <Button onClick={() => navigate(getReportsRoute(role))} className="w-full sm:w-auto gap-2 rounded-xl">
              <ClipboardList className="w-4 h-4" /> View My Reports
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -----------------------------------------------------------
  // MAIN FORM VIEW
  // -----------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-8 animate-fade-up">
        
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-6 h-6 text-primary" />
              Report a Problem
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us what happened and we'll help resolve it.
            </p>
          </div>

          <ReportingNav active="report" />
        </div>

        {/* Context Banner for Pre-filled Booking */}
        {prefilledBooking && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center border border-border/50 shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Reporting Specific Booking</p>
                <p className="font-mono font-bold text-sm text-foreground">{isClientReporter ? bookingRef(prefilledBooking) : prefilledBooking}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearPrefill} className="text-xs h-8 text-muted-foreground hover:text-foreground">
              Change
            </Button>
          </div>
        )}

        {/* Context Banner for account-detail change requests (from Profile) */}
        {isChangeRequest && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center border border-border/50 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Account Change Request</p>
              <p className="text-sm font-semibold text-foreground">{changeLabel}</p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: subject + reason (always shown, always aligned) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>
                  <span>What are you reporting? <span className="text-destructive">*</span></span>
                </label>
                <select
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={!!prefilledBooking}
                  className={FIELD_CLASS}
                >
                  <option value="" disabled>Select subject</option>
                  {targetOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>
                  <span>Reason <span className="text-destructive">*</span></span>
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={!target || (target === "other" && !isChangeRequest)}
                  className={FIELD_CLASS}
                >
                  <option value="" disabled>Select reason category</option>
                  {getReasonOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reason details, full width, only for "Other" */}
            {reason === "Other" && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className={LABEL_CLASS}>
                  <span>Please specify the reason <span className="text-destructive">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="Briefly describe what you're reporting"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            )}

            {/* Record being reported (full width, only when the subject has one) */}
            {showReferenceField && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className={LABEL_CLASS}>
                  <span>
                    {getReferenceLabel()}
                    {isRecordRequired && <span className="text-destructive"> *</span>}
                  </span>
                  {!prefilledBooking && !isRecordRequired && (
                    <span className="text-muted-foreground text-xs font-normal">Optional</span>
                  )}
                </label>

                {prefilledBooking ? (
                  <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground truncate">
                      {isClientReporter ? (prefilledOption?.label ?? bookingRef(prefilledBooking)) : prefilledBooking}
                    </span>
                    <span className="ml-auto text-[10px] uppercase font-bold bg-background px-1.5 py-0.5 rounded border border-border">Locked</span>
                  </div>
                ) : isClientReporter ? (
                  <RecordPicker selected={referenceOption} onSelect={handleRecordSelect} {...pickerConfig} />
                ) : (
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder={`e.g., ${getReferenceLabel()}...`}
                    className={FIELD_CLASS}
                  />
                )}

                {isClientReporter && target === "payment" && !prefilledBooking && (
                  <p className="text-[11px] text-muted-foreground">
                    Can't find it? Leave this empty and describe the payment below.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>
                <span>Description <span className="text-destructive">*</span></span>
              </label>
              <div className="relative">
                <textarea
                  required
                  maxLength={2000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tell us what happened. Include dates, times, and any relevant context."
                  className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 pb-7 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <div className="absolute bottom-2.5 right-3 text-xs text-muted-foreground/70 font-mono">
                  {details.length} / 2000
                </div>
              </div>
            </div>

            {/* How can we help? (full width, with its own specify field) */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>
                  <span>How can we help? <span className="text-destructive">*</span></span>
                </label>
                <select
                  required
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="" disabled>Select requested action</option>
                  <option value="investigate">Look into this</option>
                  <option value="refund">Refund</option>
                  <option value="cancel">Cancel the booking</option>
                  <option value="warn">Warn the other party</option>
                  <option value="remove_review">Remove a review</option>
                  <option value="other">Something else</option>
                </select>
              </div>

              {resolution === "other" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className={LABEL_CLASS}>
                    <span>Please specify what you need <span className="text-destructive">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="Tell us what you'd like us to do"
                    value={resolutionOther}
                    onChange={(e) => setResolutionOther(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              )}

              {/* Attachments (full width so the hint and file list never skew the grid) */}
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>
                  <span>Attachments</span>
                  <span className="text-muted-foreground text-xs font-normal">Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    onChange={handleFileChange}
                    disabled={files.length >= ATTACHMENT_MAX_FILES}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  <div className={`flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-dashed border-input px-3 py-2 text-sm transition-colors ${files.length >= ATTACHMENT_MAX_FILES ? "bg-muted/50 text-muted-foreground/50" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                    <UploadCloud className="w-4 h-4" />
                    {files.length >= ATTACHMENT_MAX_FILES ? "Maximum files attached" : "Attach screenshots or documents"}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Screenshots, receipts or other proof. PNG, JPG, JPEG or PDF, up to 3 files, 2 MB each.
                </p>
                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 bg-muted/40 border border-border/50 rounded-xl p-2 animate-in fade-in">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                            {file.type.startsWith("image/") ? (
                              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-medium truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          aria-label={`Remove ${file.name}`}
                          className="p-1.5 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reminder about what reporting means */}
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                An administrator reviews every report and may contact the people involved, but a report does not guarantee a refund or any particular outcome. Reports that are false, fraudulent, or intentionally misleading may lead to account suspension or other platform action. Read our{" "}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  Terms and Conditions
                </Link>{" "}
                for what we can and can't do.
              </p>
            </div>

            <div className="pt-4 border-t border-border/40 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto gap-2 rounded-xl">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Report
                  </>
                )}
              </Button>
            </div>
            
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
