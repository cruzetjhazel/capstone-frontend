import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRole } from "@/contexts/RoleContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { reportService, getApiErrorMessage, type ReportTarget, type ReportSeverity, type ReportRequestedAction } from "@/services/reportService";
import { 
  AlertTriangle, Send, UploadCloud, 
  CheckCircle2, AlertCircle, FileText, X, ClipboardList
} from "lucide-react";

export default function ReportProblem() {
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL Pre-fill Logic (System Requirement: Pre-populated booking reference)
  const [prefilledBooking, setPrefilledBooking] = useState<string | null>(searchParams.get("bookingId"));

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Field State
  const [target, setTarget] = useState(prefilledBooking ? "booking" : "");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [referenceId, setReferenceId] = useState(prefilledBooking || "");
  const [severity, setSeverity] = useState("");
  const [details, setDetails] = useState("");
  const [resolution, setResolution] = useState("");
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
    if (!prefilledBooking) {
      setReason("");
      setOtherReason("");
      setReferenceId("");
    }
  }, [target, prefilledBooking]);

  const clearPrefill = () => {
    setPrefilledBooking(null);
    setTarget("");
    setReferenceId("");
    searchParams.delete("bookingId");
    setSearchParams(searchParams);
    toast.success("Cleared pre-filled booking selection");
  };

  // Evidence File Handling (Max 3 files, 2MB limit per file)
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
      toast.error("Maximum 3 evidence files allowed.");
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
    toast.success("File removed from report evidence");
  };

  // Submission Workflow
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !reason || !severity || !details || !resolution) {
      toast.error("Please fill out all required fields.");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);

    try {
      const report = await reportService.submit(role, {
        target_type: target as ReportTarget,
        reference_id: referenceId || undefined,
        reason: reason === "Other" ? otherReason : reason,
        severity: severity as ReportSeverity,
        details,
        requested_action: resolution as ReportRequestedAction,
        evidence: files,
      });
      setReferenceNumber(report.id);
      setShowConfirmModal(false);
      setIsSuccess(true); 
      toast.success("Report submitted to Trust & Safety team!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Submission failed. Please check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToReports = () => {
    const isPro = role === "studio";
    navigate(isPro ? "/studio/reports" : "/reports");
  };

  // -----------------------------------------------------------
  // SUCCESS VIEW
  // -----------------------------------------------------------
  if (isSuccess) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto animate-fade-up py-12 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Report Successfully Filed</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Our Trust & Safety administrators have received your report and will begin reviewing your case promptly.
          </p>
          
          <div className="w-full bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
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
              <div className="space-y-1 col-span-2 border-t border-border/50 pt-4 mt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Resolution Time</p>
                <p className="text-sm font-medium">24–48 Hours</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate(role === "studio" ? "/studio" : "/dashboard")}
              className="w-full sm:w-auto rounded-xl"
            >
              Return to Dashboard
            </Button>
            <Button onClick={navigateToReports} className="w-full sm:w-auto gap-2 rounded-xl">
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
    <>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-up py-4 sm:py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                Report a Problem
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Submit disputes, unexpected issues, or platform violations to our Trust & Safety team.
              </p>
            </div>
            
            <Button variant="outline" onClick={navigateToReports} className="shrink-0 gap-2 border-border/60 rounded-xl hover:bg-muted">
              <ClipboardList className="w-4 h-4" /> My Reports
            </Button>
          </div>

          {/* Context Banner for Pre-filled Booking */}
          {prefilledBooking && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/50 shadow-xs">
                  <FileText className="w-5 h-5 text-primary" />
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
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 sm:p-8 mb-10">
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              
              {/* Target & Reason Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-muted/20 rounded-2xl border border-border/40">
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
                    <input 
                      type="text"
                      required
                      autoFocus
                      placeholder="Specify reason..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="mt-3 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring animate-in fade-in"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reference ID Field */}
                {showReferenceField ? (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-sm font-semibold flex justify-between">
                      <span>{getReferenceLabel()}</span>
                      {!prefilledBooking && <span className="text-muted-foreground text-xs font-normal">Optional</span>}
                    </label>
                    {prefilledBooking ? (
                      <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-muted px-3 py-2 text-sm text-muted-foreground shadow-xs">
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
                ) : (
                  <div className="hidden md:block" />
                )}

                {/* Priority / Severity */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Urgency / Severity Level <span className="text-destructive">*</span>
                  </label>
                  <select 
                    required 
                    value={severity} 
                    onChange={(e) => setSeverity(e.target.value)} 
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="" disabled>Select severity</option>
                    <option value="low">Minor inconvenience</option>
                    <option value="medium">Payment problem</option>
                    <option value="high">Event is tomorrow</option>
                    <option value="urgent">Emergency / Safety Concern</option>
                  </select>
                </div>
              </div>

              {/* Character Count Controlled Details */}
              <div className="space-y-2 relative">
                <label className="text-sm font-semibold">
                  Detailed Explanation <span className="text-destructive">*</span>
                </label>
                <textarea 
                  required 
                  maxLength={2000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide precise details, dates, times, and surrounding context..." 
                  className="flex min-h-[140px] w-full rounded-xl border border-input bg-background px-3 py-2 pb-8 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" 
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/80 font-mono">
                  {details.length} / 2000
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expected Resolution Requirement */}
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
                    <option value="investigate">Investigate User</option>
                    <option value="refund">Refund Request</option>
                    <option value="cancel">Cancel Booking</option>
                    <option value="warn">Warn User</option>
                    <option value="remove_review">Remove Review</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Evidence Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex justify-between">
                    <span>Evidence / Attachments</span>
                    <span className="text-muted-foreground text-xs font-normal">Max 3 (2MB each)</span>
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
                      {files.length >= 3 ? "Maximum files attached" : "Attach Images or PDFs..."}
                    </div>
                  </div>
                  
                  {/* Evidence Previews */}
                  {files.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
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

              <div className="pt-6 border-t border-border/50 flex justify-end">
                <Button type="submit" className="w-full sm:w-auto gap-2 rounded-xl">
                  <Send className="w-4 h-4" /> Submit Report
                </Button>
              </div>
              
            </form>
          </div>
        </div>
      </DashboardLayout>

      {/* CONFIRMATION DIALOG MODAL */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-base">
              <Send className="w-5 h-5" /> Confirm Report Submission
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to log this report? Once submitted, information cannot be edited. Our Trust & Safety administrators will immediately review the submitted details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="rounded-xl text-xs bg-primary text-primary-foreground"
            >
              {isSubmitting ? "Submitting..." : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}