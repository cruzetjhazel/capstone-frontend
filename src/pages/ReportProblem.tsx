import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { reportService, getApiErrorMessage, type ReportTarget, type ReportSeverity, type ReportRequestedAction } from "@/services/reportService";
import { ReportingNav, getReportsRoute } from "@/components/reporting/ReportingNav";
import { 
  AlertTriangle, Send, UploadCloud, 
  CheckCircle2, AlertCircle, FileText, X, ClipboardList, Loader2
} from "lucide-react";

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

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Field State
  const [target, setTarget] = useState(prefilledBooking ? "booking" : "");
  const [reason, setReason] = useState(isNoShowShortcut ? "Photographer no-show (didn't appear)" : "");
  const [otherReason, setOtherReason] = useState("");
  const [referenceId, setReferenceId] = useState(prefilledBooking || "");
  const [details, setDetails] = useState("");
  const [resolution, setResolution] = useState(isNoShowShortcut ? "refund" : "");
  const [files, setFiles] = useState<File[]>([]);

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
  const showReferenceField = ["booking", "payment", "client", "studio"].includes(target);
  const getReferenceLabel = () => {
    if (target === "booking") return "Booking ID";
    if (target === "payment") return "Transaction ID";
    if (target === "client" || target === "studio") return "User ID";
    return "Reference ID";
  };

  // Reset dependent fields when target changes
  useEffect(() => {
    if (!prefilledBooking && !isNoShowShortcut) {
      setReason("");
      setOtherReason("");
      setReferenceId("");
    }
  }, [target, prefilledBooking, isNoShowShortcut]);

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

  // Attachment Handling (Max 3 files, 2MB limit per file)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const validFiles: File[] = [];
    
    selectedFiles.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 2MB size limit.`);
        return;
      }
      validFiles.push(file);
    });

    const totalFiles = files.length + validFiles.length;
    
    if (totalFiles > 3) {
      toast.error("Maximum 3 attachments allowed.");
      const slotsLeft = 3 - files.length;
      if (slotsLeft > 0) {
        setFiles((prev) => [...prev, ...validFiles.slice(0, slotsLeft)]);
        toast.success(`Attached ${slotsLeft} file(s).`);
      }
    } else {
      setFiles((prev) => [...prev, ...validFiles]);
      if (validFiles.length > 0) {
        toast.success(`Attached ${validFiles.length} file(s) successfully.`);
      }
    }
    
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
        details,
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
        <div className="max-w-xl mx-auto animate-fade-up py-10 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-heading font-bold text-foreground">Report submitted</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Our Trust & Safety team has received your report and will begin reviewing it shortly.
            </p>
          </div>
          
          <div className="w-full bg-card border border-border/50 rounded-2xl p-5 space-y-4">
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
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-up py-4 sm:py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-heading font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-primary" />
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
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center border border-border/50 shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Reporting Specific Booking</p>
                <p className="font-mono font-bold text-sm text-foreground">{prefilledBooking}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearPrefill} className="text-xs h-8 text-muted-foreground hover:text-foreground">
              Change
            </Button>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* What are you reporting? + Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  What are you reporting? <span className="text-destructive">*</span>
                </label>
                <select 
                  required 
                  value={target} 
                  onChange={(e) => setTarget(e.target.value)} 
                  disabled={!!prefilledBooking} 
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:bg-muted"
                >
                  <option value="" disabled>Select subject</option>
                  {targetOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-semibold">
                  Reason <span className="text-destructive">*</span>
                </label>
                <select 
                  required 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  disabled={!target}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:bg-muted"
                >
                  <option value="" disabled>Select reason category</option>
                  {getReasonOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                
                {reason === "Other" && (
                  <div className="mt-1 space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Please specify <span className="text-destructive">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      autoFocus
                      placeholder="Tell us what you're reporting..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Reference (only shown when the subject needs one) */}
            {showReferenceField && (
              <div className="space-y-2 animate-in fade-in duration-200 max-w-sm">
                <label className="text-sm font-semibold flex justify-between">
                  <span>{getReferenceLabel()}</span>
                  {!prefilledBooking && <span className="text-muted-foreground text-xs font-normal">Optional</span>}
                </label>
                {prefilledBooking ? (
                  <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-foreground">{prefilledBooking}</span>
                    <span className="ml-auto text-[10px] uppercase font-bold bg-background px-1.5 py-0.5 rounded border border-border">Locked</span>
                  </div>
                ) : (
                  <input 
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder={`e.g., ${getReferenceLabel()}...`}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea 
                required 
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us what happened — include dates, times, and any relevant context..." 
                className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 pb-7 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" 
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/70 font-mono">
                {details.length} / 2000
              </div>
            </div>

            {/* How can we help? + Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-border/40">
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  How can we help? <span className="text-destructive">*</span>
                </label>
                <select 
                  required 
                  value={resolution} 
                  onChange={(e) => setResolution(e.target.value)} 
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

              <div className="space-y-2">
                <label className="text-sm font-semibold flex justify-between">
                  <span>Attachments</span>
                  <span className="text-muted-foreground text-xs font-normal">Optional • Max 3, 2MB each</span>
                </label>
                <div className="relative">
                  <input 
                    type="file" 
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={files.length >= 3}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  <div className={`flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-dashed border-input px-3 py-2 text-sm transition-colors ${files.length >= 3 ? 'bg-muted/50 text-muted-foreground/50' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
                    <UploadCloud className="w-4 h-4" />
                    {files.length >= 3 ? "Maximum files attached" : "Attach images or PDFs..."}
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-xl p-2 animate-in fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                            {file.type.startsWith("image/") ? (
                              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-medium truncate w-32 sm:w-48">{file.name}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeFile(index)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
