import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import toast, { Toaster } from "react-hot-toast";
import { 
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, 
  FileText, ExternalLink, Building2, User, Eye,
  Camera, Briefcase
} from "lucide-react";

export default function AdminReviewApplication() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock applicant details updated to match system requirements
  const [applicant] = useState({
    id: id || "app_1710001",
    professionalType: "studio", // Can be "freelancer" or "studio"
    
    // Common Account Basics
    fullName: "Juan Dela Cruz",
    email: "contact@lenscraft.com",
    phoneNumber: "+63 917 888 9999",
    
    // Freelancer/Studio Specifics
    brandName: "Lens Craft Studio", // Maps to Photography Brand Name or Studio / Business Name
    basedIn: "Bulan", // For Freelancers
    studioAddress: "123 Business Center, Bulan, Sorsogon", // For Studios
    yearsOfExperience: 5, // For Freelancers
    yearsOperating: 3, // For Studios
    teamMembers: 4, // For Studios
    
    // General Service Info
    services: ["Wedding", "Portrait", "Corporate Event"],
    coverageArea: "Anywhere in Sorsogon",
    shootingType: ["Indoor", "Outdoor"],
    minPrice: 5000,
    maxPrice: 25000,
    
    submittedAt: "2024-03-10",
    portfolioUrl: "https://lenscraft-portfolio.com",
    
    // Verification Documents
    govIdType: "Driver's License",
    govIdUrl: "https://via.placeholder.com/600x400.png?text=Government+ID+-+Front",
    selfieUrl: "https://via.placeholder.com/600x400.png?text=Selfie+Holding+Government+ID",
    businessPermitUrl: "https://via.placeholder.com/600x400.png?text=Business+Permit+or+DTI+Registration", // Only for Studio
    
    bio: "We are a full-service photography studio specializing in weddings, corporate events, and editorial portraits."
  });

  // Modal Control States
  const [actionType, setActionType] = useState<"approve" | "reject" | "revision" | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close modal and reset fields
  const closeModal = () => {
    setActionType(null);
    setNote("");
  };

  // Process Actions (Approve, Reject, Request Revision)
  const handleConfirmAction = async () => {
    if ((actionType === "reject" || actionType === "revision") && !note.trim()) {
      toast.error("Please provide a reason or notes for this action.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(`Processing ${actionType}...`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    toast.dismiss(loadingToast);

    if (actionType === "approve") {
      toast.success("Application successfully approved!");
    } else if (actionType === "reject") {
      toast.error("Application has been rejected.");
    } else if (actionType === "revision") {
      toast("Revision request sent to applicant.", { icon: "📝" });
    }

    closeModal();
    // Redirect back to list after action
    setTimeout(() => {
      navigate("/admin/verification");
    }, 1200);
  };

  return (
    <DashboardLayout>
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-5xl mx-auto animate-fade-up pb-16">
        
        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/admin/verification">
              <ArrowLeft className="w-4 h-4" /> Back to Pending Verifications
            </Link>
          </Button>
          <Badge variant="outline" className="capitalize text-sm font-semibold px-3 py-1">
            Status: Pending Review
          </Badge>
        </div>

        {/* Page Title & Action Bar */}
        <div className="bg-card border border-border/60 rounded-xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold">{applicant.brandName}</h1>
              <Badge variant="secondary" className="capitalize">
                {applicant.professionalType}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Application ID: {applicant.id} • Submitted {applicant.submittedAt}</p>
          </div>

          {/* Action Triggers */}
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
        </div>

        {/* ==========================================
            COMPLETE APPLICANT DETAILS SECTION
        ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Basic Information */}
          <div className="space-y-6 md:col-span-1">
            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Account Basics
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Full Name</span>
                  <p className="font-medium">{applicant.fullName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Email</span>
                  <p className="font-medium">{applicant.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Phone</span>
                  <p className="font-medium">{applicant.phoneNumber}</p>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Professional Details
              </h3>
              
              <div className="space-y-3 text-sm">
                {applicant.professionalType === "freelancer" ? (
                  <>
                    <div>
                      <span className="text-xs text-muted-foreground block font-semibold">Based In</span>
                      <p className="font-medium">{applicant.basedIn}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-semibold">Years of Experience</span>
                      <p className="font-medium">{applicant.yearsOfExperience} Years</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-xs text-muted-foreground block font-semibold">Studio Address</span>
                      <p className="font-medium">{applicant.studioAddress}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-semibold">Years Operating</span>
                      <p className="font-medium">{applicant.yearsOperating} Years</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-semibold">Team Members</span>
                      <p className="font-medium">{applicant.teamMembers}</p>
                    </div>
                  </>
                )}
                
                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block font-semibold">Services Offered</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {applicant.services.map((service, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{service}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Price Range</span>
                  <p className="font-medium">₱{applicant.minPrice.toLocaleString()} - ₱{applicant.maxPrice.toLocaleString()}</p>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-semibold">Portfolio / Website</span>
                  <a 
                    href={applicant.portfolioUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                  >
                    Visit Portfolio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Submitted Documents & Verification Attachments */}
          <div className="space-y-6 md:col-span-2">
            
            {/* Government ID Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Gov ID — Front ({applicant.govIdType})
                  </h3>
                  <a href={applicant.govIdUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                </div>
                
                <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-2">
                  <img 
                    src={applicant.govIdUrl} 
                    alt="Government ID" 
                    className="max-h-48 w-full object-contain rounded"
                  />
                </div>
              </section>

              {/* Selfie with ID */}
              <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" /> Selfie Holding Gov ID
                  </h3>
                  <a href={applicant.selfieUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                </div>
                
                <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-2">
                  <img 
                    src={applicant.selfieUrl} 
                    alt="Selfie with ID" 
                    className="max-h-48 w-full object-contain rounded"
                  />
                </div>
              </section>
            </div>

            {/* Business Permit / License (Only for Studio) */}
            {applicant.professionalType === "studio" && (
              <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Business Permit or DTI Registration
                  </h3>
                  <a href={applicant.businessPermitUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Eye className="w-3.5 h-3.5" /> Full View
                  </a>
                </div>
                
                <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-2">
                  <img 
                    src={applicant.businessPermitUrl} 
                    alt="Business Permit Document" 
                    className="max-h-72 w-full object-contain rounded"
                  />
                </div>
              </section>
            )}

          </div>
        </div>

        {/* ==========================================
            CONFIRMATION ACTION MODAL
        ========================================== */}
        {actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-xl rounded-xl w-full max-w-md p-6 animate-in zoom-in-95">
              
              {/* Modal Header */}
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
                  <h3 className="font-heading font-bold text-lg capitalize">
                    {actionType === "approve" && "Approve Application"}
                    {actionType === "reject" && "Reject Application"}
                    {actionType === "revision" && "Request Revision"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Target: <span className="font-semibold text-foreground">{applicant.brandName}</span>
                  </p>
                </div>
              </div>

              {/* Modal Body / Notes Input */}
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

                {actionType === "approve" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Welcome Note (Optional)
                    </label>
                    <Input 
                      placeholder="e.g., Welcome aboard! Your profile is now active."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
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
                  {isSubmitting ? "Processing..." : "Confirm Action"}
                </Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}